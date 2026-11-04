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
	"time"

	"github.com/jms-uts/backend/gateway/config"
	"github.com/jms-uts/backend/gateway/internal/domain"
)

type BoxStorage struct {
	cfg            *config.BoxConfig
	httpClient     *http.Client
	gatewayBaseURL string
}

func NewBoxStorage(cfg *config.BoxConfig, appPort string) (domain.StorageClient, error) {
	// Ensure local fallback storage directory exists
	dir := cfg.LocalFallbackDir
	if dir == "" {
		dir = "./storage/box"
	}
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create box storage directory: %w", err)
	}

	gatewayBase := fmt.Sprintf("http://localhost:%s", appPort)

	log.Printf("[BoxStorage] Initialized Box.com Cloud Storage Driver (Folder ID: %s, Local Cache: %s)\n",
		cfg.FolderID, dir)

	return &BoxStorage{
		cfg:            cfg,
		httpClient:     &http.Client{Timeout: 60 * time.Second},
		gatewayBaseURL: gatewayBase,
	}, nil
}

func (b *BoxStorage) GeneratePresignedPutURL(ctx context.Context, key string, contentType string, expiry time.Duration) (string, error) {
	// Direct upload route routed through Gateway Box Handler which streams directly to Box.com
	return fmt.Sprintf("%s/api/v1/files/upload?key=%s", b.gatewayBaseURL, url.QueryEscape(key)), nil
}

func (b *BoxStorage) GeneratePresignedGetURL(ctx context.Context, key string, expiry time.Duration) (string, error) {
	return fmt.Sprintf("%s/api/v1/files/download?key=%s", b.gatewayBaseURL, url.QueryEscape(key)), nil
}

func (b *BoxStorage) SaveFile(ctx context.Context, key string, data []byte) error {
	// 1. Save to local box cache directory
	localPath := filepath.Join(b.cfg.LocalFallbackDir, key)
	if err := os.MkdirAll(filepath.Dir(localPath), 0755); err != nil {
		return fmt.Errorf("failed to create directory for local box file: %w", err)
	}

	if err := os.WriteFile(localPath, data, 0644); err != nil {
		return fmt.Errorf("failed to write local box file: %w", err)
	}
	log.Printf("[BoxStorage] Saved file locally to %s (%d bytes)", localPath, len(data))

	// 2. Stream to Box.com Cloud Storage if DeveloperToken or Client credentials provided
	if b.cfg.DeveloperToken != "" {
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
	localPath := filepath.Join(b.cfg.LocalFallbackDir, key)
	data, err := os.ReadFile(localPath)
	if err == nil {
		return data, nil
	}

	// If not in local cache, could download from Box.com
	return nil, fmt.Errorf("file not found in box storage: %w", err)
}

func (b *BoxStorage) uploadToBoxCloud(key string, data []byte) error {
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)

	// Box API attributes part
	filename := filepath.Base(key)
	attributes := map[string]interface{}{
		"name": fmt.Sprintf("%d_%s", time.Now().Unix(), filename),
		"parent": map[string]string{
			"id": b.cfg.FolderID,
		},
	}
	attrJSON, _ := json.Marshal(attributes)
	_ = writer.WriteField("attributes", string(attrJSON))

	// File data part
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

