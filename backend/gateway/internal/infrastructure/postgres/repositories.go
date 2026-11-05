package postgres

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jms-uts/backend/gateway/internal/domain"
	"gorm.io/gorm"
)

type UserRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) domain.UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) Create(ctx context.Context, user *domain.User) error {
	return r.db.WithContext(ctx).Create(user).Error
}

func (r *UserRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
	var user domain.User
	if err := r.db.WithContext(ctx).First(&user, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) GetByEmail(ctx context.Context, email string) (*domain.User, error) {
	var user domain.User
	if err := r.db.WithContext(ctx).First(&user, "email = ?", email).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

// ManuscriptRepository
type ManuscriptRepository struct {
	db *gorm.DB
}

func NewManuscriptRepository(db *gorm.DB) domain.ManuscriptRepository {
	return &ManuscriptRepository{db: db}
}

func (r *ManuscriptRepository) Create(ctx context.Context, m *domain.Manuscript) error {
	return r.db.WithContext(ctx).Create(m).Error
}

func (r *ManuscriptRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Manuscript, error) {
	var m domain.Manuscript
	if err := r.db.WithContext(ctx).
		Preload("Author").
		Preload("Files").
		Preload("Files.Audits").
		First(&m, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &m, nil
}

func (r *ManuscriptRepository) ListByAuthorID(ctx context.Context, authorID uuid.UUID) ([]domain.Manuscript, error) {
	var list []domain.Manuscript
	if err := r.db.WithContext(ctx).
		Preload("Author").
		Preload("Files").
		Preload("Files.Audits").
		Where("author_id = ?", authorID).
		Order("created_at DESC").
		Find(&list).Error; err != nil {
		return nil, err
	}
	return list, nil
}

func (r *ManuscriptRepository) ListAll(ctx context.Context) ([]domain.Manuscript, error) {
	var list []domain.Manuscript
	if err := r.db.WithContext(ctx).
		Preload("Author").
		Preload("Files").
		Preload("Files.Audits").
		Order("created_at DESC").
		Find(&list).Error; err != nil {
		return nil, err
	}
	return list, nil
}

func (r *ManuscriptRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status domain.ManuscriptStatus) error {
	return r.db.WithContext(ctx).
		Model(&domain.Manuscript{}).
		Where("id = ?", id).
		Update("status", status).Error
}

// ManuscriptFileRepository
type ManuscriptFileRepository struct {
	db *gorm.DB
}

func NewManuscriptFileRepository(db *gorm.DB) domain.ManuscriptFileRepository {
	return &ManuscriptFileRepository{db: db}
}

func (r *ManuscriptFileRepository) Create(ctx context.Context, file *domain.ManuscriptFile) error {
	return r.db.WithContext(ctx).Create(file).Error
}

func (r *ManuscriptFileRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.ManuscriptFile, error) {
	var file domain.ManuscriptFile
	if err := r.db.WithContext(ctx).
		Preload("Audits").
		First(&file, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &file, nil
}

func (r *ManuscriptFileRepository) GetLatestVersion(ctx context.Context, manuscriptID uuid.UUID) (int, error) {
	var maxVersion int
	err := r.db.WithContext(ctx).
		Table("manuscript_files").
		Where("manuscript_id = ?", manuscriptID).
		Select("COALESCE(MAX(version), 0)").
		Scan(&maxVersion).Error
	return maxVersion, err
}

// AuditRepository
type AuditRepository struct {
	db *gorm.DB
}

func NewAuditRepository(db *gorm.DB) domain.AuditRepository {
	return &AuditRepository{db: db}
}

func (r *AuditRepository) Create(ctx context.Context, audit *domain.PreSubmissionAudit) error {
	return r.db.WithContext(ctx).Create(audit).Error
}

func (r *AuditRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.PreSubmissionAudit, error) {
	var audit domain.PreSubmissionAudit
	if err := r.db.WithContext(ctx).First(&audit, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &audit, nil
}

func (r *AuditRepository) GetByFileID(ctx context.Context, fileID uuid.UUID) (*domain.PreSubmissionAudit, error) {
	var audit domain.PreSubmissionAudit
	if err := r.db.WithContext(ctx).
		Where("manuscript_file_id = ?", fileID).
		Order("created_at DESC").
		First(&audit).Error; err != nil {
		return nil, err
	}
	return &audit, nil
}

func (r *AuditRepository) MarkProcessing(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).
		Model(&domain.PreSubmissionAudit{}).
		Where("id = ? AND status IN ?", id, []domain.AuditStatus{domain.AuditStatusQueued, domain.AuditStatusProcessing}).
		Update("status", domain.AuditStatusProcessing).Error
}

func (r *AuditRepository) SaveCompleted(ctx context.Context, id, manuscriptID uuid.UUID, res domain.CompletedAudit) error {
	now := time.Now().UTC()
	score := res.Summary.OverallScore
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&domain.PreSubmissionAudit{}).
			Where("id = ?", id).
			Updates(map[string]interface{}{
				"status":               domain.AuditStatusCompleted,
				"score_overall":        score,
				"layout_issues":        res.LayoutIssues,
				"citation_issues":      res.CitationIssues,
				"anonymization_flags":  res.Anonymization,
				"template_specs":       res.TemplateSpecs,
				"summary":              res.SummaryJSON,
				"engine":               res.Engine,
				"annotated_pdf_s3_key": res.AnnotatedKey,
				"error_message":        nil,
				"completed_at":         now,
			}).Error; err != nil {
			return err
		}
		return tx.Model(&domain.Manuscript{}).
			Where("id = ?", manuscriptID).
			Updates(map[string]interface{}{"status": res.ManuscriptStatus, "updated_at": now}).Error
	})
}

func (r *AuditRepository) MarkFailed(ctx context.Context, id, manuscriptID uuid.UUID, message string) error {
	now := time.Now().UTC()
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&domain.PreSubmissionAudit{}).
			Where("id = ?", id).
			Updates(map[string]interface{}{
				"status":        domain.AuditStatusFailed,
				"error_message": message,
				"completed_at":  now,
			}).Error; err != nil {
			return err
		}
		// Only roll back a manuscript that is still waiting on this pre-check.
		return tx.Model(&domain.Manuscript{}).
			Where("id = ? AND status = ?", manuscriptID, domain.StatusPreCheckPending).
			Updates(map[string]interface{}{"status": domain.StatusDraft, "updated_at": now}).Error
	})
}

func (r *AuditRepository) FailUnfinished(ctx context.Context, message string) (int64, error) {
	now := time.Now().UTC()
	var affected int64
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		res := tx.Model(&domain.PreSubmissionAudit{}).
			Where("status IN ?", []domain.AuditStatus{domain.AuditStatusQueued, domain.AuditStatusProcessing}).
			Updates(map[string]interface{}{
				"status":        domain.AuditStatusFailed,
				"error_message": message,
				"completed_at":  now,
			})
		if res.Error != nil {
			return res.Error
		}
		affected = res.RowsAffected
		return tx.Model(&domain.Manuscript{}).
			Where("status = ?", domain.StatusPreCheckPending).
			Updates(map[string]interface{}{"status": domain.StatusDraft, "updated_at": now}).Error
	})
	return affected, err
}
