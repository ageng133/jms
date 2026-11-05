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
    # Human-readable label and where the specs came from:
    # "uploaded_template" | "preset:<id>" | "default"
    name: Optional[str] = None
    source: Optional[str] = None


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
