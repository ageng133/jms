package domain

import (
	"context"
	"fmt"
	"path"
	"strings"
	"time"
)

type StorageClient interface {
	GeneratePresignedPutURL(ctx context.Context, key string, contentType string, expiry time.Duration) (string, error)
	GeneratePresignedGetURL(ctx context.Context, key string, expiry time.Duration) (string, error)
	SaveFile(ctx context.Context, key string, data []byte) error
	GetFile(ctx context.Context, key string) ([]byte, error)
}

// Storage key prefixes. Uploaded files live under raw/{manuscript_id}/...,
// annotated audit outputs under audits/annotated_{audit_id}.pdf.
const (
	StoragePrefixRaw    = "raw"
	StoragePrefixAudits = "audits"
)

// ValidateStorageKey rejects keys that could escape the storage root
// (path traversal, absolute paths, Windows separators/drive letters).
func ValidateStorageKey(key string) error {
	if key == "" {
		return fmt.Errorf("%w: empty storage key", ErrInvalidInput)
	}
	if len(key) > 512 {
		return fmt.Errorf("%w: storage key too long", ErrInvalidInput)
	}
	if strings.ContainsAny(key, "\\:\x00") {
		return fmt.Errorf("%w: storage key contains illegal characters", ErrInvalidInput)
	}
	if strings.HasPrefix(key, "/") || path.Clean(key) != key {
		return fmt.Errorf("%w: storage key must be a clean relative path", ErrInvalidInput)
	}
	for _, seg := range strings.Split(key, "/") {
		if seg == ".." || seg == "." || seg == "" {
			return fmt.Errorf("%w: storage key contains illegal path segment", ErrInvalidInput)
		}
	}
	return nil
}
