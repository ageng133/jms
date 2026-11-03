package usecase

import (
	"context"
	"fmt"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jms-uts/backend/gateway/internal/domain"
	"gorm.io/gorm"
)

type SubmissionUsecase interface {
	CreateDraftManuscript(ctx context.Context, authorID uuid.UUID, title, abstract string, keywords []string) (*domain.Manuscript, error)
	GetManuscript(ctx context.Context, id uuid.UUID) (*domain.Manuscript, error)
	ListManuscriptsByAuthor(ctx context.Context, authorID uuid.UUID) ([]domain.Manuscript, error)
	ListAllManuscripts(ctx context.Context) ([]domain.Manuscript, error)

	// Ingestion 3-step pipeline
	RequestUploadURL(ctx context.Context, manuscriptID uuid.UUID, filename string, fileType domain.FileType, fileRole string) (*PresignedUploadResult, error)
	ConfirmSubmission(ctx context.Context, req ConfirmSubmissionDTO) (*ConfirmSubmissionResult, error)
	GetAuditReport(ctx context.Context, auditID uuid.UUID) (*domain.PreSubmissionAudit, error)

	// Editorial triage decisions
	UpdateManuscriptStatus(ctx context.Context, id uuid.UUID, status domain.ManuscriptStatus) error
}

type PresignedUploadResult struct {
	S3Key        string `json:"s3_key"`
	UploadURL    string `json:"upload_url"`
	FileType     string `json:"file_type"`
	FileRole     string `json:"file_role"`
	ExpiresInSec int    `json:"expires_in_sec"`
}

type FileUploadMetaDTO struct {
	FileType         domain.FileType `json:"file_type"`
	S3Key            string          `json:"s3_key"`
	OriginalFilename string          `json:"original_filename"`
	FileSizeBytes    int64           `json:"file_size_bytes"`
	FileRole         string          `json:"file_role"`
}

type ConfirmSubmissionDTO struct {
	ManuscriptID     uuid.UUID          `json:"manuscript_id" binding:"required"`
	FileType         domain.FileType    `json:"file_type"`
	S3Key            string             `json:"s3_key"`
	OriginalFilename string             `json:"original_filename"`
	FileSizeBytes    int64              `json:"file_size_bytes"`
	DraftFile        *FileUploadMetaDTO `json:"draft_file,omitempty"`
	TemplateFile     *FileUploadMetaDTO `json:"template_file,omitempty"`
}

type ConfirmSubmissionResult struct {
	AuditID        uuid.UUID               `json:"audit_id"`
	FileID         uuid.UUID               `json:"file_id"`
	TemplateFileID *uuid.UUID              `json:"template_file_id,omitempty"`
	ManuscriptID   uuid.UUID               `json:"manuscript_id"`
	Status         domain.ManuscriptStatus `json:"status"`
	AuditStatus    domain.AuditStatus      `json:"audit_status"`
	QueuedAt       time.Time               `json:"queued_at"`
}

type submissionUsecase struct {
	db             *gorm.DB
	manuscriptRepo domain.ManuscriptRepository
	fileRepo       domain.ManuscriptFileRepository
	auditRepo      domain.AuditRepository
	eventPublisher domain.EventPublisher
	storageClient  domain.StorageClient
}

func NewSubmissionUsecase(
	db *gorm.DB,
	manuscriptRepo domain.ManuscriptRepository,
	fileRepo domain.ManuscriptFileRepository,
	auditRepo domain.AuditRepository,
	eventPublisher domain.EventPublisher,
	storageClient domain.StorageClient,
) SubmissionUsecase {
	return &submissionUsecase{
		db:             db,
		manuscriptRepo: manuscriptRepo,
		fileRepo:       fileRepo,
		auditRepo:      auditRepo,
		eventPublisher: eventPublisher,
		storageClient:  storageClient,
	}
}

