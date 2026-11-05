package ai

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/jms-uts/backend/gateway/config"
	"github.com/jms-uts/backend/gateway/internal/domain"
)

func TestParseGeminiFindings_NormalisesOutput(t *testing.T) {
	raw := "```json\n" + `{
	  "geometry_and_layout": {"checks": [
	    {"rule": "MARGIN_TOP", "expected": "19mm", "actual": "8mm", "passed": false, "page": 0},
	    {"rule": "MARGIN_LEFT", "passed": true, "page": 1, "bbox": [1,2,3,4]}
	  ]},
	  "anonymization": {"leaks_found": [{"type": "EMAIL", "leak": "a@b.edu", "page": 0}]},
	  "citation_crosscheck": {"pass": true, "total_cited": 3, "missing_citations": ["[9]"]}
	}` + "\n```"

	f, err := parseGeminiFindings(raw)
	if err != nil {
		t.Fatal(err)
	}
	if len(f.GeometryAndLayout.Checks) != 1 {
		t.Fatalf("passed checks must be dropped, got %+v", f.GeometryAndLayout.Checks)
	}
	c := f.GeometryAndLayout.Checks[0]
	if c.Page != 1 || len(c.Bbox) != 4 {
		t.Errorf("check not normalised: %+v", c)
	}
	if f.Anonymization.LeaksFound[0].Page != 1 {
		t.Error("leak page not normalised")
	}
	if f.CitationCrosscheck.Pass || f.CitationCrosscheck.UncitedReferences == nil {
		t.Errorf("citation pass must be recomputed: %+v", f.CitationCrosscheck)
	}

	if _, err := parseGeminiFindings("not json"); err == nil {
		t.Error("expected error for invalid JSON")
	}
}

func TestGeminiEngine_SendsTemplateAndKeyInHeader(t *testing.T) {
	var parts int
	var keyHeader, query string

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		keyHeader = r.Header.Get("x-goog-api-key")
		query = r.URL.RawQuery
		body, _ := io.ReadAll(r.Body)
		var req struct {
			Contents []struct {
				Parts []json.RawMessage `json:"parts"`
			} `json:"contents"`
		}
		_ = json.Unmarshal(body, &req)
		parts = len(req.Contents[0].Parts)

		answer := `{"geometry_and_layout":{"checks":[]},"anonymization":{"leaks_found":[]},` +
			`"citation_crosscheck":{"pass":true,"total_cited":1,"uncited_references":[],"missing_citations":[]},` +
			`"template_specs":{"page_format":"Letter","page_width_mm":215.9,"page_height_mm":279.4,"column_count":2}}`
		_ = json.NewEncoder(w).Encode(map[string]any{
			"candidates": []any{map[string]any{"content": map[string]any{"parts": []any{map[string]any{"text": answer}}}}},
		})
	}))
	defer srv.Close()

	g := NewGeminiEngine(&config.GoogleAIConfig{APIKey: "k3y", Model: "gemini-test", BaseURL: srv.URL})
	out, err := g.Audit(context.Background(), domain.AuditInput{
		Draft: []byte("%PDF-draft"), Template: []byte("%PDF-template"),
		Specs: domain.TemplateSpecs{PageFormat: "A4"},
	})
	if err != nil {
		t.Fatal(err)
	}
	if parts != 3 {
		t.Errorf("expected prompt + draft + template parts, got %d", parts)
	}
	if keyHeader != "k3y" || strings.Contains(query, "k3y") {
		t.Errorf("API key must be sent in header only (header=%q query=%q)", keyHeader, query)
	}
	if out.Findings.TemplateSpecs.PageFormat != "Letter" || out.Findings.TemplateSpecs.Source != "uploaded_template" {
		t.Errorf("template specs from the uploaded template not used: %+v", out.Findings.TemplateSpecs)
	}
	if out.AnnotatedPDF != nil {
		t.Error("gemini engine does not produce annotated PDFs")
	}
}

func TestGeminiEngine_NotConfigured(t *testing.T) {
	g := NewGeminiEngine(&config.GoogleAIConfig{})
	if _, err := g.Audit(context.Background(), domain.AuditInput{Draft: []byte("x")}); err == nil {
		t.Error("expected error without API key")
	}
}
