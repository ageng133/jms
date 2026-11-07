package storage

import (
	"bytes"
	"context"
	"crypto/rsa"
	"crypto/x509"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jms-uts/backend/gateway/config"
	"github.com/jms-uts/backend/gateway/internal/domain"
	"github.com/joho/godotenv"
)

type boxConfigJSON struct {
	BoxAppSettings struct {
		ClientID     string `json:"clientID"`
		ClientSecret string `json:"clientSecret"`
		AppAuth      struct {
			PublicKeyID string `json:"publicKeyID"`
			PrivateKey  string `json:"privateKey"`
			Passphrase  string `json:"passphrase"`
		} `json:"appAuth"`
	} `json:"boxAppSettings"`
	EnterpriseID string `json:"enterpriseID"`
}

type BoxStorage struct {
	cfg            *config.BoxConfig
	httpClient     *http.Client
	gatewayBaseURL string

	tokenMu      sync.RWMutex
	cachedToken  string
	tokenExpires time.Time

	indexMu  sync.RWMutex
	boxIndex map[string]string // key -> Box File ID
}

// NewBoxStorage creates the Box driver. publicBaseURL is the externally
// reachable gateway origin (e.g. http://localhost:8080) used in upload URLs.
func NewBoxStorage(cfg *config.BoxConfig, publicBaseURL string) (domain.StorageClient, error) {
	// Ensure local fallback storage directory exists
	dir := cfg.LocalFallbackDir
	if dir == "" {
		dir = "./storage/box"
	}
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create box storage directory: %w", err)
	}

	if cfg.LocalFallbackDir == "" {
		cfg.LocalFallbackDir = dir
	}
	gatewayBase := strings.TrimRight(publicBaseURL, "/")

	boxIdx := make(map[string]string)
	indexPath := filepath.Join(dir, ".box_index.json")
	if raw, err := os.ReadFile(indexPath); err == nil {
		_ = json.Unmarshal(raw, &boxIdx)
	}

	log.Printf("[BoxStorage] Initialized Box.com Cloud Storage Driver (Folder ID: %s, Local Cache: %s, Mapped Files: %d)\n",
		cfg.FolderID, dir, len(boxIdx))

	return &BoxStorage{
		cfg:            cfg,
		httpClient:     &http.Client{Timeout: 60 * time.Second},
		gatewayBaseURL: gatewayBase,
		boxIndex:       boxIdx,
	}, nil
}

func (b *BoxStorage) saveIndexToFile() {
	indexPath := filepath.Join(b.cfg.LocalFallbackDir, ".box_index.json")
	if data, err := json.MarshalIndent(b.boxIndex, "", "  "); err == nil {
		_ = os.WriteFile(indexPath, data, 0644)
	}
}

func (b *BoxStorage) resolveSafePath(key string) (string, error) {
	cleanKey := filepath.Clean(key)
	if strings.HasPrefix(cleanKey, "..") || strings.Contains(cleanKey, "/../") || filepath.IsAbs(cleanKey) {
		return "", fmt.Errorf("security violation: path traversal detected in key '%s'", key)
	}

	absBase, err := filepath.Abs(b.cfg.LocalFallbackDir)
	if err != nil {
		return "", fmt.Errorf("failed to resolve storage base directory: %w", err)
	}

	targetPath := filepath.Join(absBase, cleanKey)
	absTarget, err := filepath.Abs(targetPath)
	if err != nil {
		return "", fmt.Errorf("failed to resolve target path: %w", err)
	}

	rel, err := filepath.Rel(absBase, absTarget)
	if err != nil || strings.HasPrefix(rel, "..") {
		return "", fmt.Errorf("security violation: path traversal attempted beyond storage root")
	}

	return absTarget, nil
}

func (b *BoxStorage) GeneratePresignedPutURL(ctx context.Context, key string, contentType string, expiry time.Duration) (string, error) {
	baseURL := strings.TrimRight(b.gatewayBaseURL, "/")
	if baseURL == "" || strings.Contains(baseURL, "localhost") || strings.Contains(baseURL, "127.0.0.1") {
		return fmt.Sprintf("/api/v1/files/upload?key=%s", url.QueryEscape(key)), nil
	}
	return fmt.Sprintf("%s/api/v1/files/upload?key=%s", baseURL, url.QueryEscape(key)), nil
}

