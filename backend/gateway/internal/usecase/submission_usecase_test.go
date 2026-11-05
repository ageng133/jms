package usecase_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jms-uts/backend/gateway/internal/domain"
	"github.com/jms-uts/backend/gateway/internal/usecase"
)

type mockStorageClient struct{}

func (m *mockStorageClient) GeneratePresignedPutURL(ctx context.Context, key string, contentType string, expiry time.Duration) (string, error) {
	return "http://localhost:8080/api/v1/files/upload?key=" + key, nil
}

func (m *mockStorageClient) GeneratePresignedGetURL(ctx context.Context, key string, expiry time.Duration) (string, error) {
	return "http://localhost:8080/api/v1/files/download?key=" + key, nil
}

func (m *mockStorageClient) SaveFile(ctx context.Context, key string, data []byte) error {
	return nil
}

func (m *mockStorageClient) GetFile(ctx context.Context, key string) ([]byte, error) {
	return []byte("%PDF-1.4 Mock PDF"), nil
}

// mockManuscriptRepo returns a single manuscript owned by ownerID.
type mockManuscriptRepo struct {
	manuscriptID uuid.UUID
	ownerID      uuid.UUID
	updated      domain.ManuscriptStatus
	files        []domain.ManuscriptFile // mirrors the Files/Files.Audits preload
}

func (m *mockManuscriptRepo) Create(ctx context.Context, manuscript *domain.Manuscript) error {
	return nil
}
func (m *mockManuscriptRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.Manuscript, error) {
	if id != m.manuscriptID {
		return nil, errors.New("record not found")
	}
	return &domain.Manuscript{ID: id, AuthorID: m.ownerID, Title: "Test Manuscript", Files: m.files}, nil
}
func (m *mockManuscriptRepo) ListByAuthorID(ctx context.Context, authorID uuid.UUID) ([]domain.Manuscript, error) {
	return nil, nil
}
func (m *mockManuscriptRepo) ListAll(ctx context.Context) ([]domain.Manuscript, error) {
	return nil, nil
}
func (m *mockManuscriptRepo) UpdateStatus(ctx context.Context, id uuid.UUID, status domain.ManuscriptStatus) error {
	m.updated = status
	return nil
}

type mockFileRepo struct {
	files map[uuid.UUID]*domain.ManuscriptFile
}

func (m *mockFileRepo) Create(ctx context.Context, file *domain.ManuscriptFile) error { return nil }
func (m *mockFileRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.ManuscriptFile, error) {
	if f, ok := m.files[id]; ok {
		return f, nil
	}
	return nil, errors.New("record not found")
}
func (m *mockFileRepo) GetLatestVersion(ctx context.Context, manuscriptID uuid.UUID) (int, error) {
	return 0, nil
}

type mockAuditRepo struct {
	audits map[uuid.UUID]*domain.PreSubmissionAudit
}

func (m *mockAuditRepo) Create(ctx context.Context, audit *domain.PreSubmissionAudit) error {
	return nil
}
func (m *mockAuditRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.PreSubmissionAudit, error) {
	if a, ok := m.audits[id]; ok {
		return a, nil
	}
	return nil, errors.New("record not found")
}
func (m *mockAuditRepo) GetByFileID(ctx context.Context, fileID uuid.UUID) (*domain.PreSubmissionAudit, error) {
	return nil, errors.New("record not found")
}
func (m *mockAuditRepo) MarkProcessing(ctx context.Context, id uuid.UUID) error { return nil }
func (m *mockAuditRepo) SaveCompleted(ctx context.Context, id, manuscriptID uuid.UUID, r domain.CompletedAudit) error {
	return nil
}
func (m *mockAuditRepo) MarkFailed(ctx context.Context, id, manuscriptID uuid.UUID, msg string) error {
	return nil
}
func (m *mockAuditRepo) FailUnfinished(ctx context.Context, msg string) (int64, error) { return 0, nil }

type fixture struct {
	uc           usecase.SubmissionUsecase
	manuscripts  *mockManuscriptRepo
	manuscriptID uuid.UUID
	auditID      uuid.UUID
	owner        usecase.Actor
	stranger     usecase.Actor
	editor       usecase.Actor
}

