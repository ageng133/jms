import fitz
from app.modules.citation import CitationAuditor


def test_citation_auditor_perfect_match():
    doc = fitz.open()
    page = doc.new_page(width=595, height=842)

    sample_text = (
        "Previous algorithms have achieved strong results [1], especially when combined\n"
        "with deep representation models [2].\n\n"
        "References\n"
        "[1] A. Smith, 'Neural architectures for publishing', 2023.\n"
        "[2] B. Jones, 'Distributed consensus in peer review', 2024.\n"
    )
    page.insert_textbox(fitz.Rect(50, 50, 500, 700), sample_text)

    auditor = CitationAuditor()
    result, _ = auditor.audit(doc)

    assert result.pass_ is True
    assert result.total_cited == 2
    assert len(result.uncited_references) == 0
    assert len(result.missing_citations) == 0


def test_citation_auditor_flags_missing_and_uncited():
    doc = fitz.open()
    page = doc.new_page(width=595, height=842)

    sample_text = (
        "Prior benchmarks [1] outperform baseline models [3].\n\n"
        "References\n"
        "[1] A. Smith, 'Neural architectures', 2023.\n"
        "[2] C. Uncited, 'Forgotten literature paper', 2021.\n"
    )
    page.insert_textbox(fitz.Rect(50, 50, 500, 700), sample_text)

    auditor = CitationAuditor()
    result, _ = auditor.audit(doc)

    assert result.pass_ is False
    assert "[3]" in result.missing_citations
    assert any("[2]" in ref for ref in result.uncited_references)
