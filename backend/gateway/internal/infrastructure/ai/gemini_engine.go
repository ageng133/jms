package ai

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/jms-uts/backend/gateway/config"
	"github.com/jms-uts/backend/gateway/internal/domain"
)

// Gemini inline data is limited to ~20 MB per request (base64 inflates by 4/3).
const maxInlineBytes = 14 << 20

// GeminiEngine audits a manuscript with Google Gemini multimodal PDF input.
// It leverages an Agentic Fan-Out (Map-Reduce) architecture:
// - Specialist Agent 1 (Typography & Geometry SLM): Margins, column count, font sizes, line spacing, page dimensions.
// - Specialist Agent 2 (Academic Context & Integrity SLM): Double-blind leaks, section coherence, citation crosscheck.
// - Reducer Node: Synthesizes both reports into a non-conflicting, structured domain.AuditOutput.
type GeminiEngine struct {
	cfg        *config.GoogleAIConfig
	httpClient *http.Client
}

func NewGeminiEngine(cfg *config.GoogleAIConfig) *GeminiEngine {
	return &GeminiEngine{cfg: cfg, httpClient: &http.Client{Timeout: 120 * time.Second}}
}

func (g *GeminiEngine) Name() string { return "gemini:" + g.model() }

func (g *GeminiEngine) model() string {
	if g.cfg == nil || g.cfg.Model == "" {
		return "gemini-3.5-flash"
	}
	return g.cfg.Model
}