func newFixture() *fixture {
	ownerID := uuid.New()
	manuscriptID := uuid.New()
	fileID := uuid.New()
	auditID := uuid.New()

	manuscripts := &mockManuscriptRepo{manuscriptID: manuscriptID, ownerID: ownerID, files: []domain.ManuscriptFile{{
		ID: fileID, ManuscriptID: manuscriptID,
		Audits: []domain.PreSubmissionAudit{{ID: auditID, ManuscriptFileID: fileID, Status: domain.AuditStatusCompleted}},
	}}}
	files := &mockFileRepo{files: map[uuid.UUID]*domain.ManuscriptFile{
		fileID: {ID: fileID, ManuscriptID: manuscriptID},
	}}
	audits := &mockAuditRepo{audits: map[uuid.UUID]*domain.PreSubmissionAudit{
		auditID: {ID: auditID, ManuscriptFileID: fileID, Status: domain.AuditStatusCompleted},
	}}

	return &fixture{
		uc:           usecase.NewSubmissionUsecase(nil, manuscripts, files, audits, nil, &mockStorageClient{}, nil),
		manuscripts:  manuscripts,
		manuscriptID: manuscriptID,
		auditID:      auditID,
		owner:        usecase.Actor{UserID: ownerID, Role: domain.RoleAuthor},
		stranger:     usecase.Actor{UserID: uuid.New(), Role: domain.RoleAuthor},
		editor:       usecase.Actor{UserID: uuid.New(), Role: domain.RoleEditor},
	}
}

