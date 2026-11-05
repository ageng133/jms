package ai

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/jms-uts/backend/gateway/config"
	"github.com/jms-uts/backend/gateway/internal/domain"
)

// Gemini inline data is limited to ~20 MB per request (base64 inflates by 4/3).
const maxInlineBytes = 14 << 20

// GeminiEngine audits a manuscript with Google Gemini multimodal PDF input.
// It is used as a fallback when the PyMuPDF worker is unavailable. It cannot
// produce an annotated PDF and its bounding boxes are approximate.
type GeminiEngine struct {
	cfg        *config.GoogleAIConfig
	httpClient *http.Client
}

func NewGeminiEngine(cfg *config.GoogleAIConfig) *GeminiEngine {
	return &GeminiEngine{cfg: cfg, httpClient: &http.Client{Timeout: 120 * time.Second}}
}

func (g *GeminiEngine) Name() string { return "gemini:" + g.model() }

func (g *GeminiEngine) model() string {
	if g.cfg.Model == "" {
		return "gemini-2.5-flash"
	}
	return g.cfg.Model
}

type geminiFindings struct {
	GeometryAndLayout struct {
		Checks []domain.GeometryCheck `json:"checks"`
	} `json:"geometry_and_layout"`
	Anonymization struct {
		LeaksFound []domain.AnonymizationLeak `json:"leaks_found"`
	} `json:"anonymization"`
	CitationCrosscheck domain.CitationResult `json:"citation_crosscheck"`
	TemplateSpecs      *domain.TemplateSpecs `json:"template_specs"`
}

func (g *GeminiEngine) Audit(ctx context.Context, in domain.AuditInput) (*domain.AuditOutput, error) {
	if g.cfg.APIKey == "" {
		return nil, errors.New("gemini is not configured (GEMINI_API_KEY missing)")
	}
	if len(in.Draft)+len(in.Template) > maxInlineBytes {
		return nil, fmt.Errorf("files too large for Gemini inline upload (%d MB max)", maxInlineBytes>>20)
	}

	specsJSON, _ := json.MarshalIndent(in.Specs, "", "  ")
	hasTemplate := len(in.Template) > 0

	prompt := fmt.Sprintf(`You are the pre-submission format auditor of an academic Journal Management System.
Audit the MANUSCRIPT PDF (first attached file).%s

Reference layout (use it when no template PDF is attached, otherwise prefer what you measure from the template):
%s

Perform exactly three checks and report ONLY real, observed problems (empty arrays when there are none):
1. geometry_and_layout: page size, margins (mm) and column count of the manuscript versus the reference.
   One entry per distinct problem with rule in {PAGE_DIMENSIONS, MARGIN_TOP, MARGIN_BOTTOM, MARGIN_LEFT, MARGIN_RIGHT, COLUMN_LAYOUT},
   expected/actual as short strings, passed=false, 1-based page, bbox [x0,y0,x1,y1] in PDF points (approximate is fine).
2. anonymization (double-blind): author names, affiliations, emails, ORCID iDs, funding/grant numbers that reveal identity.
   type in {EMAIL, ORCID, NER_PERSON, NER_ORG, FUNDING_LEAK}.
3. citation_crosscheck: numeric inline citations vs the References section.
   missing_citations: cited but not listed, e.g. "[7]". uncited_references: listed but never cited, e.g. "[4] Author, Title...".

Respond with ONE JSON object and nothing else:
{
  "geometry_and_layout": {"checks": []},
  "anonymization": {"leaks_found": []},
  "citation_crosscheck": {"pass": true, "total_cited": 0, "uncited_references": [], "missing_citations": []},
  "template_specs": %s
}`,
		map[bool]string{true: "\nThe second attached file is the journal's official TEMPLATE PDF: measure its page size, margins and column layout and use them as the target.", false: ""}[hasTemplate],
		string(specsJSON),
		string(specsJSON),
	)

	parts := []map[string]interface{}{
		{"text": prompt},
		{"inlineData": map[string]string{"mimeType": "application/pdf", "data": base64.StdEncoding.EncodeToString(in.Draft)}},
	}
	if hasTemplate {
		parts = append(parts, map[string]interface{}{
			"inlineData": map[string]string{"mimeType": "application/pdf", "data": base64.StdEncoding.EncodeToString(in.Template)},
		})
	}

	payload, _ := json.Marshal(map[string]interface{}{
		"contents": []map[string]interface{}{{"role": "user", "parts": parts}},
		"generationConfig": map[string]interface{}{
			"responseMimeType": "application/json",
			"temperature":      0,
		},
	})

	endpoint := fmt.Sprintf("%s/models/%s:generateContent", strings.TrimRight(g.cfg.BaseURL, "/"), g.model())
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(payload))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-goog-api-key", g.cfg.APIKey) // keep the key out of URLs/logs

	resp, err := g.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("gemini request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		msg, _ := io.ReadAll(io.LimitReader(resp.Body, 2048))
		return nil, fmt.Errorf("gemini returned status %d: %s", resp.StatusCode, strings.TrimSpace(string(msg)))
	}

	var gr struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&gr); err != nil {
		return nil, fmt.Errorf("decode gemini response: %w", err)
	}
	if len(gr.Candidates) == 0 || len(gr.Candidates[0].Content.Parts) == 0 {
		return nil, errors.New("empty response from gemini")
	}

	findings, err := parseGeminiFindings(gr.Candidates[0].Content.Parts[0].Text)
	if err != nil {
		return nil, err
	}

	specs := in.Specs
	if hasTemplate && findings.TemplateSpecs != nil && findings.TemplateSpecs.PageWidthMm > 0 {
		specs = *findings.TemplateSpecs
		specs.IsCustomTemplate = true
		specs.Source = "uploaded_template"
		if specs.Name == "" {
			specs.Name = "Uploaded journal template"
		}
	}

	return &domain.AuditOutput{
		Engine: g.Name(),
		Findings: domain.AuditFindings{
			Checks:        findings.GeometryAndLayout.Checks,
			Leaks:         findings.Anonymization.LeaksFound,
			Citation:      findings.CitationCrosscheck,
			TemplateSpecs: specs,
		},
	}, nil
}