func (g *GeminiEngine) baseURL() string {
	if g.cfg == nil || g.cfg.BaseURL == "" {
		return "https://generativelanguage.googleapis.com/v1beta"
	}
	return g.cfg.BaseURL
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

// typographyFindings captures Agent 1's geometric and typographic measurements.
type typographyFindings struct {
	Checks        []domain.GeometryCheck `json:"checks"`
	TemplateSpecs *domain.TemplateSpecs  `json:"template_specs"`
}

// contextFindings captures Agent 2's academic semantics, anonymization leaks, and citation rigor.
type contextFindings struct {
	AnonymizationLeaks []domain.AnonymizationLeak `json:"anonymization_leaks"`
	CitationCrosscheck domain.CitationResult      `json:"citation_crosscheck"`
	SectionCoherence   struct {
		RequiredSectionsInTemplate []string `json:"required_sections_in_template"`
		MissingRequiredSections    []string `json:"missing_required_sections"`
		AcademicLevel              string   `json:"academic_level"`
		RigorAssessment            string   `json:"rigor_assessment"`
	} `json:"section_coherence"`
}

func (g *GeminiEngine) Audit(ctx context.Context, in domain.AuditInput) (*domain.AuditOutput, error) {
	apiKey := ""
	if g.cfg != nil {
		apiKey = g.cfg.APIKey
	}
	if apiKey == "" {
		apiKey = os.Getenv("GEMINI_API_KEY")
		if apiKey == "" {
			apiKey = os.Getenv("GOOGLE_AI_APIKEY")
		}
		if apiKey == "" {
			apiKey = os.Getenv("GOOGLE_API_KEY")
		}
		if g.cfg != nil {
			g.cfg.APIKey = apiKey
		}
	}

	if apiKey == "" {
		return nil, errors.New("gemini is not configured (GEMINI_API_KEY or GOOGLE_AI_APIKEY missing)")
	}
	if len(in.Draft)+len(in.Template) > maxInlineBytes {
		return nil, fmt.Errorf("files too large for Gemini inline upload (%d MB max)", maxInlineBytes>>20)
	}

	// -------------------------------------------------------------------------
	// AGENTIC FAN-OUT: Concurrent Specialist SLM Execution
	// -------------------------------------------------------------------------
	var (
		wg         sync.WaitGroup
		agent1Out  *typographyFindings
		agent1Err  error
		agent2Out  *contextFindings
		agent2Err  error
	)

	wg.Add(2)
	go func() {
		defer wg.Done()
		agent1Out, agent1Err = g.auditTypographyGeometryAgent(ctx, apiKey, in)
	}()

	go func() {
		defer wg.Done()
		agent2Out, agent2Err = g.auditContextIntegrityAgent(ctx, apiKey, in)
	}()

	wg.Wait()

	// If both agents failed, return unified error
	if agent1Err != nil && agent2Err != nil {
		return nil, fmt.Errorf("both audit agents failed: layout=%v, context=%v", agent1Err, agent2Err)
	}

	// -------------------------------------------------------------------------
	// REDUCER NODE: Consolidate & Synthesize Multi-Agent Findings
	// -------------------------------------------------------------------------
	combinedChecks := make([]domain.GeometryCheck, 0)
	specs := in.Specs

	// 1. Ingest Typography & Geometry Agent results
	if agent1Out != nil {
		combinedChecks = append(combinedChecks, agent1Out.Checks...)
		if len(in.Template) > 0 && agent1Out.TemplateSpecs != nil && agent1Out.TemplateSpecs.PageWidthMm > 0 {
			specs = *agent1Out.TemplateSpecs
			specs.IsCustomTemplate = true
			specs.Source = "uploaded_template"
			if specs.Name == "" {
				if specs.RunningHeader != "" {
					specs.Name = specs.RunningHeader
				} else {
					specs.Name = "Uploaded Journal Template"
				}
			}
		}
	} else if agent1Err != nil {
		log.Printf("[GeminiEngine] Typography specialist warning: %v", agent1Err)
	}

	// 2. Ingest Context & Academic Rigor Agent results
	leaks := make([]domain.AnonymizationLeak, 0)
	var citation domain.CitationResult

	if agent2Out != nil {
		leaks = append(leaks, agent2Out.AnonymizationLeaks...)
		citation = agent2Out.CitationCrosscheck

		if len(agent2Out.SectionCoherence.RequiredSectionsInTemplate) > 0 {
			specs.RequiredSections = agent2Out.SectionCoherence.RequiredSectionsInTemplate
		}

		// If missing core academic sections detected, convert to a structural check
		if len(agent2Out.SectionCoherence.MissingRequiredSections) > 0 {
			missingStr := strings.Join(agent2Out.SectionCoherence.MissingRequiredSections, ", ")
			combinedChecks = append(combinedChecks, domain.GeometryCheck{
				Rule:     "SECTION_STRUCTURE",
				Expected: "Struktur seksi template jurnal (" + strings.Join(specs.RequiredSections, ", ") + ")",
				Actual:   fmt.Sprintf("Missing required sections: %s", missingStr),
				Passed:   false,
				Page:     1,
				Bbox:     []int{0, 0, 0, 0},
			})
		}
	} else if agent2Err != nil {
		log.Printf("[GeminiEngine] Context specialist warning: %v", agent2Err)
	}

	return &domain.AuditOutput{
		Engine: g.Name() + " (agentic-swarm:typography+context)",
		Findings: domain.AuditFindings{
			Checks:        combinedChecks,
			Leaks:         leaks,
			Citation:      citation,
			TemplateSpecs: specs,
		},
	}, nil
}

// auditTypographyGeometryAgent executes Agent 1 (Font, Spacing, Columns, Margins, Dimensions).
func (g *GeminiEngine) auditTypographyGeometryAgent(ctx context.Context, apiKey string, in domain.AuditInput) (*typographyFindings, error) {
	specsJSON, _ := json.MarshalIndent(in.Specs, "", "  ")
	hasTemplate := len(in.Template) > 0

	prompt := fmt.Sprintf(`You are the Typography, Layout, Font, Spacing, and Geometry Specialist Agent in an academic publishing system.
Compare DOCUMENT 1 (Author Manuscript Draft) against DOCUMENT 2 (Target Journal Template / Guidelines).%s

Reference layout preset (use ONLY if Document 2 is not attached, otherwise you MUST extract and prioritize measurements from Document 2):
%s

CRITICAL INSTRUCTIONS:
When Document 2 (Target Journal Template) is attached:
1. Extract the ground truth target layout specifications DIRECTLY from Document 2:
   - Page dimensions: width and height in mm (A4 210x297mm vs Letter 215.9x279.4mm).
   - Margins: top, bottom, left, right in mm.
   - Column layout: count (1 or 2 columns), column width, column gap in mm.
   - Typography:
     * font_family: dominant font family (e.g. Times New Roman, Helvetica, Arial).
     * body_font_size_pt: font size for normal body paragraphs (e.g. 9.5, 10, 11).
     * title_font_size_pt: font size for paper title (e.g. 16, 18, 24).
     * heading_font_size_pt: font size for major section headings (e.g. 10, 11, 12).
     * line_spacing: line spacing (single, 1.15, 1.5, double) and line height in pt.
     * text_alignment: text alignment for body paragraphs ("justify" or "left").
     * running_header: header text appearing at top of pages.
2. Measure DOCUMENT 1 (Author Manuscript Draft) and report real divergences against Document 2.

Respond with ONE JSON object and nothing else:
{
  "agent": "typography_geometry_specialist",
  "checks": [
    {
      "rule": "COLUMN_LAYOUT | MARGIN_TOP | MARGIN_BOTTOM | MARGIN_LEFT | MARGIN_RIGHT | FONT_SIZE_BODY | FONT_SIZE_HEADING | FONT_FAMILY | LINE_SPACING | TEXT_ALIGNMENT | PAGE_DIMENSIONS",
      "expected": "expected spec from template (e.g. '2 Kolom (6.35mm gap)', '18mm Left Margin', 'Times New Roman 9.5pt Justified')",
      "actual": "measured value in manuscript (e.g. '1 Kolom', '25mm Left Margin', 'Helvetica 12pt Left-aligned')",
      "passed": false,
      "page": 1,
      "bbox": [0, 0, 0, 0]
    }
  ],
  "template_specs": {
    "page_format": "A4",
    "page_width_mm": 210,
    "page_height_mm": 297,
    "margin_top_mm": 20,
    "margin_bottom_mm": 20,
    "margin_left_mm": 18,
    "margin_right_mm": 18,
    "column_count": 2,
    "column_gap_mm": 6.35,
    "font_family": "Times New Roman",
    "body_font_size_pt": 9.5,
    "title_font_size_pt": 16.0,
    "heading_font_size_pt": 10.0,
    "line_spacing": "1.15",
    "line_height_pt": 11.5,
    "text_alignment": "justify",
    "running_header": "JOURNAL NAME / PUBLICATION TITLE",
    "is_custom_template": true
  }
}`,
		map[bool]string{true: "\nDocument 2 is the journal's official TEMPLATE PDF: you MUST extract page size, margins, columns, font family, font size, spacing, text alignment, and running header directly from Document 2.", false: ""}[hasTemplate],
		string(specsJSON),
	)

	respText, err := g.callGeminiMultimodal(ctx, apiKey, prompt, in)
	if err != nil {
		return nil, err
	}

	return parseTypographyFindings(respText)
}

// auditContextIntegrityAgent executes Agent 2 (Academic Context, Double-Blind Integrity & Citations).
func (g *GeminiEngine) auditContextIntegrityAgent(ctx context.Context, apiKey string, in domain.AuditInput) (*contextFindings, error) {
	hasTemplate := len(in.Template) > 0

	prompt := fmt.Sprintf(`You are the Academic Context, Double-Blind Integrity, Structure & Citation Specialist Agent.
Compare DOCUMENT 1 (Author Manuscript Draft) against DOCUMENT 2 (Target Journal Template / Guidelines).%s

Focus strictly on content integrity, structural sections (Daftar Isi), and academic rigor:
1. Double-blind anonymization: Author names, emails, affiliations, acknowledgments, grant/funding disclosures that reveal author identity.
2. Citation cross-referencing: numeric or author-year citations in body text vs references section (identify uncited references and missing citations).
3. Section structure & Table of Contents (Daftar Isi):
   - Extract the required sections from Document 2 (e.g. Abstract, Keywords, Introduction, Methods, Results, Discussion, Conclusion, References).
   - Check which of these required sections are present or missing in Document 1.
4. Academic tone & rigor assessment.

Respond with ONE JSON object and nothing else:
{
  "agent": "context_integrity_specialist",
  "anonymization_leaks": [
    {
      "type": "NER_PERSON | NER_ORG | EMAIL | ORCID | FUNDING_LEAK",
      "leak": "exact text leaking identity",
      "page": 1
    }
  ],
  "citation_crosscheck": {
    "pass": false,
    "total_cited": 0,
    "uncited_references": [],
    "missing_citations": []
  },
  "section_coherence": {
    "required_sections_in_template": ["Abstract", "Keywords", "Introduction", "Methods", "Results", "Discussion", "Conclusion", "References"],
    "missing_required_sections": [],
    "academic_level": "JOURNAL_ARTICLE",
    "rigor_assessment": "brief context assessment"
  }
}`,
		map[bool]string{true: "\nDocument 2 is the journal's official TEMPLATE PDF: extract the journal context, required section headings (Table of Contents), and double-blind rules from Document 2.", false: ""}[hasTemplate],
	)

	respText, err := g.callGeminiMultimodal(ctx, apiKey, prompt, in)
	if err != nil {
		return nil, err
	}

	return parseContextFindings(respText)
}

// callGeminiMultimodal handles the HTTP payload assembly and invocation to Gemini 3.5 Flash.
func (g *GeminiEngine) callGeminiMultimodal(ctx context.Context, apiKey string, prompt string, in domain.AuditInput) (string, error) {
	parts := []map[string]interface{}{
		{"text": prompt},
		{"inlineData": map[string]string{"mimeType": "application/pdf", "data": base64.StdEncoding.EncodeToString(in.Draft)}},
	}
	if len(in.Template) > 0 {
		parts = append(parts, map[string]interface{}{
			"inlineData": map[string]string{"mimeType": "application/pdf", "data": base64.StdEncoding.EncodeToString(in.Template)},
		})
	}

	payload, err := json.Marshal(map[string]interface{}{
		"contents": []map[string]interface{}{{"role": "user", "parts": parts}},
		"generationConfig": map[string]interface{}{
			"responseMimeType": "application/json",
			"temperature":      0,
		},
	})
	if err != nil {
		return "", err
	}

	endpoint := fmt.Sprintf("%s/models/%s:generateContent", strings.TrimRight(g.baseURL(), "/"), g.model())

	// Robust invocation with exponential backoff retry for 503 (spikes) and 429
	var lastErr error
	for attempt := 0; attempt < 3; attempt++ {
		if attempt > 0 {
			select {
			case <-ctx.Done():
				return "", ctx.Err()
			case <-time.After(time.Duration(attempt) * 2 * time.Second):
			}
		}

		req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(payload))
		if err != nil {
			return "", err
		}
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("x-goog-api-key", apiKey)

		resp, err := g.httpClient.Do(req)
		if err != nil {
			lastErr = fmt.Errorf("gemini request failed: %w", err)
			continue
		}

		if resp.StatusCode == http.StatusOK {
			var gr struct {
				Candidates []struct {
					Content struct {
						Parts []struct {
							Text string `json:"text"`
						} `json:"parts"`
					} `json:"content"`
				} `json:"candidates"`
			}
			err := json.NewDecoder(resp.Body).Decode(&gr)
			resp.Body.Close()
			if err != nil {
				return "", fmt.Errorf("decode gemini response: %w", err)
			}
			if len(gr.Candidates) == 0 || len(gr.Candidates[0].Content.Parts) == 0 {
				return "", errors.New("empty response from gemini")
			}
			return gr.Candidates[0].Content.Parts[0].Text, nil
		}

		msg, _ := io.ReadAll(io.LimitReader(resp.Body, 2048))
		resp.Body.Close()
		lastErr = fmt.Errorf("gemini returned status %d: %s", resp.StatusCode, strings.TrimSpace(string(msg)))

		if resp.StatusCode != http.StatusServiceUnavailable && resp.StatusCode != http.StatusTooManyRequests {
			return "", lastErr
		}
		log.Printf("[GeminiEngine] Gemini status %d on attempt %d, retrying with backoff...", resp.StatusCode, attempt+1)
	}

	return "", lastErr
}

