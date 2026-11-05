package domain

import (
	"context"
	"encoding/json"

	"github.com/google/uuid"
)

// ---------------------------------------------------------------------------
// Audit findings (shared JSON contract with the Python worker and the frontend)
// ---------------------------------------------------------------------------

type GeometryCheck struct {
	Rule     string `json:"rule"`
	Expected string `json:"expected"`
	Actual   string `json:"actual"`
	Passed   bool   `json:"passed"`
	Page     int    `json:"page"`
	Bbox     []int  `json:"bbox"`
}

type AnonymizationLeak struct {
	Type string `json:"type"`
	Leak string `json:"leak"`
	Page int    `json:"page"`
}

type CitationResult struct {
	Pass              bool     `json:"pass"`
	TotalCited        int      `json:"total_cited"`
	UncitedReferences []string `json:"uncited_references"`
	MissingCitations  []string `json:"missing_citations"`
}

type AuditFindings struct {
	Checks        []GeometryCheck     `json:"checks"`
	Leaks         []AnonymizationLeak `json:"leaks_found"`
	Citation      CitationResult      `json:"citation"`
	TemplateSpecs TemplateSpecs       `json:"template_specs"`
}

type AuditSummary struct {
	OverallScore   int    `json:"overall_score"`
	CriticalErrors int    `json:"critical_errors"`
	Warnings       int    `json:"warnings"`
	Status         string `json:"status"` // PASS | FAIL
}

// Scoring constants. Mirrored in backend/ai-worker/app/scoring.py.
const (
	criticalPenalty    = 15
	warningPenalty     = 5
	maxWarningsForPass = 2
	AuditStatusPass    = "PASS"
	AuditStatusFail    = "FAIL"
)

// ScoreAudit is the single scoring rule used for every engine:
// critical errors = distinct failed layout rules, warnings = leaks + citation
// problems, score = 100 - 15*critical - 5*warnings (clamped), PASS iff no
// critical errors and at most 2 warnings.
func ScoreAudit(f AuditFindings) AuditSummary {
	failedRules := map[string]bool{}
	for _, c := range f.Checks {
		if !c.Passed {
			failedRules[c.Rule] = true
		}
	}
	critical := len(failedRules)
	warnings := len(f.Leaks) + len(f.Citation.UncitedReferences) + len(f.Citation.MissingCitations)

	score := 100 - critical*criticalPenalty - warnings*warningPenalty
	if score < 0 {
		score = 0
	}
	if score > 100 {
		score = 100
	}

	status := AuditStatusFail
	if critical == 0 && warnings <= maxWarningsForPass {
		status = AuditStatusPass
	}
	return AuditSummary{OverallScore: score, CriticalErrors: critical, Warnings: warnings, Status: status}
}

// ---------------------------------------------------------------------------
// Engines and jobs
// ---------------------------------------------------------------------------

// AuditInput is everything an engine needs; engines never touch DB or storage.
type AuditInput struct {
	Draft    []byte
	Template []byte        // optional uploaded template PDF
	Specs    TemplateSpecs // preset used when no template PDF is supplied
}

type AuditOutput struct {
	Engine       string
	Findings     AuditFindings
	AnnotatedPDF []byte // optional
}

// AuditEngine analyses a manuscript (PyMuPDF worker, Gemini, ...).
type AuditEngine interface {
	Name() string
	Audit(ctx context.Context, in AuditInput) (*AuditOutput, error)
}

// EnginePinger is optionally implemented by engines that can report liveness
// cheaply (e.g. the PyMuPDF worker's /healthz). Engines without it are
// reported as "configured".
type EnginePinger interface {
	Ping(ctx context.Context) error
}

// EngineStatus is the liveness of one configured audit engine.
type EngineStatus struct {
	Name   string `json:"name"`
	Status string `json:"status"` // "online" | "offline" | "configured"
}

// AuditJob is one queued pre-submission audit.
type AuditJob struct {
	AuditID      uuid.UUID
	ManuscriptID uuid.UUID
	DraftKey     string
	TemplateKey  string
	Specs        TemplateSpecs
}

// AIAuditor runs an audit job end to end (load files, run engines, persist).
type AIAuditor interface {
	AuditManuscript(ctx context.Context, job AuditJob) error
}

// CompletedAudit is what gets persisted when an audit finishes.
type CompletedAudit struct {
	Summary          AuditSummary
	LayoutIssues     json.RawMessage
	CitationIssues   json.RawMessage
	Anonymization    json.RawMessage
	TemplateSpecs    json.RawMessage
	SummaryJSON      json.RawMessage
	Engine           string
	AnnotatedKey     *string
	ManuscriptStatus ManuscriptStatus
}

// Remediation is the optional "reshape" step run after a successful audit: a
// copy of the draft re-laid-out to the template geometry plus a description of
// what was changed. It never changes the audit score.
type Remediation struct {
	PDF         []byte
	FixedLayout json.RawMessage // {"target_format", "target_margins_mm", "remediation_actions", ...}
}

// Remediator produces a reshaped, camera-ready copy of the draft.
type Remediator interface {
	Remediate(ctx context.Context, draft, template []byte) (*Remediation, error)
}

// FixedLayoutPDFKey is the storage key of an audit's reshaped (fixed layout) PDF.
func FixedLayoutPDFKey(auditID uuid.UUID) string {
	return StoragePrefixAudits + "/" + auditID.String() + "_fixed_layout.pdf"
}

// AnnotatedPDFKey is the storage key of an audit's annotated PDF.
func AnnotatedPDFKey(auditID uuid.UUID) string {
	return StoragePrefixAudits + "/annotated_" + auditID.String() + ".pdf"
}
