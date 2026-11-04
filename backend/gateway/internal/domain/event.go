package domain

import (
	"context"

	"github.com/google/uuid"
)

type AuditEventPayload struct {
	AuditID        string `json:"audit_id"`
	FileID         string `json:"file_id"`
	TemplateFileID string `json:"template_file_id,omitempty"`
	ManuscriptID   string `json:"manuscript_id"`
	S3Key          string `json:"s3_key"`
	TemplateS3Key  string `json:"template_s3_key,omitempty"`
	FileType       string `json:"file_type"`
}

type EventPublisher interface {
	PublishAuditJob(ctx context.Context, payload AuditEventPayload) error
}

type AIAuditor interface {
	AuditManuscript(ctx context.Context, auditID, manuscriptID uuid.UUID, draftKey, templateKey string) error
}

