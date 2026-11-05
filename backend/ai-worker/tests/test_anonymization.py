import pymupdf as fitz
from app.modules.anonymization import AnonymizationAuditor


def test_anonymization_auditor_flags_email_and_orcid():
    doc = fitz.open()
    page = doc.new_page(width=595, height=842)

    leaked_text = (
        "Anonymous Submission\n\n"
        "Contact: author@mit.edu\n"
        "ORCID: 0000-0002-1825-0097\n"
        "Supported by Grant: NSF-2024-8891\n"
    )
    page.insert_text(fitz.Point(72, 100), leaked_text)

    auditor = AnonymizationAuditor()
    result, _ = auditor.audit(doc)

    assert result.pass_ is False
    leak_types = [l.type for l in result.leaks_found]
    assert "EMAIL" in leak_types
    assert "ORCID" in leak_types
    assert "FUNDING_LEAK" in leak_types


def test_anonymization_clean_document_passes():
    doc = fitz.open()
    page = doc.new_page(width=595, height=842)

    clean_text = (
        "Blind Manuscript Title\n\n"
        "Abstract\n"
        "This paper investigates neural models without author attribution.\n"
    )
    page.insert_text(fitz.Point(72, 100), clean_text)

    auditor = AnonymizationAuditor()
    result, _ = auditor.audit(doc)

    assert result.pass_ is True
    assert len(result.leaks_found) == 0

