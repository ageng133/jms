package usecase_test

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jms-uts/backend/gateway/internal/domain"
	"github.com/jms-uts/backend/gateway/internal/usecase"
)

// recordingAuditRepo captures lifecycle calls made by the runner.
type recordingAuditRepo struct {
	mu         sync.Mutex
	processing bool
	completed  *domain.CompletedAudit
	failedMsg  string
}

func (r *recordingAuditRepo) Create(ctx context.Context, a *domain.PreSubmissionAudit) error {
	return nil
}
func (r *recordingAuditRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.PreSubmissionAudit, error) {
	return nil, errors.New("not used")
}
func (r *recordingAuditRepo) GetByFileID(ctx context.Context, id uuid.UUID) (*domain.PreSubmissionAudit, error) {
	return nil, errors.New("not used")
}
func (r *recordingAuditRepo) MarkProcessing(ctx context.Context, id uuid.UUID) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.processing = true
	return nil
}
func (r *recordingAuditRepo) SaveCompleted(ctx context.Context, id, mid uuid.UUID, res domain.CompletedAudit) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.completed = &res
	return nil
}
func (r *recordingAuditRepo) MarkFailed(ctx context.Context, id, mid uuid.UUID, msg string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.failedMsg = msg
	return nil
}
func (r *recordingAuditRepo) FailUnfinished(ctx context.Context, msg string) (int64, error) {
	return 0, nil
}

type memStorage struct {
	mu    sync.Mutex
	files map[string][]byte
}

func newMemStorage() *memStorage { return &memStorage{files: map[string][]byte{}} }

func (m *memStorage) GeneratePresignedPutURL(ctx context.Context, key, ct string, e time.Duration) (string, error) {
	return "", nil
}
func (m *memStorage) GeneratePresignedGetURL(ctx context.Context, key string, e time.Duration) (string, error) {
	return "", nil
}
func (m *memStorage) SaveFile(ctx context.Context, key string, data []byte) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.files[key] = data
	return nil
}
func (m *memStorage) GetFile(ctx context.Context, key string) ([]byte, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if d, ok := m.files[key]; ok {
		return d, nil
	}
	return nil, errors.New("not found")
}

type fakeEngine struct {
	name   string
	out    *domain.AuditOutput
	err    error
	panics bool
	calls  int
	gotIn  domain.AuditInput
}

func (f *fakeEngine) Name() string { return f.name }
func (f *fakeEngine) Audit(ctx context.Context, in domain.AuditInput) (*domain.AuditOutput, error) {
	f.calls++
	f.gotIn = in
	if f.panics {
		panic("boom")
	}
	return f.out, f.err
}

func newJob(storage *memStorage, withTemplate bool) domain.AuditJob {
	job := domain.AuditJob{
		AuditID:      uuid.New(),
		ManuscriptID: uuid.New(),
		DraftKey:     "raw/m/draft.pdf",
		Specs:        domain.TemplatePresets()[0].Specs,
	}
	storage.files[job.DraftKey] = []byte("%PDF-draft")
	if withTemplate {
		job.TemplateKey = "raw/m/template.pdf"
		storage.files[job.TemplateKey] = []byte("%PDF-template")
	}
	return job
}

func failingFindings() domain.AuditFindings {
	return domain.AuditFindings{
		Checks: []domain.GeometryCheck{
			{Rule: "MARGIN_TOP", Page: 1}, {Rule: "MARGIN_TOP", Page: 2}, // same rule twice = 1 critical
		},
		Leaks:    []domain.AnonymizationLeak{{Type: "EMAIL", Leak: "a@b.edu", Page: 1}},
		Citation: domain.CitationResult{MissingCitations: []string{"[3]"}},
	}
}

func TestAuditRunner_UsesWorkerAndStoresAnnotatedPDF(t *testing.T) {
	repo, storage := &recordingAuditRepo{}, newMemStorage()
	worker := &fakeEngine{name: "pymupdf-worker", out: &domain.AuditOutput{
		Engine: "pymupdf-worker", Findings: failingFindings(), AnnotatedPDF: []byte("%PDF-annotated"),
	}}
	gemini := &fakeEngine{name: "gemini"}
	job := newJob(storage, true)

	if err := usecase.NewAuditRunner(repo, storage, time.Minute, worker, gemini).AuditManuscript(context.Background(), job); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if !repo.processing || repo.completed == nil || repo.failedMsg != "" {
		t.Fatalf("unexpected lifecycle: processing=%v completed=%v failed=%q", repo.processing, repo.completed != nil, repo.failedMsg)
	}
	if gemini.calls != 0 {
		t.Error("fallback engine must not run when the worker succeeds")
	}
	if string(worker.gotIn.Template) != "%PDF-template" {
		t.Error("template PDF was not passed to the engine")
	}

	c := repo.completed
	if c.Summary.CriticalErrors != 1 || c.Summary.Warnings != 2 || c.Summary.OverallScore != 75 || c.Summary.Status != "FAIL" {
		t.Errorf("unexpected summary: %+v", c.Summary)
	}
	if c.ManuscriptStatus != domain.StatusPreCheckFailed {
		t.Errorf("expected PRE_CHECK_FAILED, got %s", c.ManuscriptStatus)
	}
	if c.AnnotatedKey == nil || *c.AnnotatedKey != domain.AnnotatedPDFKey(job.AuditID) {
		t.Fatalf("annotated key not set: %v", c.AnnotatedKey)
	}
	if string(storage.files[*c.AnnotatedKey]) != "%PDF-annotated" {
		t.Error("annotated PDF not saved to storage")
	}
	var specs domain.TemplateSpecs
	_ = json.Unmarshal(c.TemplateSpecs, &specs)
	if specs.PageFormat == "" {
		t.Error("template specs should fall back to the preset when the engine returns none")
	}
}

