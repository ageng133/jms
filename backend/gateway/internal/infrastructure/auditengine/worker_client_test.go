package auditengine

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/jms-uts/backend/gateway/internal/domain"
)

func TestWorkerClient_Audit(t *testing.T) {
	var gotSpecs domain.TemplateSpecs
	var gotTemplate, gotToken string

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/audit" {
			http.NotFound(w, r)
			return
		}
		gotToken = r.Header.Get("X-Worker-Token")
		if err := r.ParseMultipartForm(1 << 20); err != nil {
			t.Fatal(err)
		}
		_ = json.Unmarshal([]byte(r.FormValue("template_specs")), &gotSpecs)
		if f, _, err := r.FormFile("template"); err == nil {
			b, _ := io.ReadAll(f)
			gotTemplate = string(b)
		}

		_ = json.NewEncoder(w).Encode(map[string]any{
			"report": map[string]any{
				"engine": "pymupdf-worker",
				"modules": map[string]any{
					"geometry_and_layout": map[string]any{"pass": false, "checks": []map[string]any{
						{"rule": "MARGIN_TOP", "expected": "19.0mm", "actual": "5.0mm", "passed": false, "page": 1, "bbox": []int{1, 2, 3, 4}},
					}},
					"anonymization":       map[string]any{"pass": true, "leaks_found": []any{}},
					"citation_crosscheck": map[string]any{"pass": false, "total_cited": 2, "uncited_references": []string{}, "missing_citations": []string{"[3]"}},
				},
				"template_specs": map[string]any{"page_format": "A4", "page_width_mm": 210, "source": "uploaded_template"},
			},
			"annotated_pdf_base64": base64.StdEncoding.EncodeToString([]byte("%PDF-annotated")),
		})
	}))
	defer srv.Close()

	c := NewWorkerClient(srv.URL, "s3cret", 5*time.Second)
	out, err := c.Audit(context.Background(), domain.AuditInput{
		Draft:    []byte("%PDF-draft"),
		Template: []byte("%PDF-template"),
		Specs:    domain.TemplateSpecs{PageFormat: "A4", Name: "IEEE"},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if gotToken != "s3cret" || gotTemplate != "%PDF-template" || gotSpecs.Name != "IEEE" {
		t.Errorf("request not built correctly: token=%q template=%q specs=%+v", gotToken, gotTemplate, gotSpecs)
	}
	if len(out.Findings.Checks) != 1 || out.Findings.Checks[0].Rule != "MARGIN_TOP" {
		t.Errorf("checks not decoded: %+v", out.Findings.Checks)
	}
	if out.Findings.Citation.MissingCitations[0] != "[3]" || out.Findings.TemplateSpecs.Source != "uploaded_template" {
		t.Errorf("findings not decoded: %+v", out.Findings)
	}
	if string(out.AnnotatedPDF) != "%PDF-annotated" {
		t.Errorf("annotated pdf not decoded: %q", out.AnnotatedPDF)
	}
}

func TestWorkerClient_Errors(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnprocessableEntity)
		_, _ = w.Write([]byte(`{"detail":"Manuscript PDF is password protected"}`))
	}))
	defer srv.Close()

	_, err := NewWorkerClient(srv.URL, "", time.Second).Audit(context.Background(), domain.AuditInput{Draft: []byte("x")})
	if !errors.Is(err, domain.ErrInvalidDocument) {
		t.Errorf("expected ErrInvalidDocument, got %v", err)
	}

	_, err = NewWorkerClient("http://127.0.0.1:1", "", time.Second).Audit(context.Background(), domain.AuditInput{Draft: []byte("x")})
	if err == nil || errors.Is(err, domain.ErrInvalidDocument) {
		t.Errorf("expected a retryable connection error, got %v", err)
	}
}

func TestWorkerClient_Ping(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/healthz" {
			w.WriteHeader(http.StatusNotFound)
			return
		}
		_, _ = w.Write([]byte(`{"status":"HEALTHY"}`))
	}))
	if err := NewWorkerClient(srv.URL, "", time.Second).Ping(context.Background()); err != nil {
		t.Errorf("expected healthy worker, got %v", err)
	}
	srv.Close()
	if err := NewWorkerClient(srv.URL, "", time.Second).Ping(context.Background()); err == nil {
		t.Error("expected error for unreachable worker")
	}
}
