import re
from typing import List, Tuple, Optional
import pymupdf as fitz

from app.models.audit import AnonymizationLeak, AnonymizationModule
from app.modules.base import BaseAuditModule

# Regex patterns for deterministic leaks
EMAIL_REGEX = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b")
ORCID_REGEX = re.compile(r"\b\d{4}-\d{4}-\d{4}-\d{3}[\dX]\b")
GRANT_REGEX = re.compile(r"(?i)\b(?:grant|supported\s+by|funded\s+by|award\s+number)\s*[:#]?\s*([A-Z0-9\-]+)")

# Headings that mark the end of the Author Byline block on page 1
BYLINE_END_REGEX = re.compile(
    r"(?i)\b(?:abstract|abstrak|ringkasan|executive\s+summary|keywords|kata\s+kunci|"
    r"introduction|pendahuluan|latar\s+belakang|1[\.\s]+introduction|1[\.\s]+pendahuluan)\b"
)

# Indonesian & English stop words that must never appear as author names or lone proper nouns
INDONESIAN_STOPWORDS = {
    "yang", "dan", "di", "ke", "dari", "pada", "untuk", "adalah", "sebagai",
    "dengan", "ini", "itu", "tidak", "bisa", "dapat", "oleh", "karena", "atau",
    "akan", "telah", "sudah", "dalam", "antara", "tentang", "seperti", "jika",
    "bila", "kode", "fitur", "data", "hasil", "tabel", "gambar", "uji", "model",
    "fungsi", "paket", "modul", "penelitian", "angka", "jendela", "beli", "pakai",
    "setelah", "kedua", "pertama", "ketiga", "lokasi", "struktur", "tugas", "studi",
    "metode", "pembelian", "pelanggan", "riwayat", "sengaja", "memprediksi", "membuat",
    "menjalankan", "pemasangan", "antarmuka", "interaktif", "ekspor", "variabel",
    "lingkungan", "prinsip", "diterapkan", "berhenti", "jenis", "barang", "tertentu",
    "catatan", "referensi", "daftar", "pustaka", "abstrak", "pendahuluan", "kesimpulan",
    "pembahasan", "metodologi", "analisis", "tinjauan", "berbasis", "graf", "terdistribusi"
}

ENGLISH_STOPWORDS = {
    "the", "and", "in", "of", "to", "a", "an", "is", "for", "with", "on", "at",
    "by", "from", "as", "or", "that", "this", "it", "not", "be", "are", "was",
    "were", "has", "have", "had", "code", "data", "results", "model", "study",
    "table", "figure", "method", "analysis", "system", "using", "based", "proposed",
    "framework", "review", "abstract", "introduction", "paper", "journal", "ieee",
    "acm", "springer", "elsevier", "author", "authors", "overview", "evaluation"
}

ALL_STOPWORDS = INDONESIAN_STOPWORDS | ENGLISH_STOPWORDS

# Institutional affiliation keywords (Indonesian and English)
AFFILIATION_KEYWORDS = {
    "university", "universitas", "institute", "institut", "faculty", "fakultas",
    "department", "departemen", "jurusan", "prodi", "program studi", "school",
    "college", "polytechnic", "politeknik", "laboratory", "laboratorium", "lab",
    "center", "centre", "pusat", "hospital", "rumah sakit", "corp", "corporation",
    "inc", "ltd", "tbk", "pt", "cv", "foundation", "yayasan"
}


