import re
from typing import List, Tuple, Set, Dict, Optional
import fitz

from app.models.audit import CitationCrosscheckModule
from app.modules.base import BaseAuditModule

# Regex patterns for inline citations
NUMERIC_INLINE_BRACKETS_REGEX = re.compile(r"\[([\d\s,\-\u2013\u2014\?]+)\]")
AUTHOR_YEAR_INLINE_REGEX = re.compile(
    r"\b([A-Z][A-Za-z\u00C0-\u017F\-]+(?:\s+et\s+al\.)?)\s*\((\d{4}[a-z]?)\)"
    r"|\(([A-Z][A-Za-z\u00C0-\u017F\-]+(?:\s+et\s+al\.)?)[,\s]+(\d{4}[a-z]?)\)"
)

# Regex for detecting section headers
SECTION_HEADER_REGEX = re.compile(
    r"(?im)^\s*(?:(?:[0-9]+|[IVXLCDM]+)[\.\s:]+)?(?:references|daftar\s+pustaka|bibliography|literature\s+cited|rujukan)\b"
)

# Regex for bibliography entries: [1] Entry text... or 1. Entry text...
BIB_BRACKETED_ENTRY_REGEX = re.compile(r"\[(\d+)\]\s*([\s\S]+?)(?=(?:\[\d+\]|\Z))")
BIB_NUMBERED_DOT_REGEX = re.compile(r"(?:^|\n)\s*(\d+)[\.\)]\s*([\s\S]+?)(?=(?:\n\s*\d+[\.\)]|\Z))")


