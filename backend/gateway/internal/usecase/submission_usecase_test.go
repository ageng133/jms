package usecase_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jms-uts/backend/gateway/internal/domain"
	"github.com/jms-uts/backend/gateway/internal/usecase"
)

type mockStorageClient struct{}

func (m *mockStorageClient) GeneratePresignedPutURL(ctx context.Context, key string, contentType string, expiry time.Duration) (string, error) {
	return "http://localhost:9000/jms-manuscripts/" + key + "?signature=mock", nil
}

func (m *mockStorageClient) GeneratePresignedGetURL(ctx context.Context, key string, expiry time.Duration) (string, error) {
	return "http://localhost:9000/jms-manuscripts/" + key, nil
}

type mockManuscriptRepo struct{}

func (m *mockManuscriptRepo) Create(ctx context.Context, manuscript *domain.Manuscript) error {
	return nil
}
func (m *mockManuscriptRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.Manuscript, error) {
	return &domain.Manuscript{ID: id, Title: "Test Manuscript"}, nil
}
func (m *mockManuscriptRepo) ListByAuthorID(ctx context.Context, authorID uuid.UUID) ([]domain.Manuscript, error) {
	return nil, nil
}
func (m *mockManuscriptRepo) ListAll(ctx context.Context) ([]domain.Manuscript, error) {
	return nil, nil
}
func (m *mockManuscriptRepo) UpdateStatus(ctx context.Context, id uuid.UUID, status domain.ManuscriptStatus) error {
	return nil
}

func TestRequestUploadURL(t *testing.T) {
	uc := usecase.NewSubmissionUsecase(
		nil,
		&mockManuscriptRepo{},
		nil,
		nil,
		nil,
		&mockStorageClient{},
	)

	mID := uuid.New()
	res, err := uc.RequestUploadURL(context.Background(), mID, "research_paper.pdf", domain.FileTypePDF, domain.FileRoleManuscript)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if res.FileType != "PDF" {
		t.Errorf("expected FileType PDF, got %s", res.FileType)
	}

	if res.UploadURL == "" {
		t.Error("expected non-empty presigned upload URL")
	}
}