def is_valid_academic_author(text: str) -> bool:
    """
    Validates whether a detected entity looks like a genuine academic author name.
    Rejects Indonesian/English vocabulary, single words, numbers, and code tokens.
    """
    clean = text.strip()
    if len(clean) < 5 or len(clean) > 50:
        return False
    if "\n" in clean or "\r" in clean or "\t" in clean:
        return False
    # Reject strings with code or markdown characters
    if any(ch in clean for ch in ("#", "$", "@", "_", "{", "}", "[", "]", "(", ")", "/", "\\", "=", "*", ":")):
        return False

    words = clean.split()
    # Academic authors typically have 2 to 4 name parts (e.g. John Doe, Budi Santoso, Sri Mulyani)
    if len(words) < 2 or len(words) > 5:
        return False

    # Check for stopwords or non-name tokens
    for w in words:
        w_lower = w.lower().strip(".,")
        if w_lower in ALL_STOPWORDS:
            return False
        # Particles allowed in lowercase (e.g., van, de, bin, binti)
        if w_lower in {"van", "de", "von", "bin", "binti", "da", "di"}:
            continue
        # Standard names must start with uppercase letter
        if not (len(w) >= 2 and w[0].isupper() and w[1:].islower() or (len(w) == 2 and w[1] == "." and w[0].isupper())):
            return False

    return True


def is_valid_academic_affiliation(text: str) -> bool:
    """
    Validates whether a detected entity looks like an academic or corporate affiliation.
    Requires an explicit institutional anchor word (e.g. University, Faculty, Laboratory).
    """
    clean = text.strip()
    if len(clean) < 6 or len(clean) > 100:
        return False
    if "\n" in clean or "\r" in clean:
        return False
    # Reject code tokens
    if any(ch in clean for ch in ("#", "$", "@", "_", "{", "}", "[", "]", "/", "\\", "=", "*")):
        return False

    clean_lower = clean.lower()
    return any(kw in clean_lower for kw in AFFILIATION_KEYWORDS)


def humanize_leak_annotation(leak_type: str, leak_text: str, page: int) -> str:
    """Generates a clear, friendly note for each specific double-blind leak."""
    if leak_type == "Author Name":
        return f"Author name found: '{leak_text}' (Page {page}). Remove author name for double-blind review."
    elif leak_type == "University / Affiliation":
        return f"Institution found: '{leak_text}' (Page {page}). Remove affiliation for double-blind review."
    elif leak_type == "EMAIL":
        return f"Email found: '{leak_text}' (Page {page}). Remove email address for double-blind review."
    elif leak_type == "ORCID":
        return f"ORCID found: '{leak_text}' (Page {page}). Remove ORCID for double-blind review."
    elif leak_type == "FUNDING_LEAK":
        return f"Funding source found: '{leak_text}' (Page {page}). Remove grant or funding details for double-blind review."
    return f"Identity detail found: '{leak_text}' (Page {page}). Remove for double-blind review."


