package domain

import (
	"context"
	"time"
)

type StorageClient interface {
	GeneratePresignedPutURL(ctx context.Context, key string, contentType string, expiry time.Duration) (string, error)
	GeneratePresignedGetURL(ctx context.Context, key string, expiry time.Duration) (string, error)
	SaveFile(ctx context.Context, key string, data []byte) error
	GetFile(ctx context.Context, key string) ([]byte, error)
}

