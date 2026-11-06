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
		MissingRequiredSections []string `json:"missing_required_sections"`
		AcademicLevel           string   `json:"academic_level"`
		RigorAssessment         string   `json:"rigor_assessment"`
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
				specs.Name = "Uploaded journal template"
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

		// If missing core academic sections detected, convert to a structural check
		if len(agent2Out.SectionCoherence.MissingRequiredSections) > 0 {
			missingStr := strings.Join(agent2Out.SectionCoherence.MissingRequiredSections, ", ")
			combinedChecks = append(combinedChecks, domain.GeometryCheck{
				Rule:     "SECTION_STRUCTURE",
				Expected: "Core academic sections (Abstract, Introduction, Methods, Results, Discussion, Conclusion)",
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

	prompt := fmt.Sprintf(`You are the Typography, Font, Spacing, and Geometry Specialist Agent in an academic publishing system.
Audit the MANUSCRIPT PDF (first attached file).%s

Reference layout (use it when no template PDF is attached, otherwise prefer what you measure from the template):
%s

Focus strictly on physical geometry and typography:
1. Page dimensions (mm) and orientation (A4 vs US Letter).
2. Margins: top, bottom, left, right (mm).
3. Column layout: count, column width, column gap (mm).
4. Typography: font sizes (pt) for title, headings, body text; font family; line spacing (single/1.15/1.5/double).
5. Headers & Footers spacing.

Report ONLY real violations where manuscript diverges from reference.
Respond with ONE JSON object and nothing else:
{
  "agent": "typography_geometry_specialist",
  "checks": [
    {
      "rule": "COLUMN_LAYOUT | MARGIN_TOP | MARGIN_BOTTOM | MARGIN_LEFT | MARGIN_RIGHT | FONT_SIZE_BODY | FONT_SIZE_HEADING | FONT_FAMILY | LINE_SPACING | PAGE_DIMENSIONS",
      "expected": "expected spec from template",
      "actual": "measured value in manuscript",
      "passed": false,
      "page": 1,
      "bbox": [0, 0, 0, 0]
    }
  ],
  "template_specs": %s
}`,
		map[bool]string{true: "\nThe second attached file is the journal's official TEMPLATE PDF: measure its page size, margins and column layout and use them as the target.", false: ""}[hasTemplate],
		string(specsJSON),
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

	prompt := fmt.Sprintf(`You are the Academic Context, Double-Blind Integrity & Citation Specialist Agent.
Audit the MANUSCRIPT PDF (first attached file).%s

Focus strictly on content integrity and academic rigor:
1. Double-blind anonymization: Author names, emails, affiliations, acknowledgments, grant/funding disclosures that reveal author identity.
2. Citation cross-referencing: numeric or author-year citations in body text vs references section (identify uncited references and missing citations).
3. Academic section coherence: verify presence of standard academic sections (Abstract, Keywords, Introduction, Methods/Methodology, Results, Discussion, Conclusion, References).
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
    "missing_required_sections": [],
    "academic_level": "JOURNAL_ARTICLE",
    "rigor_assessment": "brief context assessment"
  }
}`,
		map[bool]string{true: "\nThe second attached file is the journal's official TEMPLATE PDF: cross-check required sections specified by the template.", false: ""}[hasTemplate],
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
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(payload))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-goog-api-key", apiKey) // keep the key out of URLs/logs

	resp, err := g.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("gemini request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		msg, _ := io.ReadAll(io.LimitReader(resp.Body, 2048))
		return "", fmt.Errorf("gemini returned status %d: %s", resp.StatusCode, strings.TrimSpace(string(msg)))
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
		return "", fmt.Errorf("decode gemini response: %w", err)
	}
	if len(gr.Candidates) == 0 || len(gr.Candidates[0].Content.Parts) == 0 {
		return "", errors.New("empty response from gemini")
	}

	return gr.Candidates[0].Content.Parts[0].Text, nil
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
			MissingRequiredSections []string `json:"missing_required_sections"`
			AcademicLevel           string   `json:"academic_level"`
			RigorAssessment         string   `json:"rigor_assessment"`
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
