import re
from typing import List, Tuple
import pymupdf as fitz

from app.models.audit import AnonymizationLeak, AnonymizationModule
from app.modules.base import BaseAuditModule

# Regex patterns for deterministic leaks
EMAIL_REGEX = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b")
ORCID_REGEX = re.compile(r"\b\d{4}-\d{4}-\d{4}-\d{3}[\dX]\b")
GRANT_REGEX = re.compile(r"(?i)\b(?:grant|supported\s+by|funded\s+by|award\s+number)\s*[:#]?\s*([A-Z0-9\-]+)")

# Common false positives on academic front pages
FILTER_TOKENS = {
    "abstract", "introduction", "keywords", "department", "university",
    "faculty", "institute", "school", "center", "centre", "journal", "ieee",
    "acm", "elsevier", "springer", "paper", "author", "review"
}


class AnonymizationAuditor(BaseAuditModule):
    """
    Audits double-blind peer review integrity.
    Detects author names, affiliations, email addresses, ORCIDs, and PDF metadata.
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
                # Fallback to blank model if small model is not yet downloaded
                self._nlp = spacy.blank("en")
        return self._nlp

    def audit(self, doc: fitz.Document, **kwargs) -> Tuple[AnonymizationModule, List[Tuple[int, List[int], str, str]]]:
        leaks: List[AnonymizationLeak] = []
        annotations: List[Tuple[int, List[int], str, str]] = []

        # 1. Audit PDF Metadata
        metadata = doc.metadata or {}
        author_meta = metadata.get("author")
        if author_meta and len(author_meta.strip()) > 2 and author_meta.lower() not in ("unknown", "admin", "user"):
            leaks.append(AnonymizationLeak(
                type="PDF_METADATA_AUTHOR",
                leak=f"Author metadata present: '{author_meta.strip()}'",
                page=1,
            ))

        # 2. Page 1 Inspection (Header / Title / Author block)
        if len(doc) > 0:
            first_page = doc[0]
            first_page_text = first_page.get_text("text")

            # Email addresses
            for email in EMAIL_REGEX.findall(first_page_text):
                leaks.append(AnonymizationLeak(type="EMAIL", leak=email, page=1))

            # ORCIDs
            for orcid in ORCID_REGEX.findall(first_page_text):
                leaks.append(AnonymizationLeak(type="ORCID", leak=orcid, page=1))

            # Grant / Funding disclosures on first page
            for grant in GRANT_REGEX.findall(first_page_text):
                leaks.append(AnonymizationLeak(type="FUNDING_LEAK", leak=f"Grant ID {grant}", page=1))

            # spaCy NER for PERSON and ORG in the top half of page 1
            # Search title block (first 1500 characters)
            title_block = first_page_text[:1500]
            ner_doc = self.nlp(title_block)
            for ent in ner_doc.ents:
                clean_ent = ent.text.strip()
                if len(clean_ent) < 4:
                    continue

                if clean_ent.lower() in FILTER_TOKENS:
                    continue

                if ent.label_ == "PERSON":
                    leaks.append(AnonymizationLeak(
                        type="Author Name",
                        leak=clean_ent,
                        page=1,
                    ))
                elif ent.label_ == "ORG":
                    leaks.append(AnonymizationLeak(
                        type="University / Affiliation",
                        leak=clean_ent,
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

        # Red boxes around every leaked identifier we can locate on its page
        for leak in deduped_leaks:
            if leak.type == "PDF_METADATA_AUTHOR":
                continue  # metadata has no position on the page
            needle = leak.leak.replace("Grant ID ", "", 1) if leak.type == "FUNDING_LEAK" else leak.leak
            page_idx = max(0, leak.page - 1)
            if page_idx >= len(doc) or not needle.strip():
                continue
            for r in doc[page_idx].search_for(needle)[:3]:
                annotations.append((
                    page_idx,
                    [int(r.x0), int(r.y0), int(r.x1), int(r.y1)],
                    f"ANONYMIZATION_{leak.type}",
                    f"Double-blind leak ({leak.type}): '{leak.leak}'. Remove or anonymize before submission.",
                ))

        is_passed = len(deduped_leaks) == 0
        return AnonymizationModule(pass_=is_passed, leaks_found=deduped_leaks), annotations