func (u *submissionUsecase) CreateDraftManuscript(ctx context.Context, authorID uuid.UUID, title, abstract string, keywords []string) (*domain.Manuscript, error) {
	m := &domain.Manuscript{
		ID:        uuid.New(),
		AuthorID:  authorID,
		Title:     title,
		Abstract:  abstract,
		Keywords:  keywords,
		Status:    domain.StatusDraft,
		CreatedAt: time.Now().UTC(),
		UpdatedAt: time.Now().UTC(),
	}
	if err := u.manuscriptRepo.Create(ctx, m); err != nil {
		return nil, fmt.Errorf("failed to create manuscript: %w", err)
	}
	return m, nil
}

func (u *submissionUsecase) GetManuscript(ctx context.Context, id uuid.UUID) (*domain.Manuscript, error) {
	return u.manuscriptRepo.GetByID(ctx, id)
}

func (u *submissionUsecase) ListManuscriptsByAuthor(ctx context.Context, authorID uuid.UUID) ([]domain.Manuscript, error) {
	return u.manuscriptRepo.ListByAuthorID(ctx, authorID)
}

func (u *submissionUsecase) ListAllManuscripts(ctx context.Context) ([]domain.Manuscript, error) {
	return u.manuscriptRepo.ListAll(ctx)
}

// Step 1: Request presigned S3 upload URL
func (u *submissionUsecase) RequestUploadURL(ctx context.Context, manuscriptID uuid.UUID, filename string, fileType domain.FileType, fileRole string) (*PresignedUploadResult, error) {
	// Verify manuscript exists
	if _, err := u.manuscriptRepo.GetByID(ctx, manuscriptID); err != nil {
		return nil, fmt.Errorf("manuscript not found: %w", err)
	}

	cleanRole := strings.ToUpper(strings.TrimSpace(fileRole))
	if cleanRole == "" {
		cleanRole = domain.FileRoleManuscript
	}

	cleanExt := filepath.Ext(filename)
	prefix := "draft"
	if cleanRole == domain.FileRoleTemplate {
		prefix = "template"
	}
	s3Key := fmt.Sprintf("raw/%s/%s_%s%s", manuscriptID.String(), prefix, uuid.New().String(), cleanExt)

	contentType := "application/pdf"
	if strings.EqualFold(string(fileType), "DOCX") {
		contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
	} else if strings.EqualFold(string(fileType), "LATEX_ZIP") {
		contentType = "application/zip"
	}

	expiry := 15 * time.Minute
	uploadURL, err := u.storageClient.GeneratePresignedPutURL(ctx, s3Key, contentType, expiry)
	if err != nil {
		return nil, fmt.Errorf("failed to generate presigned upload URL: %w", err)
	}

	return &PresignedUploadResult{
		S3Key:        s3Key,
		UploadURL:    uploadURL,
		FileType:     string(fileType),
		FileRole:     cleanRole,
		ExpiresInSec: int(expiry.Seconds()),
	}, nil
}

