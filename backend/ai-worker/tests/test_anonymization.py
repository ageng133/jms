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



def test_anonymization_indonesian_text_no_false_positives():
    doc = fitz.open()
    page = doc.new_page(width=595, height=842)

    indonesian_readme = (
        "churn-study\n\n"
        "Kode penelitian Memprediksi Pelanggan yang Berhenti Membeli Jenis Barang Tertentu dari Riwayat Pembelian Amazon,\n"
        "ditulis ulang sebagai paket Python yang modular. Data: Open E-Commerce 1.0 di Hugging Face.\n\n"
        "Pemasangan\n"
        "python -m venv .venv\n"
        "Berkas artifacts.pkl di repositori yang sama sengaja tidak diunduh atau dimuat.\n\n"
        "Menjalankan\n"
        "churn-study run --quick  # uji cepat, angkanya tidak sebanding dengan naskah\n"
        "churn-study weka --rule B_adaptif  # ekspor ARFF untuk Weka\n"
        "Lokasi data dan hasil dapat diubah lewat variabel lingkungan CHURN_DATA.\n"
    )
    page.insert_text(fitz.Point(72, 100), indonesian_readme)

    auditor = AnonymizationAuditor()
    result, annotations = auditor.audit(doc)

    assert result.pass_ is True
    assert len(result.leaks_found) == 0
    assert len(annotations) == 0


def test_anonymization_indonesian_true_authors_and_affiliations():
    doc = fitz.open()
    page = doc.new_page(width=595, height=842)

    academic_text = (
        "Analisis Prediksi Churn Pelanggan Berbasis Graf Terdistribusi\n"
        "Budi Santoso, Sri Mulyani\n"
        "Fakultas Ilmu Komputer, Universitas Indonesia\n\n"
        "Abstrak\n"
        "Penelitian ini menganalisis pola churn pelanggan e-commerce.\n"
    )
    page.insert_text(fitz.Point(72, 100), academic_text)

    auditor = AnonymizationAuditor()
    result, annotations = auditor.audit(doc)

    assert result.pass_ is False
    leaks = {l.leak: l.type for l in result.leaks_found}
    assert "Budi Santoso" in leaks or "Sri Mulyani" in leaks
    assert any("Universitas Indonesia" in l.leak or "Fakultas Ilmu Komputer" in l.leak for l in result.leaks_found)
    assert len(annotations) > 0
    # Verify humanized notes
    for _, _, rule, comment in annotations:
        assert "Author name found" in comment or "Institution found" in comment
