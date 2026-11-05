"""
Storage-agnostic audit core: PDF bytes in, report + annotated PDF bytes out.

Used by both entry points:
- app.server  (HTTP, called by the Go gateway; default)
- app.worker  (legacy Redis/S3 consumer)
"""
import logging
from dataclasses import dataclass
from typing import Optional

import pymupdf as fitz

from app.models.audit import (
    AuditModules,
    AuditSummary,
    TemplateSpecs,
)
from app.modules.annotator import VisualPDFAnnotator
from app.modules.anonymization import AnonymizationAuditor
from app.modules.citation import CitationAuditor
from app.modules.layout import LayoutAuditor
from app.modules.template import TemplateExtractor
from app.scoring import compute_summary

logger = logging.getLogger("jms-ai-worker")

ENGINE_NAME = "pymupdf-worker"


class InvalidDocumentError(ValueError):
    """Raised when the uploaded bytes are not a readable PDF."""


@dataclass
class EngineResult:
    overall_score: int
    summary: AuditSummary
    modules: AuditModules
    template_specs: TemplateSpecs
    annotated_pdf: Optional[bytes]
    annotation_count: int

    def to_dict(self) -> dict:
        """JSON contract shared with the gateway (uses "pass", not "pass_")."""
        return {
            "engine": ENGINE_NAME,
            "overall_score": self.overall_score,
            "summary": self.summary.model_dump(),
            "modules": self.modules.model_dump(by_alias=True),
            "template_specs": self.template_specs.model_dump(),
            "annotation_count": self.annotation_count,
        }


def _open_pdf(data: bytes, label: str) -> fitz.Document:
    if not data:
        raise InvalidDocumentError(f"{label} is empty")
    try:
        doc = fitz.open(stream=data, filetype="pdf")
    except Exception as exc:  # PyMuPDF raises several error types
        raise InvalidDocumentError(f"{label} is not a readable PDF: {exc}") from exc
    if doc.needs_pass:
        doc.close()
        raise InvalidDocumentError(f"{label} is password protected")
    if len(doc) == 0:
        doc.close()
        raise InvalidDocumentError(f"{label} has no pages")
    return doc


class AuditEngine:
    def __init__(self, nlp_model=None):
        self.template_extractor = TemplateExtractor()
        self.layout_auditor = LayoutAuditor()
        self.anonymization_auditor = AnonymizationAuditor(nlp_model=nlp_model)
        self.citation_auditor = CitationAuditor()
        self.annotator = VisualPDFAnnotator()

    def run(
        self,
        draft_bytes: bytes,
        template_bytes: Optional[bytes] = None,
        template_specs: Optional[TemplateSpecs] = None,
    ) -> EngineResult:
        """
        Audit a manuscript.

        Template resolution order:
          1. specs extracted from the uploaded template PDF
          2. the `template_specs` preset passed by the caller (e.g. IEEE)
          3. TemplateSpecs() defaults (A4, 25.4 mm, 1 column)
        """
        doc = _open_pdf(draft_bytes, "Manuscript PDF")
        try:
            specs: Optional[TemplateSpecs] = None
            if template_bytes:
                tdoc = _open_pdf(template_bytes, "Template PDF")
                try:
                    specs = self.template_extractor.extract_specs(
                        template_doc=tdoc,
                        draft_doc=doc,
                    )
                    specs.source = "uploaded_template"
                    specs.name = specs.name or "Uploaded Journal Template"
                finally:
                    tdoc.close()

            if specs is None:
                specs = template_specs or TemplateSpecs(source="default", name="Default Baseline (A4, 25.4 mm)")
                specs.comparison_matrix = self.template_extractor.build_comparison_matrix(specs, doc)

            layout_res, layout_annots = self.layout_auditor.audit(doc, template_specs=specs)
            anon_res, anon_annots = self.anonymization_auditor.audit(doc)
            cite_res, cite_annots = self.citation_auditor.audit(doc)

            annotations = layout_annots + anon_annots + cite_annots
            annotated = self.annotator.annotate_document(doc, annotations) if annotations else None
        finally:
            doc.close()

        failed_rules = [c.rule for c in layout_res.checks if not c.passed]
        warnings = (
            len(anon_res.leaks_found)
            + len(cite_res.uncited_references)
            + len(cite_res.missing_citations)
        )
        s = compute_summary(failed_rules, warnings)

        logger.info(
            "Audit done: score=%s status=%s critical=%s warnings=%s annotations=%s",
            s["overall_score"], s["status"], s["critical_errors"], s["warnings"], len(annotations),
        )

        return EngineResult(
            overall_score=s["overall_score"],
            summary=AuditSummary(
                critical_errors=s["critical_errors"],
                warnings=s["warnings"],
                status=s["status"],
            ),
            modules=AuditModules(
                geometry_and_layout=layout_res,
                anonymization=anon_res,
                citation_crosscheck=cite_res,
            ),
            template_specs=specs,
            annotated_pdf=annotated,
            annotation_count=len(annotations),
        )
