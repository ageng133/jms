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
    result, annotations = auditor.audit(doc)

    assert result.pass_ is True
    assert result.total_cited == 2
    assert len(result.uncited_references) == 0
    assert len(result.missing_citations) == 0
    assert len(annotations) == 0


def test_citation_auditor_flags_missing_and_uncited_with_annotations():
    doc = fitz.open()
    page = doc.new_page(width=595, height=842)

    sample_text = (
        "Prior benchmarks [1] outperform baseline models [3].\n\n"
        "V. REFERENCES\n"
        "[1] A. Smith, 'Neural architectures', 2023.\n"
        "[2] C. Uncited, 'Forgotten literature paper', 2021.\n"
    )
    page.insert_textbox(fitz.Rect(50, 50, 500, 700), sample_text)

    auditor = CitationAuditor()
    result, annotations = auditor.audit(doc)

    assert result.pass_ is False
    assert "[3]" in result.missing_citations
    assert any("[2]" in ref for ref in result.uncited_references)
    # Check that annotations were generated for visual PDF overlay
    assert len(annotations) > 0
    rules = [a[2] for a in annotations]
    assert "CITATION_MISSING" in rules or "UNCITED_REFERENCE" in rules


def test_citation_auditor_handles_endash_ranges_and_numbered_dots():
    doc = fitz.open()
    page = doc.new_page(width=595, height=842)

    sample_text = (
        "Zero-copy pipelines are discussed in [1\u20133] and extended in [4].\n\n"
        "DAFTAR PUSTAKA\n"
        "1. Author One, 'Distributed Plasma Storage', 2022.\n"
        "2. Author Two, 'Arrow Zero Copy IPC', 2023.\n"
        "3. Author Three, 'SIMD Memory Realignment', 2024.\n"
        "4. Author Four, 'High Throughput Ray Pipelines', 2025.\n"
    )
    page.insert_textbox(fitz.Rect(50, 50, 500, 700), sample_text)

    auditor = CitationAuditor()
    result, annotations = auditor.audit(doc)

    assert result.pass_ is True
    assert result.total_cited == 4
    assert len(result.missing_citations) == 0
    assert len(result.uncited_references) == 0

