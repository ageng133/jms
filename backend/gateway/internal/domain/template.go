package domain

import "encoding/json"

// TemplateSpecs describes the layout a manuscript is checked against.
// JSON tags match backend/ai-worker/app/models/audit.py TemplateSpecs.
type TemplateSpecs struct {
	PageFormat        string   `json:"page_format"`
	PageWidthMm       float64  `json:"page_width_mm"`
	PageHeightMm      float64  `json:"page_height_mm"`
	MarginTopMm       float64  `json:"margin_top_mm"`
	MarginBottomMm    float64  `json:"margin_bottom_mm"`
	MarginLeftMm      float64  `json:"margin_left_mm"`
	MarginRightMm     float64  `json:"margin_right_mm"`
	ColumnCount       int      `json:"column_count"`
	ColumnGapMm       *float64 `json:"column_gap_mm,omitempty"`
	IsCustomTemplate  bool     `json:"is_custom_template"`
	Name              string   `json:"name,omitempty"`
	Source            string   `json:"source,omitempty"` // uploaded_template | preset:<id> | default
	FontFamily        string   `json:"font_family,omitempty"`
	BodyFontSizePt    float64  `json:"body_font_size_pt,omitempty"`
	TitleFontSizePt   float64  `json:"title_font_size_pt,omitempty"`
	HeadingFontSizePt float64  `json:"heading_font_size_pt,omitempty"`
	LineSpacing       string   `json:"line_spacing,omitempty"` // single | 1.15 | 1.5 | double
	LineHeightPt      float64  `json:"line_height_pt,omitempty"`
	TextAlignment     string   `json:"text_alignment,omitempty"` // justify | left
	RunningHeader     string   `json:"running_header,omitempty"`
	RequiredSections  []string `json:"required_sections,omitempty"`
	// FixedLayout is filled by the optional reshape step (see Remediator).
	FixedLayout json.RawMessage `json:"fixed_layout,omitempty"`
}

// TemplatePreset is a built-in journal layout offered when the author does
// not upload the journal's own template PDF.
type TemplatePreset struct {
	ID          string        `json:"id"`
	Name        string        `json:"name"`
	Description string        `json:"description"`
	Font        string        `json:"font"`
	Specs       TemplateSpecs `json:"specs"`
}

const DefaultTemplatePresetID = "ieee"

func gap(mm float64) *float64 { return &mm }

// Approximate text-block geometry of common templates. Margin checks flag
// text that intrudes into these margins (with the worker's tolerance).
var templatePresets = []TemplatePreset{
	{
		ID:          "ieee",
		Name:        "IEEE Conference (A4)",
		Description: "IEEE conference / transactions style, two columns.",
		Font:        "Times New Roman 10pt",
		Specs: TemplateSpecs{
			PageFormat: "A4", PageWidthMm: 210, PageHeightMm: 297,
			MarginTopMm: 19, MarginBottomMm: 43, MarginLeftMm: 14.32, MarginRightMm: 14.32,
			ColumnCount: 2, ColumnGapMm: gap(4.22),
		},
	},
	{
		ID:          "acm",
		Name:        "ACM SIGCONF (Letter)",
		Description: "ACM acmart sigconf proceedings format, two columns.",
		Font:        "Linux Libertine 9pt",
		Specs: TemplateSpecs{
			PageFormat: "Letter", PageWidthMm: 215.9, PageHeightMm: 279.4,
			MarginTopMm: 19, MarginBottomMm: 19, MarginLeftMm: 18.6, MarginRightMm: 18.6,
			ColumnCount: 2, ColumnGapMm: gap(8.5),
		},
	},
	{
		ID:          "springer-lncs",
		Name:        "Springer LNCS",
		Description: "Lecture Notes in Computer Science, single column (122 x 193 mm text block).",
		Font:        "Computer Modern 10pt",
		Specs: TemplateSpecs{
			PageFormat: "A4", PageWidthMm: 210, PageHeightMm: 297,
			MarginTopMm: 52, MarginBottomMm: 52, MarginLeftMm: 44, MarginRightMm: 44,
			ColumnCount: 1,
		},
	},
	{
		ID:          "uts-open",
		Name:        "UTS Open Journal",
		Description: "Institutional format for faculty technical reports, single column.",
		Font:        "Inter 11pt",
		Specs: TemplateSpecs{
			PageFormat: "A4", PageWidthMm: 210, PageHeightMm: 297,
			MarginTopMm: 25, MarginBottomMm: 25, MarginLeftMm: 25, MarginRightMm: 25,
			ColumnCount: 1,
		},
	},
}

// TemplatePresets returns a copy of the built-in presets with name/source filled.
func TemplatePresets() []TemplatePreset {
	out := make([]TemplatePreset, len(templatePresets))
	for i, p := range templatePresets {
		p.Specs.Name = p.Name
		p.Specs.Source = "preset:" + p.ID
		out[i] = p
	}
	return out
}

// FindTemplatePreset looks up a preset by id.
func FindTemplatePreset(id string) (TemplatePreset, bool) {
	for _, p := range TemplatePresets() {
		if p.ID == id {
			return p, true
		}
	}
	return TemplatePreset{}, false
}