// parseTypographyFindings parses Agent 1's geometry/typography output.
func parseTypographyFindings(text string) (*typographyFindings, error) {
	text = cleanJSON(text)

	// Support both {checks: [...]} and legacy {geometry_and_layout: {checks: [...]}}
	var raw struct {
		Checks            []domain.GeometryCheck `json:"checks"`
		GeometryAndLayout struct {
			Checks []domain.GeometryCheck `json:"checks"`
		} `json:"geometry_and_layout"`
		TemplateSpecs *domain.TemplateSpecs `json:"template_specs"`
	}

	if err := json.Unmarshal([]byte(text), &raw); err != nil {
		return nil, fmt.Errorf("typography agent invalid JSON: %w", err)
	}

	checks := raw.Checks
	if len(checks) == 0 && len(raw.GeometryAndLayout.Checks) > 0 {
		checks = raw.GeometryAndLayout.Checks
	}

	cleanChecks := make([]domain.GeometryCheck, 0, len(checks))
	for _, c := range checks {
		if c.Rule == "" || c.Passed {
			continue
		}
		if len(c.Bbox) != 4 {
			c.Bbox = []int{0, 0, 0, 0}
		}
		if c.Page < 1 {
			c.Page = 1
		}
		cleanChecks = append(cleanChecks, c)
	}

	return &typographyFindings{
		Checks:        cleanChecks,
		TemplateSpecs: raw.TemplateSpecs,
	}, nil
}