func (b *BoxStorage) GeneratePresignedGetURL(ctx context.Context, key string, expiry time.Duration) (string, error) {
	baseURL := strings.TrimRight(b.gatewayBaseURL, "/")
	if baseURL == "" || strings.Contains(baseURL, "localhost") || strings.Contains(baseURL, "127.0.0.1") {
		return fmt.Sprintf("/api/v1/files/download?key=%s", url.QueryEscape(key)), nil
	}
	return fmt.Sprintf("%s/api/v1/files/download?key=%s", baseURL, url.QueryEscape(key)), nil
}

// localPath resolves key inside the storage root and refuses anything that
// would escape it (defence in depth on top of domain.ValidateStorageKey).
func (b *BoxStorage) localPath(key string) (string, error) {
	if err := domain.ValidateStorageKey(key); err != nil {
		return "", err
	}
	root, err := filepath.Abs(b.cfg.LocalFallbackDir)
	if err != nil {
		return "", err
	}
	full := filepath.Join(root, filepath.FromSlash(key))
	rel, err := filepath.Rel(root, full)
	if err != nil || rel == ".." || strings.HasPrefix(rel, ".."+string(filepath.Separator)) {
		return "", fmt.Errorf("%w: storage key escapes storage root", domain.ErrInvalidInput)
	}
	return full, nil
}

func (b *BoxStorage) SaveFile(ctx context.Context, key string, data []byte) error {
	// 1. Save to local box cache directory (always resilient)
	localPath, err := b.localPath(key)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(localPath), 0755); err != nil {
		return fmt.Errorf("failed to create directory for local box file: %w", err)
	}

	if err := os.WriteFile(localPath, data, 0644); err != nil {
		return fmt.Errorf("failed to write local box file: %w", err)
	}
	log.Printf("[BoxStorage] Saved file locally to %s (%d bytes)", localPath, len(data))

	// 2. Synchronously sync to Box.com Cloud via Enterprise JWT and index Box File ID
	if fileID, err := b.uploadToBoxCloud(key, data); err != nil {
		log.Printf("[BoxStorage] Warning: Cloud upload to Box.com API failed: %v", err)
	} else if fileID != "" {
		b.indexMu.Lock()
		b.boxIndex[key] = fileID
		b.saveIndexToFile()
		b.indexMu.Unlock()
	}

	return nil
}

func (b *BoxStorage) GetFile(ctx context.Context, key string) ([]byte, error) {
	// 1. AI Engine reading directly from Box Cloud Storage when prompted
	fileID, _ := b.lookupBoxFileID(ctx, key)
	if fileID != "" {
		cloudData, err := b.downloadFromBoxCloud(ctx, fileID)
		if err == nil && len(cloudData) > 0 {
			log.Printf("[BoxStorage] 📥 AI Engine reading file directly from Box.com Cloud Storage (Key: %s, Box File ID: %s, %d bytes)", key, fileID, len(cloudData))
			// Keep local cache in sync
			if localPath, lerr := b.localPath(key); lerr == nil {
				_ = os.WriteFile(localPath, cloudData, 0644)
			}
			return cloudData, nil
		}
		if err != nil {
			log.Printf("[BoxStorage] ℹ️ Box Cloud fetch for %s (ID %s) error: %v. Falling back to local cache.", key, fileID, err)
		}
	}

	// 2. Resilient fallback to local Box cache
	localPath, err := b.localPath(key)
	if err != nil {
		return nil, err
	}
	data, err := os.ReadFile(localPath)
	if err == nil {
		log.Printf("[BoxStorage] 📂 AI Engine reading file from local Box storage fallback (Key: %s, %d bytes)", key, len(data))
		return data, nil
	}

	return nil, fmt.Errorf("file not found in box storage: %w", err)
}

