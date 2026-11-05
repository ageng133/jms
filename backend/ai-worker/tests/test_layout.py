import pymupdf as fitz
from app.modules.layout import LayoutAuditor


def test_layout_auditor_detects_top_margin_breach():
    doc = fitz.open()
    page = doc.new_page(width=595, height=842)  # Standard A4 size in points

    # Insert text at y=20 pt (well above top margin of 25.4mm ≈ 72 pt)
    page.insert_text(fitz.Point(72, 20), "This text severely violates the top margin boundary.")

    auditor = LayoutAuditor(top_mm=25.4)
    result, annotations = auditor.audit(doc)

    assert result.pass_ is False
    assert len(result.checks) > 0
    top_checks = [c for c in result.checks if c.rule == "MARGIN_TOP"]
    assert len(top_checks) >= 1
    assert top_checks[0].passed is False
    assert len(annotations) >= 1


def test_layout_auditor_clean_margins_pass():
    doc = fitz.open()
    page = doc.new_page(width=595, height=842)

    # Insert text comfortably within 25.4mm (72 pt) margins
    page.insert_text(fitz.Point(100, 150), "Properly formatted academic content within safe margins.")

    auditor = LayoutAuditor(top_mm=25.4, bottom_mm=25.4, left_mm=25.4, right_mm=25.4)
    result, _ = auditor.audit(doc)

    assert result.pass_ is True
    assert len(result.checks) == 0

