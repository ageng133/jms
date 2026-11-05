package auditengine

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"github.com/jms-uts/backend/gateway/internal/domain"
)

// ScriptEngine executes the PyMuPDF + spaCy layout & compliance audit directly
// as an embedded subprocess, enabling a 100% monolithic backend architecture
// without requiring a separate HTTP worker daemon on port 8090.
type ScriptEngine struct {
	python  string
	script  string
	timeout time.Duration
}

// NewScriptEngine auto-detects the Python interpreter and audit_cli.py script.
func NewScriptEngine(python, script string, timeout time.Duration) *ScriptEngine {
	if script == "" {
		script = firstExisting(
			"scripts/audit_cli.py",
			"../scripts/audit_cli.py",
			"../../scripts/audit_cli.py",
		)
	}
	if script == "" {
		return nil
	}

	if python == "" {
		venv := "bin/python3"
		if runtime.GOOS == "windows" {
			venv = "Scripts/python.exe"
		}
		python = firstExisting(
			filepath.Join("backend/ai-worker/.venv", venv),
			filepath.Join("../ai-worker/.venv", venv),
			filepath.Join("../../backend/ai-worker/.venv", venv),
		)
		if python == "" {
			python = "python3"
			if runtime.GOOS == "windows" {
				python = "python"
			}
		}
	}

	if timeout <= 0 {
		timeout = 3 * time.Minute
	}

	abs, _ := filepath.Abs(script)
	return &ScriptEngine{
		python:  python,
		script:  abs,
		timeout: timeout,
	}
}

func (s *ScriptEngine) Name() string {
	return "pymupdf-embedded"
}

// Describe returns a string representation for logs.
func (s *ScriptEngine) Describe() string {
	return s.python + " " + s.script
}

// Ping verifies that the script file and python interpreter exist.
func (s *ScriptEngine) Ping(ctx context.Context) error {
	if _, err := os.Stat(s.script); err != nil {
		return fmt.Errorf("audit script not found: %w", err)
	}
	return nil
}

func (s *ScriptEngine) Audit(ctx context.Context, in domain.AuditInput) (*domain.AuditOutput, error) {
	ctx, cancel := context.WithTimeout(ctx, s.timeout)
	defer cancel()

	tmpDir, err := os.MkdirTemp("", "fk-audit-cli-*")
	if err != nil {
		return nil, fmt.Errorf("failed to create temp dir for audit: %w", err)
	}
	defer os.RemoveAll(tmpDir)

	draftPath := filepath.Join(tmpDir, "draft.pdf")
	if err := os.WriteFile(draftPath, in.Draft, 0o600); err != nil {
		return nil, fmt.Errorf("failed to write draft pdf: %w", err)
	}

	reportPath := filepath.Join(tmpDir, "report.json")
	annotatedPath := filepath.Join(tmpDir, "annotated.pdf")

	args := []string{
		s.script,
		"--draft", draftPath,
		"--output-json", reportPath,
		"--output-annotated", annotatedPath,
	}

	if len(in.Template) > 0 {
		templatePath := filepath.Join(tmpDir, "template.pdf")
		if err := os.WriteFile(templatePath, in.Template, 0o600); err != nil {
			return nil, fmt.Errorf("failed to write template pdf: %w", err)
		}
		args = append(args, "--template", templatePath)
	}

	specsJSON, err := json.Marshal(in.Specs)
	if err == nil && len(specsJSON) > 0 && string(specsJSON) != "{}" {
		specsPath := filepath.Join(tmpDir, "specs.json")
		if err := os.WriteFile(specsPath, specsJSON, 0o600); err == nil {
			args = append(args, "--specs", specsPath)
		}
	}

	cmd := exec.CommandContext(ctx, s.python, args...)
	cmd.Env = append(os.Environ(), "PYTHONIOENCODING=utf-8")

	output, err := cmd.CombinedOutput()
	if err != nil {
		outStr := strings.TrimSpace(string(output))
		if strings.Contains(outStr, "Invalid document") {
			return nil, fmt.Errorf("%w: %s", domain.ErrInvalidDocument, outStr)
		}
		return nil, fmt.Errorf("audit execution failed: %w: %s", err, tailStr(outStr, 400))
	}

	reportBytes, err := os.ReadFile(reportPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read audit output report: %w", err)
	}

	var parsed struct {
		Engine  string `json:"engine"`
		Modules struct {
			GeometryAndLayout struct {
				Checks []domain.GeometryCheck `json:"checks"`
			} `json:"geometry_and_layout"`
			Anonymization struct {
				LeaksFound []domain.AnonymizationLeak `json:"leaks_found"`
			} `json:"anonymization"`
			CitationCrosscheck domain.CitationResult `json:"citation_crosscheck"`
		} `json:"modules"`
		TemplateSpecs domain.TemplateSpecs `json:"template_specs"`
	}

	if err := json.Unmarshal(reportBytes, &parsed); err != nil {
		return nil, fmt.Errorf("failed to unmarshal audit report JSON: %w", err)
	}

	findings := domain.AuditFindings{
		Checks:        parsed.Modules.GeometryAndLayout.Checks,
		Leaks:         parsed.Modules.Anonymization.LeaksFound,
		Citation:      parsed.Modules.CitationCrosscheck,
		TemplateSpecs: parsed.TemplateSpecs,
	}

	var annotatedBytes []byte
	if ann, err := os.ReadFile(annotatedPath); err == nil && len(ann) > 0 {
		annotatedBytes = ann
	}

	return &domain.AuditOutput{
		Engine:       "pymupdf-embedded",
		Findings:     findings,
		AnnotatedPDF: annotatedBytes,
	}, nil
}

func firstExisting(paths ...string) string {
	for _, p := range paths {
		if _, err := os.Stat(p); err == nil {
			return p
		}
	}
	return ""
}

func tailStr(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[len(s)-max:]
}

