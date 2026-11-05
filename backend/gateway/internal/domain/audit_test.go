package domain

import "testing"

func TestScoreAudit(t *testing.T) {
	cases := []struct {
		name     string
		f        AuditFindings
		score    int
		critical int
		warnings int
		status   string
	}{
		{name: "clean", score: 100, status: AuditStatusPass},
		{
			name: "same rule on many blocks counts once",
			f: AuditFindings{Checks: []GeometryCheck{
				{Rule: "MARGIN_TOP"}, {Rule: "MARGIN_TOP"}, {Rule: "MARGIN_TOP"}, {Rule: "MARGIN_LEFT"},
			}},
			score: 70, critical: 2, status: AuditStatusFail,
		},
		{
			name:  "two warnings still pass",
			f:     AuditFindings{Leaks: []AnonymizationLeak{{}}, Citation: CitationResult{MissingCitations: []string{"[3]"}}},
			score: 90, warnings: 2, status: AuditStatusPass,
		},
		{
			name:  "three warnings fail",
			f:     AuditFindings{Leaks: []AnonymizationLeak{{}, {}}, Citation: CitationResult{UncitedReferences: []string{"[4]"}}},
			score: 85, warnings: 3, status: AuditStatusFail,
		},
		{
			name:  "passed checks are ignored",
			f:     AuditFindings{Checks: []GeometryCheck{{Rule: "MARGIN_TOP", Passed: true}}},
			score: 100, status: AuditStatusPass,
		},
		{
			name:  "clamped at zero",
			f:     AuditFindings{Citation: CitationResult{UncitedReferences: make([]string, 40)}},
			score: 0, warnings: 40, status: AuditStatusFail,
		},
	}

	for _, tc := range cases {
		s := ScoreAudit(tc.f)
		if s.OverallScore != tc.score || s.CriticalErrors != tc.critical || s.Warnings != tc.warnings || s.Status != tc.status {
			t.Errorf("%s: got %+v", tc.name, s)
		}
	}
}

func TestTemplatePresets(t *testing.T) {
	if _, ok := FindTemplatePreset(DefaultTemplatePresetID); !ok {
		t.Fatal("default preset missing")
	}
	for _, p := range TemplatePresets() {
		if p.Specs.Source != "preset:"+p.ID || p.Specs.Name != p.Name || p.Specs.PageWidthMm == 0 {
			t.Errorf("preset %s not filled correctly: %+v", p.ID, p.Specs)
		}
	}
	if _, ok := FindTemplatePreset("nope"); ok {
		t.Error("unknown preset should not be found")
	}
}