func (b *BoxStorage) lookupBoxFileID(ctx context.Context, key string) (string, error) {
	b.indexMu.RLock()
	fileID := b.boxIndex[key]
	b.indexMu.RUnlock()
	if fileID != "" {
		return fileID, nil
	}

	token, err := b.getValidAccessToken()
	if err != nil {
		return "", err
	}

	folderID := b.cfg.FolderID
	if folderID == "" {
		folderID = "0"
	}

	listURL := fmt.Sprintf("%s/folders/%s/items?limit=100&fields=id,name", b.cfg.BaseURL, folderID)
	req, err := http.NewRequestWithContext(ctx, "GET", listURL, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := b.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK {
		var folderResp struct {
			Entries []struct {
				ID   string `json:"id"`
				Name string `json:"name"`
			} `json:"entries"`
		}
		if json.NewDecoder(resp.Body).Decode(&folderResp) == nil {
			base := filepath.Base(key)
			for _, ent := range folderResp.Entries {
				if ent.Name == base || strings.HasSuffix(ent.Name, "_"+base) {
					b.indexMu.Lock()
					b.boxIndex[key] = ent.ID
					b.saveIndexToFile()
					b.indexMu.Unlock()
					return ent.ID, nil
				}
			}
		}
	}

	return "", fmt.Errorf("box file ID not found for key %s", key)
}

func (b *BoxStorage) downloadFromBoxCloud(ctx context.Context, fileID string) ([]byte, error) {
	token, err := b.getValidAccessToken()
	if err != nil {
		return nil, fmt.Errorf("unable to authenticate with Box Cloud: %w", err)
	}

	downloadURL := fmt.Sprintf("%s/files/%s/content", b.cfg.BaseURL, fileID)
	req, err := http.NewRequestWithContext(ctx, "GET", downloadURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := b.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("box download request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("box download returned status %d: %s", resp.StatusCode, string(respBody))
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed reading box download content: %w", err)
	}

	return data, nil
}

// findBoxConfigFile searches for any Box JWT config.json in standard directories
func findBoxConfigFile() string {
	candidates := []string{
		"box_config.json",
		"../box_config.json",
		"../../box_config.json",
		"/Users/mac/Documents/Repositories/jms-uts/backend/box_config.json",
		"/Users/mac/Documents/Repositories/jms-uts/backend/1568960837_7idv1n8k_config.json",
	}

	for _, c := range candidates {
		if _, err := os.Stat(c); err == nil {
			return c
		}
	}

	// Glob pattern search
	patterns := []string{
		"../*config.json",
		"../../backend/*config.json",
		"/Users/mac/Documents/Repositories/jms-uts/backend/*config.json",
	}
	for _, p := range patterns {
		matches, err := filepath.Glob(p)
		if err == nil && len(matches) > 0 {
			return matches[0]
		}
	}

	return ""
}

func parseEncryptedPKCS8(pemStr, passphrase string) (*rsa.PrivateKey, error) {
	cmd := exec.Command("openssl", "pkcs8", "-passin", "pass:"+passphrase)
	cmd.Stdin = strings.NewReader(pemStr)
	out, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("openssl decrypt failed: %w", err)
	}

	block, _ := pem.Decode(out)
	if block == nil {
		return nil, fmt.Errorf("failed to decode decrypted PEM")
	}

	keyInterface, err := x509.ParsePKCS8PrivateKey(block.Bytes)
	if err != nil {
		if pkcs1, err1 := x509.ParsePKCS1PrivateKey(block.Bytes); err1 == nil {
			return pkcs1, nil
		}
		return nil, err
	}

	rsaKey, ok := keyInterface.(*rsa.PrivateKey)
	if !ok {
		return nil, fmt.Errorf("key is not RSA")
	}
	return rsaKey, nil
}

func (b *BoxStorage) getValidAccessToken() (string, error) {
	b.tokenMu.RLock()
	if b.cachedToken != "" && time.Now().Before(b.tokenExpires) {
		token := b.cachedToken
		b.tokenMu.RUnlock()
		return token, nil
	}
	b.tokenMu.RUnlock()

	b.tokenMu.Lock()
	defer b.tokenMu.Unlock()

	// Double check after lock
	if b.cachedToken != "" && time.Now().Before(b.tokenExpires) {
		return b.cachedToken, nil
	}

	// 1. Try Box JWT config.json (Preferred permanent authentication)
	cfgFile := findBoxConfigFile()
	if cfgFile != "" {
		data, err := os.ReadFile(cfgFile)
		if err == nil {
			var jwtCfg boxConfigJSON
			if err := json.Unmarshal(data, &jwtCfg); err == nil && jwtCfg.BoxAppSettings.ClientID != "" {
				rsaKey, err := parseEncryptedPKCS8(jwtCfg.BoxAppSettings.AppAuth.PrivateKey, jwtCfg.BoxAppSettings.AppAuth.Passphrase)
				if err == nil {
					now := time.Now()
					claims := jwt.MapClaims{
						"iss":          jwtCfg.BoxAppSettings.ClientID,
						"sub":          jwtCfg.EnterpriseID,
						"box_sub_type": "enterprise",
						"aud":          "https://api.box.com/oauth2/token",
						"jti":          uuid.New().String(),
						"exp":          now.Add(45 * time.Second).Unix(),
					}

					tokenObj := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
					tokenObj.Header["kid"] = jwtCfg.BoxAppSettings.AppAuth.PublicKeyID

					assertion, err := tokenObj.SignedString(rsaKey)
					if err == nil {
						form := url.Values{}
						form.Set("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer")
						form.Set("client_id", jwtCfg.BoxAppSettings.ClientID)
						form.Set("client_secret", jwtCfg.BoxAppSettings.ClientSecret)
						form.Set("assertion", assertion)

						resp, err := b.httpClient.Post("https://api.box.com/oauth2/token", "application/x-www-form-urlencoded", strings.NewReader(form.Encode()))
						if err == nil {
							defer resp.Body.Close()
							respBytes, _ := io.ReadAll(resp.Body)
							if resp.StatusCode == 200 {
								var tokenResp struct {
									AccessToken string `json:"access_token"`
									ExpiresIn   int    `json:"expires_in"`
								}
								if err := json.Unmarshal(respBytes, &tokenResp); err == nil && tokenResp.AccessToken != "" {
									b.cachedToken = tokenResp.AccessToken
									expiresSec := tokenResp.ExpiresIn
									if expiresSec <= 0 {
										expiresSec = 3600
									}
									// Expire 2 minutes early for safety
									b.tokenExpires = time.Now().Add(time.Duration(expiresSec-120) * time.Second)
									log.Printf("[BoxStorage] Successfully generated Box OAuth Bearer Token via JWT (valid for %ds)", expiresSec)
									return b.cachedToken, nil
								}
							} else {
								log.Printf("[BoxStorage] Box JWT token exchange returned HTTP %d: %s", resp.StatusCode, string(respBytes))
							}
						}
					}
				} else {
					log.Printf("[BoxStorage] Failed to decrypt Box JWT private key: %v", err)
				}
			}
		}
	}

	// 2. Fallback to BOX_DEVELOPER_TOKEN in environment
	for _, envFile := range []string{".env", "../.env", "../../.env", "/Users/mac/Documents/Repositories/jms-uts/backend/.env"} {
		_ = godotenv.Overload(envFile)
	}
	devToken := os.Getenv("BOX_DEVELOPER_TOKEN")
	if devToken != "" {
		return devToken, nil
	}

	return "", fmt.Errorf("no valid Box JWT config.json or BOX_DEVELOPER_TOKEN found")
}

func (b *BoxStorage) uploadToBoxCloud(key string, data []byte) (string, error) {
	token, err := b.getValidAccessToken()
	if err != nil {
		return "", fmt.Errorf("unable to authenticate with Box Cloud: %w", err)
	}

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)

	filename := filepath.Base(key)
	folderID := b.cfg.FolderID
	if folderID == "" {
		folderID = "0"
	}

	attributes := map[string]interface{}{
		"name": fmt.Sprintf("%d_%s", time.Now().Unix(), filename),
		"parent": map[string]string{
			"id": folderID,
		},
	}
	attrJSON, _ := json.Marshal(attributes)
	_ = writer.WriteField("attributes", string(attrJSON))

	part, err := writer.CreateFormFile("file", filename)
	if err != nil {
		return "", err
	}
	if _, err := part.Write(data); err != nil {
		return "", err
	}
	_ = writer.Close()

	uploadURL := b.cfg.UploadURL
	if uploadURL == "" {
		uploadURL = "https://upload.box.com/api/2.0/files/content"
	}

	req, err := http.NewRequest("POST", uploadURL, &body)
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	resp, err := b.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 300 {
		return "", fmt.Errorf("box.com upload returned status %d: %s", resp.StatusCode, string(respBody))
	}

	var boxResp struct {
		Entries []struct {
			ID   string `json:"id"`
			Name string `json:"name"`
		} `json:"entries"`
	}
	_ = json.Unmarshal(respBody, &boxResp)
	boxFileID := ""
	if len(boxResp.Entries) > 0 {
		boxFileID = boxResp.Entries[0].ID
	}

	log.Printf("[BoxStorage] 🎉 Successfully synced %s to Box.com cloud folder %s (Box File ID: %s)", key, folderID, boxFileID)
	return boxFileID, nil
}
