package usecase

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jms-uts/backend/gateway/internal/domain"
	"gorm.io/gorm"
)

type SubmissionUsecase interface {
	CreateDraftManuscript(ctx context.Context, authorID uuid.UUID, title, abstract string, keywords []string) (*domain.Manuscript, error)
	GetManuscript(ctx context.Context, actor Actor, id uuid.UUID) (*domain.Manuscript, error)
	ListManuscriptsByAuthor(ctx context.Context, authorID uuid.UUID) ([]domain.Manuscript, error)
	ListAllManuscripts(ctx context.Context) ([]domain.Manuscript, error)

	// Ingestion 3-step pipeline (owner only)
	RequestUploadURL(ctx context.Context, actor Actor, manuscriptID uuid.UUID, filename string, fileType domain.FileType, fileRole string) (*PresignedUploadResult, error)
	ConfirmSubmission(ctx context.Context, actor Actor, req ConfirmSubmissionDTO) (*ConfirmSubmissionResult, error)
	// GetAuditReport accepts an audit ID or a manuscript ID (resolves its latest audit).
	GetAuditReport(ctx context.Context, actor Actor, id uuid.UUID) (*domain.PreSubmissionAudit, error)
	// GetManuscriptFile is internal: callers must have authorized access first.
	GetManuscriptFile(ctx context.Context, id uuid.UUID) (*domain.ManuscriptFile, error)

	// Storage object access check for the direct upload/download endpoints
	AuthorizeFileAccess(ctx context.Context, actor Actor, key string, write bool) error

	// Editorial triage decisions (role is enforced by the router)
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
	// TemplatePreset selects a built-in layout (see domain.TemplatePresets)
	// when no template PDF is uploaded. Defaults to IEEE.
	TemplatePreset string `json:"template_preset,omitempty"`
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
	aiAuditor      domain.AIAuditor
}