func TestRequestUploadURL(t *testing.T) {
	f := newFixture()

	res, err := f.uc.RequestUploadURL(context.Background(), f.owner, f.manuscriptID, "research_paper.pdf", domain.FileTypePDF, domain.FileRoleManuscript)
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

func TestRequestUploadURL_IgnoresClientExtension(t *testing.T) {
	f := newFixture()

	res, err := f.uc.RequestUploadURL(context.Background(), f.owner, f.manuscriptID, "evil.pdf/../../x.sh", domain.FileTypePDF, "")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if err := domain.ValidateStorageKey(res.S3Key); err != nil {
		t.Errorf("generated key is not safe: %s (%v)", res.S3Key, err)
	}
	if got := res.S3Key[len(res.S3Key)-4:]; got != ".pdf" {
		t.Errorf("expected .pdf extension, got key %s", res.S3Key)
	}
}

func TestRequestUploadURL_OnlyOwner(t *testing.T) {
	f := newFixture()
	ctx := context.Background()

	for name, actor := range map[string]usecase.Actor{"stranger": f.stranger, "editor": f.editor} {
		_, err := f.uc.RequestUploadURL(ctx, actor, f.manuscriptID, "a.pdf", domain.FileTypePDF, "")
		if !errors.Is(err, domain.ErrForbidden) {
			t.Errorf("%s: expected ErrForbidden, got %v", name, err)
		}
	}

	_, err := f.uc.RequestUploadURL(ctx, f.owner, uuid.New(), "a.pdf", domain.FileTypePDF, "")
	if !errors.Is(err, domain.ErrNotFound) {
		t.Errorf("unknown manuscript: expected ErrNotFound, got %v", err)
	}
}

func TestGetManuscript_Access(t *testing.T) {
	f := newFixture()
	ctx := context.Background()

	if _, err := f.uc.GetManuscript(ctx, f.owner, f.manuscriptID); err != nil {
		t.Errorf("owner should read own manuscript: %v", err)
	}
	if _, err := f.uc.GetManuscript(ctx, f.editor, f.manuscriptID); err != nil {
		t.Errorf("editor should read any manuscript: %v", err)
	}
	if _, err := f.uc.GetManuscript(ctx, f.stranger, f.manuscriptID); !errors.Is(err, domain.ErrForbidden) {
		t.Errorf("stranger: expected ErrForbidden, got %v", err)
	}
}

func TestGetAuditReport_Access(t *testing.T) {
	f := newFixture()
	ctx := context.Background()

	if _, err := f.uc.GetAuditReport(ctx, f.owner, f.auditID); err != nil {
		t.Errorf("owner should read own audit: %v", err)
	}
	if _, err := f.uc.GetAuditReport(ctx, f.editor, f.auditID); err != nil {
		t.Errorf("editor should read any audit: %v", err)
	}
	if _, err := f.uc.GetAuditReport(ctx, f.stranger, f.auditID); !errors.Is(err, domain.ErrForbidden) {
		t.Errorf("stranger: expected ErrForbidden, got %v", err)
	}
	if _, err := f.uc.GetAuditReport(ctx, f.owner, uuid.New()); !errors.Is(err, domain.ErrNotFound) {
		t.Errorf("unknown audit: expected ErrNotFound, got %v", err)
	}
	// A manuscript ID resolves to its latest audit, with the same access rules.
	if a, err := f.uc.GetAuditReport(ctx, f.owner, f.manuscriptID); err != nil || a == nil || a.ID != f.auditID {
		t.Errorf("owner by manuscript id: got %v, %v", a, err)
	}
	if _, err := f.uc.GetAuditReport(ctx, f.stranger, f.manuscriptID); !errors.Is(err, domain.ErrForbidden) {
		t.Errorf("stranger by manuscript id: expected ErrForbidden, got %v", err)
	}
}

func TestAuthorizeFileAccess(t *testing.T) {
	f := newFixture()
	ctx := context.Background()
	rawKey := "raw/" + f.manuscriptID.String() + "/draft_x.pdf"
	auditKey := "audits/annotated_" + f.auditID.String() + ".pdf"
	fixedKey := "audits/" + f.auditID.String() + "_fixed_layout.pdf"

	cases := []struct {
		name  string
		actor usecase.Actor
		key   string
		write bool
		want  error // nil = allowed
	}{
		{"owner uploads raw", f.owner, rawKey, true, nil},
		{"owner reads raw", f.owner, rawKey, false, nil},
		{"editor reads raw", f.editor, rawKey, false, nil},
		{"editor cannot upload", f.editor, rawKey, true, domain.ErrForbidden},
		{"stranger cannot read", f.stranger, rawKey, false, domain.ErrForbidden},
		{"stranger cannot upload", f.stranger, rawKey, true, domain.ErrForbidden},
		{"owner reads annotated", f.owner, auditKey, false, nil},
		{"stranger cannot read annotated", f.stranger, auditKey, false, domain.ErrForbidden},
		{"nobody writes audits", f.owner, auditKey, true, domain.ErrForbidden},
		{"owner reads reshaped", f.owner, fixedKey, false, nil},
		{"stranger cannot read reshaped", f.stranger, fixedKey, false, domain.ErrForbidden},
		{"unknown audit output", f.owner, "audits/whatever.pdf", false, domain.ErrInvalidInput},
		{"traversal", f.owner, "raw/" + f.manuscriptID.String() + "/../../../etc/passwd", false, domain.ErrInvalidInput},
		{"absolute path", f.owner, "/etc/passwd", false, domain.ErrInvalidInput},
		{"windows path", f.owner, `raw\..\..\secret`, false, domain.ErrInvalidInput},
		{"unknown area", f.owner, "config/app.env", false, domain.ErrForbidden},
	}

	for _, tc := range cases {
		err := f.uc.AuthorizeFileAccess(ctx, tc.actor, tc.key, tc.write)
		if tc.want == nil && err != nil {
			t.Errorf("%s: expected allowed, got %v", tc.name, err)
		}
		if tc.want != nil && !errors.Is(err, tc.want) {
			t.Errorf("%s: expected %v, got %v", tc.name, tc.want, err)
		}
	}
}

func TestConfirmSubmission_RejectsForeignKeys(t *testing.T) {
	f := newFixture()
	otherManuscript := uuid.New()

	_, err := f.uc.ConfirmSubmission(context.Background(), f.owner, usecase.ConfirmSubmissionDTO{
		ManuscriptID: f.manuscriptID,
		DraftFile: &usecase.FileUploadMetaDTO{
			FileType:         domain.FileTypePDF,
			S3Key:            "raw/" + otherManuscript.String() + "/draft_x.pdf",
			OriginalFilename: "x.pdf",
			FileSizeBytes:    10,
		},
	})
	if !errors.Is(err, domain.ErrInvalidInput) {
		t.Errorf("expected ErrInvalidInput for a key outside this manuscript, got %v", err)
	}
}

func TestConfirmSubmission_OnlyOwner(t *testing.T) {
	f := newFixture()

	_, err := f.uc.ConfirmSubmission(context.Background(), f.stranger, usecase.ConfirmSubmissionDTO{
		ManuscriptID: f.manuscriptID,
		S3Key:        "raw/" + f.manuscriptID.String() + "/draft_x.pdf",
	})
	if !errors.Is(err, domain.ErrForbidden) {
		t.Errorf("expected ErrForbidden, got %v", err)
	}
}

func TestUpdateManuscriptStatus_Validation(t *testing.T) {
	f := newFixture()
	ctx := context.Background()

	if err := f.uc.UpdateManuscriptStatus(ctx, f.manuscriptID, domain.StatusAccepted); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if f.manuscripts.updated != domain.StatusAccepted {
		t.Errorf("expected status to be updated to ACCEPTED, got %q", f.manuscripts.updated)
	}

	for _, s := range []domain.ManuscriptStatus{domain.StatusPreCheckPending, domain.StatusDraft, "HACKED"} {
		if err := f.uc.UpdateManuscriptStatus(ctx, f.manuscriptID, s); !errors.Is(err, domain.ErrInvalidInput) {
			t.Errorf("%s: expected ErrInvalidInput, got %v", s, err)
		}
	}

	if err := f.uc.UpdateManuscriptStatus(ctx, uuid.New(), domain.StatusAccepted); !errors.Is(err, domain.ErrNotFound) {
		t.Errorf("unknown manuscript: expected ErrNotFound, got %v", err)
	}
}