class CitationAuditor(BaseAuditModule):
    """
    Performs robust, bidirectional citation cross-matching:
    1. Locates bibliography section (References/Daftar Pustaka) handling IEEE/ACM section numbering.
    2. Forward check: Identifies missing citations (inline references without bibliography entries).
    3. Backward check: Identifies uncited references (bibliography entries never cited in text).
    4. Generates visual PDF bounding box annotations over violation tokens.
    """

    def audit(
        self, doc: fitz.Document, **kwargs
    ) -> Tuple[CitationCrosscheckModule, List[Tuple[int, List[int], str, str]]]:
        annotations: List[Tuple[int, List[int], str, str]] = []

        total_pages = len(doc)
        if total_pages == 0:
            return CitationCrosscheckModule(
                pass_=False,
                total_cited=0,
                uncited_references=[],
                missing_citations=["Document has no readable pages"],
            ), annotations

        # 1. Locate the References Section across pages
        bib_page_idx, bib_split_pos = self._find_bibliography_boundary(doc)

        if bib_page_idx is None:
            # References header was not detected in document
            return CitationCrosscheckModule(
                pass_=False,
                total_cited=0,
                uncited_references=[],
                missing_citations=["Bibliography header (References/Daftar Pustaka) not detected"],
            ), annotations

        # 2. Extract Body Text and Bibliography Text
        body_text_parts = []
        for i in range(bib_page_idx):
            body_text_parts.append(doc[i].get_text("text"))

        split_page_text = doc[bib_page_idx].get_text("text")
        body_text_parts.append(split_page_text[:bib_split_pos])
        body_text = "\n".join(body_text_parts)

        bib_text_parts = [split_page_text[bib_split_pos:]]
        for i in range(bib_page_idx + 1, total_pages):
            bib_text_parts.append(doc[i].get_text("text"))
        bib_text = "\n".join(bib_text_parts)

        # 3. Parse Inline Numeric Citations from Body
        inline_numbers: Set[int] = self._extract_inline_numbers(body_text)

        # 4. Parse Bibliography Entries (supports [1] and 1.)
        bib_entries: Dict[int, str] = self._extract_bib_entries(bib_text)

        missing_citations: List[str] = []
        uncited_references: List[str] = []

        if bib_entries or inline_numbers:
            # Check forward: inline citations without bibliography entry
            for num in sorted(inline_numbers):
                if num not in bib_entries:
                    missing_token = f"[{num}]"
                    missing_citations.append(missing_token)

                    # Generate visual annotation for missing citation on body pages
                    for p_idx in range(bib_page_idx + 1):
                        rects = doc[p_idx].search_for(missing_token)
                        for r in rects:
                            annotations.append((
                                p_idx,
                                [int(r.x0), int(r.y0), int(r.x1), int(r.y1)],
                                "CITATION_MISSING",
                                f"Citation [{num}] cited in body text but not found in Bibliography.",
                            ))

            # Check backward: bibliography entries never cited in body
            for idx, raw_desc in bib_entries.items():
                if idx not in inline_numbers:
                    clean_desc = " ".join(raw_desc.split())
                    short_desc = clean_desc[:50].strip() + "..." if len(clean_desc) > 50 else clean_desc.strip()
                    uncited_references.append(f"[{idx}] {short_desc}")

                    # Generate visual annotation on bibliography page
                    search_marker = f"[{idx}]"
                    for p_idx in range(bib_page_idx, total_pages):
                        rects = doc[p_idx].search_for(search_marker)
                        if not rects:
                            rects = doc[p_idx].search_for(f"{idx}.")
                        for r in rects[:1]:
                            annotations.append((
                                p_idx,
                                [int(r.x0), int(r.y0), int(r.x1), int(r.y1)],
                                "UNCITED_REFERENCE",
                                f"Reference [{idx}] listed in bibliography but never cited in body text.",
                            ))

            total_cited = len(inline_numbers)
        else:
            # Fallback to Author-Year heuristic
            ay_matches = AUTHOR_YEAR_INLINE_REGEX.findall(body_text)
            cited_authors = set()
            for m in ay_matches:
                author = m[0] or m[2]
                year = m[1] or m[3]
                if author and year:
                    cited_authors.add(f"{author} ({year})")

            total_cited = len(cited_authors)
            for ca in sorted(cited_authors):
                author_key = ca.split("(")[0].strip()
                if author_key.lower() not in bib_text.lower():
                    missing_citations.append(ca)
                    # Annotate author-year search
                    for p_idx in range(bib_page_idx + 1):
                        rects = doc[p_idx].search_for(ca)
                        for r in rects:
                            annotations.append((
                                p_idx,
                                [int(r.x0), int(r.y0), int(r.x1), int(r.y1)],
                                "CITATION_MISSING",
                                f"Citation {ca} cited in body but author name not found in Bibliography.",
                            ))

        is_passed = len(missing_citations) == 0 and len(uncited_references) == 0

        return CitationCrosscheckModule(
            pass_=is_passed,
            total_cited=total_cited,
            uncited_references=uncited_references,
            missing_citations=missing_citations,
        ), annotations

    def _find_bibliography_boundary(self, doc: fitz.Document) -> Tuple[Optional[int], int]:
        """
        Locates the bibliography section header.
        Prioritizes occurrences in the later half of the document to avoid false positives.
        """
        total_pages = len(doc)
        candidate_matches = []

        for p_idx in range(total_pages):
            page_text = doc[p_idx].get_text("text")
            for m in SECTION_HEADER_REGEX.finditer(page_text):
                candidate_matches.append((p_idx, m.start()))

        if not candidate_matches:
            # Fallback: line-by-line inspection on the last 3 pages
            search_start_page = max(0, total_pages - 3)
            for p_idx in range(search_start_page, total_pages):
                page_text = doc[p_idx].get_text("text")
                for line in page_text.splitlines():
                    clean_line = line.strip().lower()
                    if clean_line in (
                        "references", "references and notes", "daftar pustaka",
                        "bibliography", "literature cited", "rujukan"
                    ):
                        pos = page_text.find(line)
                        candidate_matches.append((p_idx, pos if pos != -1 else 0))

        if not candidate_matches:
            return None, 0

        # If multiple headers found, prefer the one closest to the end
        return candidate_matches[-1]

    def _extract_inline_numbers(self, text: str) -> Set[int]:
        """
        Extracts numeric citation IDs handling ranges (1-3, 1–3, 1—3) and comma lists (1, 2, 4).
        """
        numbers: Set[int] = set()
        matches = NUMERIC_INLINE_BRACKETS_REGEX.findall(text)

        # Standardize en-dash and em-dash to regular hyphen
        for m in matches:
            normalized = m.replace("\u2013", "-").replace("\u2014", "-").replace("?", "-")
            tokens = [t.strip() for t in normalized.split(",") if t.strip()]

            for token in tokens:
                if "-" in token:
                    parts = token.split("-")
                    if len(parts) == 2:
                        try:
                            start = int(parts[0].strip())
                            end = int(parts[1].strip())
                            if 0 < start <= end and (end - start) < 100:
                                numbers.update(range(start, end + 1))
                        except ValueError:
                            pass
                else:
                    try:
                        val = int(token)
                        if val > 0:
                            numbers.add(val)
                    except ValueError:
                        pass

        return numbers

    def _extract_bib_entries(self, bib_text: str) -> Dict[int, str]:
        """
        Extracts numbered bibliography entries in [X] or X. formats.
        """
        entries: Dict[int, str] = {}

        # 1. Try Bracketed format [1] A. Author...
        bracket_matches = list(BIB_BRACKETED_ENTRY_REGEX.finditer(bib_text))
        if bracket_matches:
            for b in bracket_matches:
                try:
                    num = int(b.group(1))
                    entries[num] = b.group(2).strip()
                except ValueError:
                    pass
            return entries

        # 2. Try Dot-Numbered format: 1. A. Author...
        dot_matches = list(BIB_NUMBERED_DOT_REGEX.finditer(bib_text))
        if dot_matches:
            for d in dot_matches:
                try:
                    num = int(d.group(1))
                    entries[num] = d.group(2).strip()
                except ValueError:
                    pass

        return entries


