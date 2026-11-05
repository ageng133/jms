package domain

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type Role string

const (
	RoleAuthor   Role = "AUTHOR"
	RoleEditor   Role = "EDITOR"
	RoleReviewer Role = "REVIEWER"
	RoleAdmin    Role = "ADMIN"
)

type ManuscriptStatus string

const (
	StatusDraft            ManuscriptStatus = "DRAFT"
	StatusPreCheckPending  ManuscriptStatus = "PRE_CHECK_PENDING"
	StatusPreCheckFailed   ManuscriptStatus = "PRE_CHECK_FAILED"
	StatusUnderDeskReview  ManuscriptStatus = "UNDER_DESK_REVIEW"
	StatusInPeerReview     ManuscriptStatus = "IN_PEER_REVIEW"
	StatusRevisionRequired ManuscriptStatus = "REVISION_REQUIRED"
	StatusAccepted         ManuscriptStatus = "ACCEPTED"
	StatusRejected         ManuscriptStatus = "REJECTED"
)

type FileType string

const (
	FileTypeDOCX     FileType = "DOCX"
	FileTypePDF      FileType = "PDF"
	FileTypeLatexZip FileType = "LATEX_ZIP"
)

const (
	FileRoleManuscript = "MANUSCRIPT"
	FileRoleTemplate   = "TEMPLATE"
)

type AuditStatus string

const (
	AuditStatusQueued     AuditStatus = "QUEUED"
	AuditStatusProcessing AuditStatus = "PROCESSING"
	AuditStatusCompleted  AuditStatus = "COMPLETED"
	AuditStatusFailed     AuditStatus = "FAILED"
)

type User struct {
	ID           uuid.UUID `json:"id" gorm:"type:uuid;primaryKey;default:uuid_generate_v4()"`
	Email        string    `json:"email" gorm:"type:varchar(255);unique;not null"`
	PasswordHash string    `json:"-" gorm:"type:varchar(255);not null"`
	FullName     string    `json:"full_name" gorm:"type:varchar(255);not null"`
	Affiliation  string    `json:"affiliation" gorm:"type:varchar(255)"`
	OrcidID      *string   `json:"orcid_id" gorm:"type:varchar(19)"`
	Role         Role      `json:"role" gorm:"type:user_role;default:'AUTHOR'"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type Manuscript struct {
	ID        uuid.UUID        `json:"id" gorm:"type:uuid;primaryKey;default:uuid_generate_v4()"`
	AuthorID  uuid.UUID        `json:"author_id" gorm:"type:uuid;not null"`
	Author    *User            `json:"author,omitempty" gorm:"foreignKey:AuthorID"`
	Title     string           `json:"title" gorm:"type:text;not null"`
	Abstract  string           `json:"abstract" gorm:"type:text;not null"`
	Keywords  []string         `json:"keywords" gorm:"type:jsonb;serializer:json"`
	Status    ManuscriptStatus `json:"status" gorm:"type:manuscript_status;default:'DRAFT'"`
	Files     []ManuscriptFile `json:"files,omitempty" gorm:"foreignKey:ManuscriptID"`
	CreatedAt time.Time        `json:"created_at"`
	UpdatedAt time.Time        `json:"updated_at"`
}

type ManuscriptFile struct {
	ID               uuid.UUID            `json:"id" gorm:"type:uuid;primaryKey;default:uuid_generate_v4()"`
	ManuscriptID     uuid.UUID            `json:"manuscript_id" gorm:"type:uuid;not null"`
	Version          int                  `json:"version" gorm:"not null;default:1"`
	FileType         FileType             `json:"file_type" gorm:"type:file_type;not null"`
	FileRole         string               `json:"file_role" gorm:"type:varchar(50);not null;default:'MANUSCRIPT'"`
	S3Key            string               `json:"s3_key" gorm:"type:text;not null"`
	OriginalFilename string               `json:"original_filename" gorm:"type:varchar(255);not null"`
	FileSizeBytes    int64                `json:"file_size_bytes" gorm:"not null"`
	Audits           []PreSubmissionAudit `json:"audits,omitempty" gorm:"foreignKey:ManuscriptFileID"`
	CreatedAt        time.Time            `json:"created_at"`
}

type PreSubmissionAudit struct {
	ID                 uuid.UUID       `json:"id" gorm:"type:uuid;primaryKey;default:uuid_generate_v4()"`
	ManuscriptFileID   uuid.UUID       `json:"manuscript_file_id" gorm:"type:uuid;not null"`
	TemplateFileID     *uuid.UUID      `json:"template_file_id,omitempty" gorm:"type:uuid"`
	Status             AuditStatus     `json:"status" gorm:"type:audit_status;default:'QUEUED'"`
	ScoreOverall       *int            `json:"score_overall"`
	LayoutIssues       json.RawMessage `json:"layout_issues" gorm:"type:jsonb;default:'[]'"`
	CitationIssues     json.RawMessage `json:"citation_issues" gorm:"type:jsonb;default:'{}'"`
	AnonymizationFlags json.RawMessage `json:"anonymization_flags" gorm:"type:jsonb;default:'[]'"`
	TemplateSpecs      json.RawMessage `json:"template_specs" gorm:"type:jsonb;default:'{}'"`
	Summary            json.RawMessage `json:"summary" gorm:"type:jsonb;default:'{}'"`
	Engine             *string         `json:"engine"`
	TemplatePreset     *string         `json:"template_preset"`
	AnnotatedPdfS3Key  *string         `json:"annotated_pdf_s3_key"`
	ErrorMessage       *string         `json:"error_message"`
	CreatedAt          time.Time       `json:"created_at"`
	CompletedAt        *time.Time      `json:"completed_at"`
}
