package storage

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"log"
	"net/url"
	"time"

	"github.com/jms-uts/backend/gateway/config"
	"github.com/jms-uts/backend/gateway/internal/domain"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

type MinIOStorage struct {
	client     *minio.Client
	bucketName string
}

func NewMinIOStorage(cfg *config.S3Config) (domain.StorageClient, error) {
	client, err := minio.New(cfg.Endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.AccessKey, cfg.SecretKey, ""),
		Secure: cfg.UseSSL,
		Region: cfg.Region,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to initialize MinIO client: %w", err)
	}

	log.Printf("[MinIO] Initialized storage client for endpoint=%s bucket=%s\n", cfg.Endpoint, cfg.BucketName)
	return &MinIOStorage{
		client:     client,
		bucketName: cfg.BucketName,
	}, nil
}

func (s *MinIOStorage) GeneratePresignedPutURL(ctx context.Context, key string, contentType string, expiry time.Duration) (string, error) {
	u, err := s.client.PresignedPutObject(ctx, s.bucketName, key, expiry)
	if err != nil {
		return "", fmt.Errorf("failed to generate presigned PUT url: %w", err)
	}
	return u.String(), nil
}

func (s *MinIOStorage) GeneratePresignedGetURL(ctx context.Context, key string, expiry time.Duration) (string, error) {
	reqParams := make(url.Values)
	u, err := s.client.PresignedGetObject(ctx, s.bucketName, key, expiry, reqParams)
	if err != nil {
		return "", fmt.Errorf("failed to generate presigned GET url: %w", err)
	}
	return u.String(), nil
}

func (s *MinIOStorage) SaveFile(ctx context.Context, key string, data []byte) error {
	reader := bytes.NewReader(data)
	_, err := s.client.PutObject(ctx, s.bucketName, key, reader, int64(len(data)), minio.PutObjectOptions{})
	return err
}

func (s *MinIOStorage) GetFile(ctx context.Context, key string) ([]byte, error) {
	obj, err := s.client.GetObject(ctx, s.bucketName, key, minio.GetObjectOptions{})
	if err != nil {
		return nil, err
	}
	defer obj.Close()
	return io.ReadAll(obj)
}

