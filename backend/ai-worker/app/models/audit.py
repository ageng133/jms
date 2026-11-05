from typing import List, Optional, Literal
from pydantic import BaseModel, Field, ConfigDict


class GeometryCheck(BaseModel):
    rule: str
    expected: str
    actual: str
    passed: bool
    page: int
    bbox: List[int] = Field(description="[x0, y0, x1, y1] coordinates")


class GeometryModule(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    pass_: bool = Field(alias="pass")
    checks: List[GeometryCheck]


class AnonymizationLeak(BaseModel):
    type: str
    leak: str
    page: int


class AnonymizationModule(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    pass_: bool = Field(alias="pass")
    leaks_found: List[AnonymizationLeak]


class CitationCrosscheckModule(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    pass_: bool = Field(alias="pass")
    total_cited: int
    uncited_references: List[str]
    missing_citations: List[str]


class AuditModules(BaseModel):
    geometry_and_layout: GeometryModule
    anonymization: AnonymizationModule
    citation_crosscheck: CitationCrosscheckModule


class AuditSummary(BaseModel):
    critical_errors: int
    warnings: int
    status: Literal["PASS", "FAIL"]


class TemplateRuleComparison(BaseModel):
    category: str  # "Page Format", "Margins", "Columns", "Typography", "Citation", "Anonymity"
    rule_name: str  # e.g. "Top Margin", "Column Grid", "Citation System"
    target_spec: str  # e.g. "≥ 30.0 mm (Extracted from Aturan Penulisan)"
    draft_actual: str  # e.g. "20.0 mm (Outermost content at 20.0 mm)"
    status: Literal["MATCH", "BREACH", "WARNING", "INFO"]
    delta_note: Optional[str] = None  # e.g. "Increase margin by 10.0 mm"


class TemplateSpecs(BaseModel):
    page_format: str = "A4"
    page_width_mm: float = 210.0
    page_height_mm: float = 297.0
    margin_top_mm: float = 25.4
    margin_bottom_mm: float = 25.4
    margin_left_mm: float = 25.4
    margin_right_mm: float = 25.4
    column_count: int = 1
    column_gap_mm: Optional[float] = None
    is_custom_template: bool = False
    name: Optional[str] = None
    source: Optional[str] = None

    # Template Intelligence & Classification:
    # "AUTHOR_GUIDELINES" (Pedoman/Aturan Penulisan) | "SAMPLE_PAPER" (Contoh Naskah Jurnal) | "CUSTOM_DOCUMENT"
    template_type: str = "SAMPLE_PAPER"
    template_type_label: str = "Contoh Dokumen Jurnal (Sample Paper Template)"
    extraction_mode: str = "GEOMETRIC_INSPECTION"  # "TEXTUAL_GUIDELINE_PARSER" | "GEOMETRIC_INSPECTION"
    detected_font_family: Optional[str] = None
    detected_font_size_pt: Optional[float] = None
    detected_citation_style: Optional[str] = None
    double_blind_required: bool = True
    extracted_rules_summary: List[str] = Field(default_factory=list)
    comparison_matrix: List[TemplateRuleComparison] = Field(default_factory=list)


class AuditReport(BaseModel):
    audit_id: str
    manuscript_id: str
    overall_score: int
    summary: AuditSummary
    modules: AuditModules
    template_specs: Optional[TemplateSpecs] = None
    annotated_pdf_s3_key: Optional[str] = None


class WorkerJobPayload(BaseModel):
    audit_id: str
    file_id: str
    template_file_id: Optional[str] = None
    manuscript_id: str
    s3_key: str
    template_s3_key: Optional[str] = None
    file_type: str