func NewSubmissionUsecase(
	db *gorm.DB,
	manuscriptRepo domain.ManuscriptRepository,
	fileRepo domain.ManuscriptFileRepository,
	auditRepo domain.AuditRepository,
	eventPublisher domain.EventPublisher,
	storageClient domain.StorageClient,
	aiAuditor domain.AIAuditor,
) SubmissionUsecase {
	return &submissionUsecase{
		db:             db,
		manuscriptRepo: manuscriptRepo,
		fileRepo:       fileRepo,
		auditRepo:      auditRepo,
		eventPublisher: eventPublisher,
		storageClient:  storageClient,
		aiAuditor:      aiAuditor,
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

func (u *submissionUsecase) GetManuscript(ctx context.Context, actor Actor, id uuid.UUID) (*domain.Manuscript, error) {
	return u.loadManuscriptFor(ctx, actor, id, false)
}

func (u *submissionUsecase) ListManuscriptsByAuthor(ctx context.Context, authorID uuid.UUID) ([]domain.Manuscript, error) {
	return u.manuscriptRepo.ListByAuthorID(ctx, authorID)
}

func (u *submissionUsecase) ListAllManuscripts(ctx context.Context) ([]domain.Manuscript, error) {
	return u.manuscriptRepo.ListAll(ctx)
}

// Step 1: Request presigned S3 upload URL
func (u *submissionUsecase) RequestUploadURL(ctx context.Context, actor Actor, manuscriptID uuid.UUID, filename string, fileType domain.FileType, fileRole string) (*PresignedUploadResult, error) {
	// Only the manuscript's own author may upload files to it.
	if _, err := u.loadManuscriptFor(ctx, actor, manuscriptID, true); err != nil {
		return nil, err
	}

	cleanRole := strings.ToUpper(strings.TrimSpace(fileRole))
	if cleanRole == "" {
		cleanRole = domain.FileRoleManuscript
	}
	if cleanRole != domain.FileRoleManuscript && cleanRole != domain.FileRoleTemplate {
		return nil, fmt.Errorf("%w: file_role must be MANUSCRIPT or TEMPLATE", domain.ErrInvalidInput)
	}

	// The extension comes from the declared type, never from the client filename.
	cleanExt := extensionFor(fileType)
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
func (u *submissionUsecase) ConfirmSubmission(ctx context.Context, actor Actor, req ConfirmSubmissionDTO) (*ConfirmSubmissionResult, error) {
	if _, err := u.loadManuscriptFor(ctx, actor, req.ManuscriptID, true); err != nil {
		return nil, err
	}

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
		return nil, fmt.Errorf("%w: draft manuscript file is required", domain.ErrInvalidInput)
	}
	if err := validateSubmittedKey(req.ManuscriptID, draftS3Key); err != nil {
		return nil, err
	}
	if req.TemplateFile != nil && req.TemplateFile.S3Key != "" {
		if err := validateSubmittedKey(req.ManuscriptID, req.TemplateFile.S3Key); err != nil {
			return nil, err
		}
	}

	var templatePresetPtr *string
	var auditSpecs domain.TemplateSpecs

	if req.TemplateFile != nil && req.TemplateFile.S3Key != "" {
		// Uploaded Template Mode: Extract AST XML directly from file. Bypasses dropdown presets.
		templatePresetPtr = nil
		auditSpecs = domain.TemplateSpecs{
			Name:             req.TemplateFile.OriginalFilename,
			Source:           "uploaded_template_ast_xml",
			IsCustomTemplate: true,
		}
	} else {
		// Fallback Preset Mode: Only used when no template file is uploaded.
		presetID := strings.TrimSpace(req.TemplatePreset)
		if presetID == "" {
			presetID = domain.DefaultTemplatePresetID
		}
		preset, ok := domain.FindTemplatePreset(presetID)
		if !ok {
			return nil, fmt.Errorf("%w: unknown template preset %q", domain.ErrInvalidInput, presetID)
		}
		templatePresetPtr = &preset.ID
		auditSpecs = preset.Specs
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
			TemplatePreset:   templatePresetPtr,
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

	// 5. Dispatch the audit: either to the Redis queue (external worker) or,
	// by default, to the in-process audit runner. Never both, otherwise the
	// same audit would be processed twice.
	if u.eventPublisher != nil {
		var templateFileIDStr string
		if templateFileIDPtr != nil {
			templateFileIDStr = templateFileIDPtr.String()
		}
		if err := u.eventPublisher.PublishAuditJob(ctx, domain.AuditEventPayload{
			AuditID:        auditID.String(),
			FileID:         draftFileID.String(),
			TemplateFileID: templateFileIDStr,
			ManuscriptID:   req.ManuscriptID.String(),
			S3Key:          draftS3Key,
			TemplateS3Key:  templateS3Key,
			FileType:       string(draftFileType),
		}); err != nil {
			return nil, fmt.Errorf("failed to enqueue audit job: %w", err)
		}
	} else if u.aiAuditor != nil {
		job := domain.AuditJob{
			AuditID:      auditID,
			ManuscriptID: req.ManuscriptID,
			DraftKey:     draftS3Key,
			TemplateKey:  templateS3Key,
			Specs:        auditSpecs,
		}
		go func() {
			// The runner owns timeouts, panic recovery and FAILED marking.
			_ = u.aiAuditor.AuditManuscript(context.Background(), job)
		}()
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

func (u *submissionUsecase) GetAuditReport(ctx context.Context, actor Actor, auditID uuid.UUID) (*domain.PreSubmissionAudit, error) {
	audit, manuscriptID, err := u.manuscriptIDForAudit(ctx, auditID)
	if errors.Is(err, domain.ErrNotFound) {
		// Not an audit ID: treat it as a manuscript ID and return its latest audit.
		m, merr := u.loadManuscriptFor(ctx, actor, auditID, false)
		if merr != nil {
			if errors.Is(merr, domain.ErrForbidden) {
				return nil, merr
			}
			return nil, err
		}
		var latest *domain.PreSubmissionAudit
		for fi := range m.Files {
			for ai := range m.Files[fi].Audits {
				a := &m.Files[fi].Audits[ai]
				if latest == nil || a.CreatedAt.After(latest.CreatedAt) {
					latest = a
				}
			}
		}
		if latest == nil {
			return nil, fmt.Errorf("manuscript %s has no audit yet: %w", auditID, domain.ErrNotFound)
		}
		return latest, nil
	}
	if err != nil {
		return nil, err
	}
	if _, err := u.loadManuscriptFor(ctx, actor, manuscriptID, false); err != nil {
		return nil, err
	}
	return audit, nil
}

func (u *submissionUsecase) GetManuscriptFile(ctx context.Context, id uuid.UUID) (*domain.ManuscriptFile, error) {
	return u.fileRepo.GetByID(ctx, id)
}

func (u *submissionUsecase) UpdateManuscriptStatus(ctx context.Context, id uuid.UUID, status domain.ManuscriptStatus) error {
	if !editorialStatuses[status] {
		return fmt.Errorf("%w: status %q cannot be set manually", domain.ErrInvalidInput, status)
	}
	if _, err := u.manuscriptRepo.GetByID(ctx, id); err != nil {
		return fmt.Errorf("manuscript %s: %w", id, domain.ErrNotFound)
	}
	return u.manuscriptRepo.UpdateStatus(ctx, id, status)
}
