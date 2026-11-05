package usecase

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jms-uts/backend/gateway/internal/domain"
)

// Actor is the authenticated user performing a request.
type Actor struct {
	UserID uuid.UUID
	Role   domain.Role
}

// IsStaff reports whether the actor belongs to the editorial office and may
// read every manuscript (but still cannot upload on behalf of an author).
func (a Actor) IsStaff() bool {
	return a.Role == domain.RoleEditor || a.Role == domain.RoleAdmin
}

// editorialStatuses are the statuses an editor may set manually. Pre-check
// statuses are owned by the audit pipeline.
var editorialStatuses = map[domain.ManuscriptStatus]bool{
	domain.StatusUnderDeskReview:  true,
	domain.StatusInPeerReview:     true,
	domain.StatusRevisionRequired: true,
	domain.StatusAccepted:         true,
	domain.StatusRejected:         true,
}

// loadManuscriptFor loads a manuscript and checks the actor may access it.
// requireOwner=true is used for write operations (uploading/confirming files).
func (u *submissionUsecase) loadManuscriptFor(ctx context.Context, actor Actor, id uuid.UUID, requireOwner bool) (*domain.Manuscript, error) {
	m, err := u.manuscriptRepo.GetByID(ctx, id)
	if err != nil || m == nil {
		return nil, fmt.Errorf("manuscript %s: %w", id, domain.ErrNotFound)
	}
	if m.AuthorID == actor.UserID {
		return m, nil
	}
	if !requireOwner && actor.IsStaff() {
		return m, nil
	}
	return nil, fmt.Errorf("manuscript %s: %w", id, domain.ErrForbidden)
}

// manuscriptIDForAudit resolves audit -> draft file -> manuscript.
func (u *submissionUsecase) manuscriptIDForAudit(ctx context.Context, auditID uuid.UUID) (*domain.PreSubmissionAudit, uuid.UUID, error) {
	audit, err := u.auditRepo.GetByID(ctx, auditID)
	if err != nil || audit == nil {
		return nil, uuid.Nil, fmt.Errorf("audit %s: %w", auditID, domain.ErrNotFound)
	}
	file, err := u.fileRepo.GetByID(ctx, audit.ManuscriptFileID)
	if err != nil || file == nil {
		return nil, uuid.Nil, fmt.Errorf("audit %s file: %w", auditID, domain.ErrNotFound)
	}
	return audit, file.ManuscriptID, nil
}

// AuthorizeFileAccess checks whether the actor may read (write=false) or
// upload (write=true) the storage object at key.
//
//	raw/{manuscript_id}/...            read: owner or staff, write: owner only
//	audits/annotated_{audit_id}.pdf    read: owner or staff, write: never (system output)
func (u *submissionUsecase) AuthorizeFileAccess(ctx context.Context, actor Actor, key string, write bool) error {
	if err := domain.ValidateStorageKey(key); err != nil {
		return err
	}

	parts := strings.Split(key, "/")
	switch parts[0] {
	case domain.StoragePrefixRaw:
		if len(parts) < 3 {
			return fmt.Errorf("%w: malformed storage key", domain.ErrInvalidInput)
		}
		manuscriptID, err := uuid.Parse(parts[1])
		if err != nil {
			return fmt.Errorf("%w: malformed storage key", domain.ErrInvalidInput)
		}
		_, err = u.loadManuscriptFor(ctx, actor, manuscriptID, write)
		return err

	case domain.StoragePrefixAudits:
		if write {
			return fmt.Errorf("audit outputs are system generated: %w", domain.ErrForbidden)
		}
		if len(parts) != 2 {
			return fmt.Errorf("%w: malformed storage key", domain.ErrInvalidInput)
		}
		auditID, err := auditIDFromOutputName(parts[1])
		if err != nil {
			return fmt.Errorf("%w: malformed storage key", domain.ErrInvalidInput)
		}
		_, manuscriptID, err := u.manuscriptIDForAudit(ctx, auditID)
		if err != nil {
			return err
		}
		_, err = u.loadManuscriptFor(ctx, actor, manuscriptID, false)
		return err
	}

	return fmt.Errorf("unknown storage area: %w", domain.ErrForbidden)
}

// validateSubmittedKey ensures a confirmed file key points inside this
// manuscript's own upload area (prevents attaching someone else's file).
func validateSubmittedKey(manuscriptID uuid.UUID, key string) error {
	if err := domain.ValidateStorageKey(key); err != nil {
		return err
	}
	prefix := fmt.Sprintf("%s/%s/", domain.StoragePrefixRaw, manuscriptID)
	if !strings.HasPrefix(key, prefix) {
		return fmt.Errorf("%w: file key does not belong to this manuscript", domain.ErrInvalidInput)
	}
	return nil
}

// extensionFor derives the stored file extension from the declared type
// instead of trusting the client-supplied filename.
func extensionFor(fileType domain.FileType) string {
	switch fileType {
	case domain.FileTypeDOCX:
		return ".docx"
	case domain.FileTypeLatexZip:
		return ".zip"
	default:
		return ".pdf"
	}
}

// auditIDFromOutputName parses audit output file names:
// "annotated_<audit-id>.pdf" (annotated proof) and "<audit-id>_fixed_layout.pdf" (reshaped PDF).
func auditIDFromOutputName(name string) (uuid.UUID, error) {
	switch {
	case strings.HasPrefix(name, "annotated_") && strings.HasSuffix(name, ".pdf"):
		return uuid.Parse(strings.TrimSuffix(strings.TrimPrefix(name, "annotated_"), ".pdf"))
	case strings.HasSuffix(name, "_fixed_layout.pdf"):
		return uuid.Parse(strings.TrimSuffix(name, "_fixed_layout.pdf"))
	}
	return uuid.Nil, fmt.Errorf("unknown audit output %q", name)
}
