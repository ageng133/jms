package usecase

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"runtime/debug"
	"strings"
	"time"

	"github.com/jms-uts/backend/gateway/internal/domain"
)

// AuditRunner executes an audit job end to end:
// load files -> try engines in order -> store annotated PDF -> persist result.
// Any error or panic marks the audit FAILED (it never stays PROCESSING).
type AuditRunner struct {
	audits     domain.AuditRepository
	storage    domain.StorageClient
	engines    []domain.AuditEngine
	timeout    time.Duration
	remediator domain.Remediator
}

// WithRemediator enables the optional reshape step after a successful audit.
func (r *AuditRunner) WithRemediator(rem domain.Remediator) *AuditRunner {
	r.remediator = rem
	return r
}

// ErrNoEngineAvailable is returned when no audit engine is configured.
var ErrNoEngineAvailable = errors.New("no audit engine available: start the ai-worker (AUDIT_ENGINE_URL) or set GEMINI_API_KEY")

func NewAuditRunner(audits domain.AuditRepository, storage domain.StorageClient, timeout time.Duration, engines ...domain.AuditEngine) *AuditRunner {
	if timeout <= 0 {
		timeout = 5 * time.Minute
	}
	var active []domain.AuditEngine
	for _, e := range engines {
		if e != nil {
			active = append(active, e)
		}
	}
	return &AuditRunner{audits: audits, storage: storage, engines: active, timeout: timeout}
}

// EngineStatuses reports the liveness of each configured engine, in fallback order.
func (r *AuditRunner) EngineStatuses(ctx context.Context) []domain.EngineStatus {
	out := make([]domain.EngineStatus, len(r.engines))
	for i, e := range r.engines {
		st := domain.EngineStatus{Name: e.Name(), Status: "configured"}
		if p, ok := e.(domain.EnginePinger); ok {
			if err := p.Ping(ctx); err != nil {
				st.Status = "offline"
			} else {
				st.Status = "online"
			}
		}
		out[i] = st
	}
	return out
}

// EngineNames lists the configured engines in fallback order (for logging).
func (r *AuditRunner) EngineNames() []string {
	names := make([]string, len(r.engines))
	for i, e := range r.engines {
		names[i] = e.Name()
	}
	return names
}

func (r *AuditRunner) AuditManuscript(parent context.Context, job domain.AuditJob) (err error) {
	ctx, cancel := context.WithTimeout(parent, r.timeout)
	defer cancel()

	defer func() {
		if p := recover(); p != nil {
			log.Printf("[Audit] panic in audit %s: %v\n%s", job.AuditID, p, debug.Stack())
			err = fmt.Errorf("internal error while auditing: %v", p)
		}
		if err != nil {
			log.Printf("[Audit] audit %s FAILED: %v", job.AuditID, err)
			// Use a fresh context: ctx may already be cancelled by the timeout.
			failCtx, c := context.WithTimeout(context.Background(), 10*time.Second)
			defer c()
			if ferr := r.audits.MarkFailed(failCtx, job.AuditID, job.ManuscriptID, truncate(err.Error(), 1000)); ferr != nil {
				log.Printf("[Audit] could not mark audit %s as failed: %v", job.AuditID, ferr)
			}
		}
	}()

	if len(r.engines) == 0 {
		return ErrNoEngineAvailable
	}

	if err := r.audits.MarkProcessing(ctx, job.AuditID); err != nil {
		return fmt.Errorf("mark processing: %w", err)
	}

	draft, err := r.storage.GetFile(ctx, job.DraftKey)
	if err != nil {
		return fmt.Errorf("load manuscript file: %w", err)
	}
	var template []byte
	if job.TemplateKey != "" {
		if template, err = r.storage.GetFile(ctx, job.TemplateKey); err != nil {
			return fmt.Errorf("load template file: %w", err)
		}
	}

	input := domain.AuditInput{Draft: draft, Template: template, Specs: job.Specs}

	var out *domain.AuditOutput
	var errs []string
	for _, engine := range r.engines {
		started := time.Now()
		out, err = engine.Audit(ctx, input)
		if err == nil {
			log.Printf("[Audit] audit %s completed by %s in %s", job.AuditID, engine.Name(), time.Since(started).Round(time.Millisecond))
			break
		}
		log.Printf("[Audit] engine %s failed for audit %s: %v", engine.Name(), job.AuditID, err)
		errs = append(errs, fmt.Sprintf("%s: %v", engine.Name(), err))
		if errors.Is(err, domain.ErrInvalidDocument) || ctx.Err() != nil {
			break
		}
	}
	if out == nil {
		return fmt.Errorf("all audit engines failed (%s)", strings.Join(errs, "; "))
	}

	return r.persist(ctx, job, input, out)
}

