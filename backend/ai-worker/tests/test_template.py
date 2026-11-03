import fitz
import pytest

from app.models.audit import TemplateSpecs
from app.modules.layout import LayoutAuditor
from app.modules.template import TemplateExtractor


def create_synthetic_template_pdf() -> fitz.Document:
    """
    Creates an A4 PDF with 2-column layout and 20mm top/bottom, 18mm left/right margins.
    A4 is 595.28 x 841.89 pt.
    18mm = 51.02 pt
    20mm = 56.69 pt
    """
    doc = fitz.open()
    page = doc.new_page(width=595.28, height=841.89)

    # Left column text box
    rect_col1 = fitz.Rect(51, 57, 280, 785)
    page.insert_textbox(
        rect_col1,
        "Left column sample template text demonstrating standard academic layout with full justification."
    )

    # Right column text box
    rect_col2 = fitz.Rect(315, 57, 544, 785)
    page.insert_textbox(
        rect_col2,
        "Right column sample template text that wraps across multiple lines to reach the right bounding box margin edge."
    )

    return doc


def test_template_extractor_metrics():
    doc = create_synthetic_template_pdf()
    extractor = TemplateExtractor()
    specs = extractor.extract_specs(doc)

    assert specs.page_format == "A4"
    assert specs.column_count == 2
    # Tolerances on margin extraction (within 3.0mm)
    assert abs(specs.margin_top_mm - 20.0) <= 3.0
    assert abs(specs.margin_bottom_mm - 20.0) <= 3.0
    assert abs(specs.margin_left_mm - 18.0) <= 3.0
    assert abs(specs.margin_right_mm - 18.0) <= 3.0
    assert specs.column_gap_mm is not None and specs.column_gap_mm > 0
    doc.close()


def test_layout_auditor_compares_against_template():
    extractor = TemplateExtractor()
    template_doc = create_synthetic_template_pdf()
    specs = extractor.extract_specs(template_doc)
    template_doc.close()

    auditor = LayoutAuditor()

    # Draft with a top margin breach (placed at y=15pt ≈ 5.3mm, well below template's ~20mm)
    draft_breach = fitz.open()
    page = draft_breach.new_page(width=595.28, height=841.89)
    page.insert_textbox(
        fitz.Rect(51, 15, 280, 100),
        "Breaching header text placed too close to top edge relative to template specs."
    )
    result_breach, _ = auditor.audit(draft_breach, template_specs=specs)
    draft_breach.close()

    assert not result_breach.pass_
    top_checks = [c for c in result_breach.checks if c.rule == "MARGIN_TOP"]
    assert len(top_checks) > 0
    assert not top_checks[0].passed

    # Draft complying with template
    draft_ok = fitz.open()
    page_ok = draft_ok.new_page(width=595.28, height=841.89)
    page_ok.insert_textbox(
        fitz.Rect(60, 70, 280, 300),
        "Compliant body text comfortably inside template boundaries."
    )
    result_ok, _ = auditor.audit(draft_ok, template_specs=specs)
    draft_ok.close()

    assert result_ok.pass_
    assert len(result_ok.checks) == 0