// parseGeminiFindings tolerates ```json fences and normalises the output so a
// sloppy model answer cannot break the report contract.
func parseGeminiFindings(text string) (*geminiFindings, error) {
	text = strings.TrimSpace(text)
	text = strings.TrimPrefix(text, "```json")
	text = strings.TrimPrefix(text, "```")
	text = strings.TrimSuffix(text, "```")

	var f geminiFindings
	if err := json.Unmarshal([]byte(strings.TrimSpace(text)), &f); err != nil {
		return nil, fmt.Errorf("gemini returned invalid JSON: %w", err)
	}

	checks := f.GeometryAndLayout.Checks[:0]
	for _, c := range f.GeometryAndLayout.Checks {
		if c.Rule == "" || c.Passed {
			continue // only keep real failures
		}
		if len(c.Bbox) != 4 {
			c.Bbox = []int{0, 0, 0, 0}
		}
		if c.Page < 1 {
			c.Page = 1
		}
		checks = append(checks, c)
	}
	f.GeometryAndLayout.Checks = checks

	for i := range f.Anonymization.LeaksFound {
		if f.Anonymization.LeaksFound[i].Page < 1 {
			f.Anonymization.LeaksFound[i].Page = 1
		}
	}
	c := &f.CitationCrosscheck
	if c.UncitedReferences == nil {
		c.UncitedReferences = []string{}
	}
	if c.MissingCitations == nil {
		c.MissingCitations = []string{}
	}
	c.Pass = len(c.UncitedReferences) == 0 && len(c.MissingCitations) == 0
	return &f, nil
}