// withFixedPDFKey records where the reshaped PDF was stored inside the fixed_layout blob.
func withFixedPDFKey(raw json.RawMessage, key string) json.RawMessage {
	m := map[string]any{}
	if len(raw) > 0 {
		_ = json.Unmarshal(raw, &m)
	}
	m["fixed_pdf_s3_key"] = key
	delete(m, "annotated_pdf_key") // script-local temp path, meaningless to clients
	b, _ := json.Marshal(m)
	return b
}

func (r *AuditRunner) persist(ctx context.Context, job domain.AuditJob, input domain.AuditInput, out *domain.AuditOutput) error {
	f := out.Findings
	if f.Checks == nil {
		f.Checks = []domain.GeometryCheck{}
	}
	if f.Leaks == nil {
		f.Leaks = []domain.AnonymizationLeak{}
	}
	if f.Citation.UncitedReferences == nil {
		f.Citation.UncitedReferences = []string{}
	}
	if f.Citation.MissingCitations == nil {
		f.Citation.MissingCitations = []string{}
	}
	if f.TemplateSpecs.PageFormat == "" {
		f.TemplateSpecs = job.Specs
	}

	summary := domain.ScoreAudit(f)

	// Optional reshape (best effort): a failure here never fails the audit.
	if r.remediator != nil && len(input.Draft) > 0 {
		if rem, err := r.remediator.Remediate(ctx, input.Draft, input.Template); err != nil {
			log.Printf("[Audit] reshape skipped for %s: %v", job.AuditID, err)
		} else if rem != nil && len(rem.PDF) > 0 {
			key := domain.FixedLayoutPDFKey(job.AuditID)
			if err := r.storage.SaveFile(ctx, key, rem.PDF); err != nil {
				log.Printf("[Audit] could not store reshaped PDF for %s: %v", job.AuditID, err)
			} else {
				f.TemplateSpecs.FixedLayout = withFixedPDFKey(rem.FixedLayout, key)
			}
		}
	}

	var annotatedKey *string
	if len(out.AnnotatedPDF) > 0 {
		key := domain.AnnotatedPDFKey(job.AuditID)
		if err := r.storage.SaveFile(ctx, key, out.AnnotatedPDF); err != nil {
			// The report is still valuable without the visual proof.
			log.Printf("[Audit] could not store annotated PDF for %s: %v", job.AuditID, err)
		} else {
			annotatedKey = &key
		}
	}

	status := domain.StatusUnderDeskReview
	if summary.Status != domain.AuditStatusPass {
		status = domain.StatusPreCheckFailed
	}

	layout, _ := json.Marshal(f.Checks)
	citation, _ := json.Marshal(f.Citation)
	leaks, _ := json.Marshal(f.Leaks)
	specs, _ := json.Marshal(f.TemplateSpecs)
	summaryJSON, _ := json.Marshal(summary)

	return r.audits.SaveCompleted(ctx, job.AuditID, job.ManuscriptID, domain.CompletedAudit{
		Summary:          summary,
		LayoutIssues:     layout,
		CitationIssues:   citation,
		Anonymization:    leaks,
		TemplateSpecs:    specs,
		SummaryJSON:      summaryJSON,
		Engine:           out.Engine,
		AnnotatedKey:     annotatedKey,
		ManuscriptStatus: status,
	})
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "..."
}