// parseContextFindings parses Agent 2's context/anonymization output.
func parseContextFindings(text string) (*contextFindings, error) {
	text = cleanJSON(text)

	// Support both {anonymization_leaks: [...]} and legacy {anonymization: {leaks_found: [...]}}
	var raw struct {
		AnonymizationLeaks []domain.AnonymizationLeak `json:"anonymization_leaks"`
		Anonymization      struct {
			LeaksFound []domain.AnonymizationLeak `json:"leaks_found"`
		} `json:"anonymization"`
		CitationCrosscheck domain.CitationResult `json:"citation_crosscheck"`
		SectionCoherence   struct {
			RequiredSectionsInTemplate []string `json:"required_sections_in_template"`
			MissingRequiredSections    []string `json:"missing_required_sections"`
			AcademicLevel              string   `json:"academic_level"`
			RigorAssessment            string   `json:"rigor_assessment"`
		} `json:"section_coherence"`
	}

	if err := json.Unmarshal([]byte(text), &raw); err != nil {
		return nil, fmt.Errorf("context agent invalid JSON: %w", err)
	}

	leaks := raw.AnonymizationLeaks
	if len(leaks) == 0 && len(raw.Anonymization.LeaksFound) > 0 {
		leaks = raw.Anonymization.LeaksFound
	}

	for i := range leaks {
		if leaks[i].Page < 1 {
			leaks[i].Page = 1
		}
	}

	c := raw.CitationCrosscheck
	if c.UncitedReferences == nil {
		c.UncitedReferences = []string{}
	}
	if c.MissingCitations == nil {
		c.MissingCitations = []string{}
	}
	c.Pass = len(c.UncitedReferences) == 0 && len(c.MissingCitations) == 0

	return &contextFindings{
		AnonymizationLeaks: leaks,
		CitationCrosscheck: c,
		SectionCoherence:   raw.SectionCoherence,
	}, nil
}

// parseGeminiFindings preserves backward-compatibility for legacy single-call mocks in tests.
func parseGeminiFindings(text string) (*geminiFindings, error) {
	text = cleanJSON(text)

	var f geminiFindings
	if err := json.Unmarshal([]byte(text), &f); err != nil {
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

func cleanJSON(text string) string {
	text = strings.TrimSpace(text)
	text = strings.TrimPrefix(text, "```json")
	text = strings.TrimPrefix(text, "```")
	text = strings.TrimSuffix(text, "```")
	return strings.TrimSpace(text)
}