// Step 2 & 3: Confirm file metadata in DB and push event to Redis queue:ai_audit
func (u *submissionUsecase) ConfirmSubmission(ctx context.Context, req ConfirmSubmissionDTO) (*ConfirmSubmissionResult, error) {
	draftFileID := uuid.New()
	var templateFileIDPtr *uuid.UUID
	var templateS3Key string
	auditID := uuid.New()
	now := time.Now().UTC()

	// Resolve draft file metadata
	draftS3Key := req.S3Key
	draftFilename := req.OriginalFilename
	draftSizeBytes := req.FileSizeBytes
	draftFileType := req.FileType

	if req.DraftFile != nil && req.DraftFile.S3Key != "" {
		draftS3Key = req.DraftFile.S3Key
		draftFilename = req.DraftFile.OriginalFilename
		draftSizeBytes = req.DraftFile.FileSizeBytes
		draftFileType = req.DraftFile.FileType
	}

	if draftS3Key == "" {
		return nil, fmt.Errorf("draft manuscript file is required")
	}

	err := u.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Calculate next version
		var latestVersion int
		tx.Table("manuscript_files").
			Where("manuscript_id = ?", req.ManuscriptID).
			Select("COALESCE(MAX(version), 0)").
			Scan(&latestVersion)
		nextVersion := latestVersion + 1

		// 1. Insert draft manuscript_file
		draftFile := domain.ManuscriptFile{
			ID:               draftFileID,
			ManuscriptID:     req.ManuscriptID,
			Version:          nextVersion,
			FileType:         draftFileType,
			FileRole:         domain.FileRoleManuscript,
			S3Key:            draftS3Key,
			OriginalFilename: draftFilename,
			FileSizeBytes:    draftSizeBytes,
			CreatedAt:        now,
		}
		if err := tx.Create(&draftFile).Error; err != nil {
			return fmt.Errorf("failed to save manuscript draft file: %w", err)
		}

		// 2. Insert template manuscript_file if provided
		if req.TemplateFile != nil && req.TemplateFile.S3Key != "" {
			tID := uuid.New()
			templateFileIDPtr = &tID
			templateS3Key = req.TemplateFile.S3Key
			templateFile := domain.ManuscriptFile{
				ID:               tID,
				ManuscriptID:     req.ManuscriptID,
				Version:          nextVersion,
				FileType:         req.TemplateFile.FileType,
				FileRole:         domain.FileRoleTemplate,
				S3Key:            req.TemplateFile.S3Key,
				OriginalFilename: req.TemplateFile.OriginalFilename,
				FileSizeBytes:    req.TemplateFile.FileSizeBytes,
				CreatedAt:        now,
			}
			if err := tx.Create(&templateFile).Error; err != nil {
				return fmt.Errorf("failed to save template file: %w", err)
			}
		}

		// 3. Insert pre_submission_audits (QUEUED)
		audit := domain.PreSubmissionAudit{
			ID:               auditID,
			ManuscriptFileID: draftFileID,
			TemplateFileID:   templateFileIDPtr,
			Status:           domain.AuditStatusQueued,
			CreatedAt:        now,
		}
		if err := tx.Create(&audit).Error; err != nil {
			return fmt.Errorf("failed to create audit record: %w", err)
		}

		// 4. Update manuscript status to PRE_CHECK_PENDING
		if err := tx.Model(&domain.Manuscript{}).
			Where("id = ?", req.ManuscriptID).
			Updates(map[string]interface{}{
				"status":     domain.StatusPreCheckPending,
				"updated_at": now,
			}).Error; err != nil {
			return fmt.Errorf("failed to update manuscript status: %w", err)
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	// 5. Push event to Redis queue:ai_audit
	var templateFileIDStr string
	if templateFileIDPtr != nil {
		templateFileIDStr = templateFileIDPtr.String()
	}

	eventPayload := domain.AuditEventPayload{
		AuditID:        auditID.String(),
		FileID:         draftFileID.String(),
		TemplateFileID: templateFileIDStr,
		ManuscriptID:   req.ManuscriptID.String(),
		S3Key:          draftS3Key,
		TemplateS3Key:  templateS3Key,
		FileType:       string(draftFileType),
	}

	if err := u.eventPublisher.PublishAuditJob(ctx, eventPayload); err != nil {
		// Log error but the DB state is preserved for retries
		return nil, fmt.Errorf("persisted metadata but failed to publish event: %w", err)
	}

	return &ConfirmSubmissionResult{
		AuditID:        auditID,
		FileID:         draftFileID,
		TemplateFileID: templateFileIDPtr,
		ManuscriptID:   req.ManuscriptID,
		Status:         domain.StatusPreCheckPending,
		AuditStatus:    domain.AuditStatusQueued,
		QueuedAt:       now,
	}, nil
}

func (u *submissionUsecase) GetAuditReport(ctx context.Context, auditID uuid.UUID) (*domain.PreSubmissionAudit, error) {
	return u.auditRepo.GetByID(ctx, auditID)
}

func (u *submissionUsecase) UpdateManuscriptStatus(ctx context.Context, id uuid.UUID, status domain.ManuscriptStatus) error {
	return u.manuscriptRepo.UpdateStatus(ctx, id, status)
}