class AnonymizationAuditor(BaseAuditModule):
    """
    Audits double-blind peer review integrity.
    Detects author names, affiliations, email addresses, ORCIDs, and PDF metadata.
    Specifically hardened against false positives on Indonesian and multi-lingual manuscripts.
    """

    def __init__(self, nlp_model=None):
        self._nlp = nlp_model

    @property
    def nlp(self):
        if self._nlp is None:
            import spacy
            try:
                self._nlp = spacy.load("en_core_web_sm")
            except Exception:
                self._nlp = spacy.blank("en")
        return self._nlp

    def audit(self, doc: fitz.Document, **kwargs) -> Tuple[AnonymizationModule, List[Tuple[int, List[int], str, str]]]:
        leaks: List[AnonymizationLeak] = []
        annotations: List[Tuple[int, List[int], str, str]] = []

        # 1. Audit PDF Metadata
        metadata = doc.metadata or {}
        author_meta = metadata.get("author")
        if author_meta and len(author_meta.strip()) > 2 and author_meta.lower() not in ("unknown", "admin", "user", "none"):
            leaks.append(AnonymizationLeak(
                type="PDF_METADATA_AUTHOR",
                leak=f"Author metadata present: '{author_meta.strip()}'",
                page=1,
            ))

        # 2. Page 1 Inspection (Header / Title / Author block)
        if len(doc) > 0:
            first_page = doc[0]
            first_page_text = first_page.get_text("text")

            # Deterministic: Email addresses
            for email in EMAIL_REGEX.findall(first_page_text):
                leaks.append(AnonymizationLeak(type="EMAIL", leak=email, page=1))

            # Deterministic: ORCIDs
            for orcid in ORCID_REGEX.findall(first_page_text):
                leaks.append(AnonymizationLeak(type="ORCID", leak=orcid, page=1))

            # Deterministic: Grant / Funding disclosures
            for grant in GRANT_REGEX.findall(first_page_text):
                leaks.append(AnonymizationLeak(type="FUNDING_LEAK", leak=f"Grant ID {grant}", page=1))

            # 3. Author Byline Block Isolation:
            # The author byline is strictly situated between the Document Title (line 1) and the Abstract / Introduction.
            # Never scan the Title, Abstract, or manuscript body for authors.
            match = BYLINE_END_REGEX.search(first_page_text)
            if match:
                raw_zone = first_page_text[:match.start()]
                lines = [l.strip() for l in raw_zone.splitlines() if l.strip()]
                # Skip title line(s)
                byline_lines = lines[1:] if len(lines) > 1 else []
            else:
                # If no abstract/intro header found, inspect only lines 2-5
                lines = [l.strip() for l in first_page_text.splitlines() if l.strip()]
                byline_lines = lines[1:5] if len(lines) > 1 else []

            # Check byline lines for Affiliations & Authors
            for line in byline_lines:
                # Institutional Affiliation by keywords
                if is_valid_academic_affiliation(line):
                    leaks.append(AnonymizationLeak(
                        type="University / Affiliation",
                        leak=line,
                        page=1,
                    ))
                    continue

                # Author Names via NER & heuristics on non-affiliation byline lines
                ner_line = self.nlp(line)
                found_author = False
                for ent in ner_line.ents:
                    clean_ent = ent.text.strip()
                    if ent.label_ == "PERSON" and is_valid_academic_author(clean_ent):
                        leaks.append(AnonymizationLeak(
                            type="Author Name",
                            leak=clean_ent,
                            page=1,
                        ))
                        found_author = True
                    elif ent.label_ == "ORG" and is_valid_academic_affiliation(clean_ent):
                        leaks.append(AnonymizationLeak(
                            type="University / Affiliation",
                            leak=clean_ent,
                            page=1,
                        ))

                # Also test comma-separated author list if spaCy missed (e.g. Indonesian names)
                if not found_author and "," in line:
                    for part in line.split(","):
                        part_clean = part.strip()
                        if is_valid_academic_author(part_clean):
                            leaks.append(AnonymizationLeak(
                                type="Author Name",
                                leak=part_clean,
                                page=1,
                            ))
                elif not found_author and is_valid_academic_author(line):
                    leaks.append(AnonymizationLeak(
                        type="Author Name",
                        leak=line,
                        page=1,
                    ))

        # Deduplicate leaks
        seen = set()
        deduped_leaks: List[AnonymizationLeak] = []
        for leak in leaks:
            key = (leak.type, leak.leak.lower())
            if key not in seen:
                seen.add(key)
                deduped_leaks.append(leak)

        # Generate contextual, distinct visual annotations
        for leak in deduped_leaks:
            if leak.type == "PDF_METADATA_AUTHOR":
                continue  # metadata has no physical position on page
            needle = leak.leak.replace("Grant ID ", "", 1) if leak.type == "FUNDING_LEAK" else leak.leak
            page_idx = max(0, leak.page - 1)
            if page_idx >= len(doc) or not needle.strip():
                continue
            matches = doc[page_idx].search_for(needle)
            if matches:
                # Highlight only the first exact occurrence to avoid clutter
                r = matches[0]
                comment = humanize_leak_annotation(leak.type, leak.leak, leak.page)
                annotations.append((
                    page_idx,
                    [int(r.x0), int(r.y0), int(r.x1), int(r.y1)],
                    f"ANONYMIZATION_{leak.type}",
                    comment,
                ))

        is_passed = len(deduped_leaks) == 0
        return AnonymizationModule(pass_=is_passed, leaks_found=deduped_leaks), annotations
