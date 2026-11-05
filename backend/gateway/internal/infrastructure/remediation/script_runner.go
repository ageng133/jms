// Package remediation runs the team's layout reshape script
// (scripts/remediate_pdf.py) to produce a camera-ready copy of a draft.
package remediation

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"time"

	"github.com/jms-uts/backend/gateway/internal/domain"
)

// ScriptRunner implements domain.Remediator by invoking remediate_pdf.py.
type ScriptRunner struct {
	python  string
	script  string
	timeout time.Duration
}

// NewScriptRunner resolves the interpreter and script. Empty values are
// auto-detected relative to the working directory (gateway or repo root).
// It returns nil when the script cannot be found, which disables reshaping.
func NewScriptRunner(python, script string, timeout time.Duration) *ScriptRunner {
	if script == "" {
		script = firstExisting(
			"scripts/remediate_pdf.py",
			"../scripts/remediate_pdf.py",
			"../../scripts/remediate_pdf.py",
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
		timeout = 2 * time.Minute
	}
	abs, _ := filepath.Abs(script)
	return &ScriptRunner{python: python, script: abs, timeout: timeout}
}

// Describe returns "python script" for startup logging.
func (s *ScriptRunner) Describe() string { return s.python + " " + s.script }

func (s *ScriptRunner) Remediate(ctx context.Context, draft, template []byte) (*domain.Remediation, error) {
	ctx, cancel := context.WithTimeout(ctx, s.timeout)
	defer cancel()

	dir, err := os.MkdirTemp("", "fk-reshape-")
	if err != nil {
		return nil, err
	}
	defer os.RemoveAll(dir)

	in := filepath.Join(dir, "draft.pdf")
	out := filepath.Join(dir, "fixed.pdf")
	report := filepath.Join(dir, "report.json")
	if err := os.WriteFile(in, draft, 0o600); err != nil {
		return nil, err
	}
	args := []string{s.script, "--input", in, "--output", out, "--json-output", report}
	if len(template) > 0 {
		tpl := filepath.Join(dir, "template.pdf")
		if err := os.WriteFile(tpl, template, 0o600); err != nil {
			return nil, err
		}
		args = append(args, "--template", tpl)
	}

	cmd := exec.CommandContext(ctx, s.python, args...)
	cmd.Env = append(os.Environ(), "PYTHONIOENCODING=utf-8") // the script prints emoji
	if output, err := cmd.CombinedOutput(); err != nil {
		return nil, fmt.Errorf("reshape script failed: %w: %s", err, tail(string(output), 400))
	}

	pdf, err := os.ReadFile(out)
	if err != nil {
		return nil, fmt.Errorf("reshape produced no PDF: %w", err)
	}

	// Only the fixed_layout block is used; the script's own score/summary are
	// placeholders and must not override the real audit.
	var parsed struct {
		FixedLayout json.RawMessage `json:"fixed_layout"`
	}
	if raw, err := os.ReadFile(report); err == nil {
		_ = json.Unmarshal(raw, &parsed)
	}
	return &domain.Remediation{PDF: pdf, FixedLayout: parsed.FixedLayout}, nil
}

func firstExisting(paths ...string) string {
	for _, p := range paths {
		if st, err := os.Stat(p); err == nil && !st.IsDir() {
			return p
		}
	}
	return ""
}

func tail(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[len(s)-n:]
}
