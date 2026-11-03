package domain

import (
	"context"

	"github.com/google/uuid"
)

type UserRepository interface {
	Create(ctx context.Context, user *User) error
	GetByID(ctx context.Context, id uuid.UUID) (*User, error)
	GetByEmail(ctx context.Context, email string) (*User, error)
}

type ManuscriptRepository interface {
	Create(ctx context.Context, manuscript *Manuscript) error
	GetByID(ctx context.Context, id uuid.UUID) (*Manuscript, error)
	ListByAuthorID(ctx context.Context, authorID uuid.UUID) ([]Manuscript, error)
	ListAll(ctx context.Context) ([]Manuscript, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status ManuscriptStatus) error
}

type ManuscriptFileRepository interface {
	Create(ctx context.Context, file *ManuscriptFile) error
	GetByID(ctx context.Context, id uuid.UUID) (*ManuscriptFile, error)
	GetLatestVersion(ctx context.Context, manuscriptID uuid.UUID) (int, error)
}

type AuditRepository interface {
	Create(ctx context.Context, audit *PreSubmissionAudit) error
	GetByID(ctx context.Context, id uuid.UUID) (*PreSubmissionAudit, error)
	GetByFileID(ctx context.Context, fileID uuid.UUID) (*PreSubmissionAudit, error)
}