func TestAuditRunner_PassMovesToDeskReview(t *testing.T) {
	repo, storage := &recordingAuditRepo{}, newMemStorage()
	worker := &fakeEngine{name: "w", out: &domain.AuditOutput{Engine: "w"}}

	if err := usecase.NewAuditRunner(repo, storage, time.Minute, worker).AuditManuscript(context.Background(), newJob(storage, false)); err != nil {
		t.Fatal(err)
	}
	if repo.completed.ManuscriptStatus != domain.StatusUnderDeskReview || repo.completed.Summary.OverallScore != 100 {
		t.Errorf("unexpected result: %+v", repo.completed)
	}
	if repo.completed.AnnotatedKey != nil {
		t.Error("no annotated PDF expected for a clean manuscript")
	}
}

func TestAuditRunner_FallsBackToGemini(t *testing.T) {
	repo, storage := &recordingAuditRepo{}, newMemStorage()
	worker := &fakeEngine{name: "worker", err: errors.New("connection refused")}
	gemini := &fakeEngine{name: "gemini", out: &domain.AuditOutput{Engine: "gemini"}}

	if err := usecase.NewAuditRunner(repo, storage, time.Minute, worker, gemini).AuditManuscript(context.Background(), newJob(storage, false)); err != nil {
		t.Fatal(err)
	}
	if gemini.calls != 1 || repo.completed == nil || repo.completed.Engine != "gemini" {
		t.Errorf("expected gemini fallback to complete the audit, got %+v", repo.completed)
	}
}

func TestAuditRunner_InvalidDocumentDoesNotFallBack(t *testing.T) {
	repo, storage := &recordingAuditRepo{}, newMemStorage()
	worker := &fakeEngine{name: "worker", err: errors.Join(domain.ErrInvalidDocument, errors.New("password protected"))}
	gemini := &fakeEngine{name: "gemini", out: &domain.AuditOutput{}}

	if err := usecase.NewAuditRunner(repo, storage, time.Minute, worker, gemini).AuditManuscript(context.Background(), newJob(storage, false)); err == nil {
		t.Fatal("expected error")
	}
	if gemini.calls != 0 {
		t.Error("an unreadable PDF must not be retried with another engine")
	}
	if !strings.Contains(repo.failedMsg, "password protected") {
		t.Errorf("failure reason not recorded: %q", repo.failedMsg)
	}
}

func TestAuditRunner_FailureModesMarkFailed(t *testing.T) {
	ok := func() domain.AuditEngine { return &fakeEngine{name: "w", out: &domain.AuditOutput{}} }

	cases := []struct {
		name      string
		engines   []domain.AuditEngine
		dropDraft bool
	}{
		{name: "no engines"},
		{name: "all engines fail", engines: []domain.AuditEngine{
			&fakeEngine{name: "a", err: errors.New("down")}, &fakeEngine{name: "b", err: errors.New("quota")},
		}},
		{name: "engine panics", engines: []domain.AuditEngine{&fakeEngine{name: "p", panics: true}}},
		{name: "draft missing from storage", engines: []domain.AuditEngine{ok()}, dropDraft: true},
	}

	for _, tc := range cases {
		repo, storage := &recordingAuditRepo{}, newMemStorage()
		job := newJob(storage, false)
		if tc.dropDraft {
			delete(storage.files, job.DraftKey)
		}

		err := usecase.NewAuditRunner(repo, storage, time.Minute, tc.engines...).AuditManuscript(context.Background(), job)
		if err == nil {
			t.Errorf("%s: expected error", tc.name)
		}
		if repo.failedMsg == "" {
			t.Errorf("%s: audit was not marked FAILED", tc.name)
		}
		if repo.completed != nil {
			t.Errorf("%s: audit must not be marked completed", tc.name)
		}
	}
}

func TestAuditRunner_TimeoutMarksFailed(t *testing.T) {
	repo, storage := &recordingAuditRepo{}, newMemStorage()
	slow := &slowEngine{}
	err := usecase.NewAuditRunner(repo, storage, 50*time.Millisecond, slow).AuditManuscript(context.Background(), newJob(storage, false))
	if err == nil || repo.failedMsg == "" {
		t.Fatalf("expected timeout to mark the audit FAILED, err=%v msg=%q", err, repo.failedMsg)
	}
}

type slowEngine struct{}

func (s *slowEngine) Name() string { return "slow" }
func (s *slowEngine) Audit(ctx context.Context, in domain.AuditInput) (*domain.AuditOutput, error) {
	<-ctx.Done()
	return nil, ctx.Err()
}

type pingEngine struct {
	fakeEngine
	pingErr error
}

func (p *pingEngine) Ping(ctx context.Context) error { return p.pingErr }

func TestAuditRunner_EngineStatuses(t *testing.T) {
	up := &pingEngine{fakeEngine: fakeEngine{name: "worker-up"}}
	down := &pingEngine{fakeEngine: fakeEngine{name: "worker-down"}, pingErr: errors.New("refused")}
	plain := &fakeEngine{name: "gemini"}

	got := usecase.NewAuditRunner(&recordingAuditRepo{}, nil, time.Minute, up, down, plain).EngineStatuses(context.Background())
	want := []domain.EngineStatus{
		{Name: "worker-up", Status: "online"},
		{Name: "worker-down", Status: "offline"},
		{Name: "gemini", Status: "configured"},
	}
	if len(got) != len(want) {
		t.Fatalf("got %+v", got)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Errorf("engine %d: got %+v want %+v", i, got[i], want[i])
		}
	}
}
