package storage

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/jms-uts/backend/gateway/config"
	"github.com/jms-uts/backend/gateway/internal/domain"
	"github.com/joho/godotenv"
)

type BoxStorage struct {
	cfg            *config.BoxConfig
	httpClient     *http.Client
	gatewayBaseURL string
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

	log.Printf("[BoxStorage] Initialized Box.com Cloud Storage Driver (Folder ID: %s, Local Cache: %s)\n",
		cfg.FolderID, dir)

	return &BoxStorage{
		cfg:            cfg,
		httpClient:     &http.Client{Timeout: 60 * time.Second},
		gatewayBaseURL: gatewayBase,
	}, nil
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
	return fmt.Sprintf("%s/api/v1/files/upload?key=%s", b.gatewayBaseURL, url.QueryEscape(key)), nil
}

func (b *BoxStorage) GeneratePresignedGetURL(ctx context.Context, key string, expiry time.Duration) (string, error) {
	return fmt.Sprintf("%s/api/v1/files/download?key=%s", b.gatewayBaseURL, url.QueryEscape(key)), nil
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
	// 1. Save to local box cache directory
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

	// Hot-reload developer token if updated in .env dynamically
	for _, envFile := range []string{".env", "../.env", "../../.env", "/Users/mac/Documents/Repositories/jms-uts/backend/.env"} {
		_ = godotenv.Overload(envFile)
	}
	freshToken := os.Getenv("BOX_DEVELOPER_TOKEN")
	if freshToken != "" {
		b.cfg.DeveloperToken = freshToken
	}
	devToken := b.cfg.DeveloperToken

	if devToken != "" {
		go func() {
			err := b.uploadToBoxCloud(key, data)
			if err != nil {
				log.Printf("[BoxStorage] Warning: Cloud upload to Box.com API failed: %v", err)
			} else {
				log.Printf("[BoxStorage] Successfully synced %s to Box.com cloud folder %s", key, b.cfg.FolderID)
			}
		}()
	}

	return nil
}

func (b *BoxStorage) GetFile(ctx context.Context, key string) ([]byte, error) {
	localPath, err := b.localPath(key)
	if err != nil {
		return nil, err
	}
	data, err := os.ReadFile(localPath)
	if err == nil {
		return data, nil
	}

	return nil, fmt.Errorf("file not found in box storage: %w", err)
}

func (b *BoxStorage) uploadToBoxCloud(key string, data []byte) error {
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)

	filename := filepath.Base(key)
	attributes := map[string]interface{}{
		"name": fmt.Sprintf("%d_%s", time.Now().Unix(), filename),
		"parent": map[string]string{
			"id": b.cfg.FolderID,
		},
	}
	attrJSON, _ := json.Marshal(attributes)
	_ = writer.WriteField("attributes", string(attrJSON))

	part, err := writer.CreateFormFile("file", filename)
	if err != nil {
		return err
	}
	if _, err := part.Write(data); err != nil {
		return err
	}
	_ = writer.Close()

	uploadURL := b.cfg.UploadURL
	if uploadURL == "" {
		uploadURL = "https://upload.box.com/api/2.0/files/content"
	}

	req, err := http.NewRequest("POST", uploadURL, &body)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+b.cfg.DeveloperToken)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	resp, err := b.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("box.com upload returned status %d: %s", resp.StatusCode, string(respBody))
	}

	return nil
}
