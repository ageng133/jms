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


class AuditReport(BaseModel):
    audit_id: str
    manuscript_id: str
    overall_score: int
    summary: AuditSummary
    modules: AuditModules
    annotated_pdf_s3_key: Optional[str] = None


class WorkerJobPayload(BaseModel):
    audit_id: str
    file_id: str
    manuscript_id: str
    s3_key: str
    file_type: str
