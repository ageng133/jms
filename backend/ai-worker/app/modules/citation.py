import re
from typing import List, Tuple, Set
import fitz

from app.models.audit import CitationCrosscheckModule
from app.modules.base import BaseAuditModule

# Regex patterns
NUMERIC_INLINE_REGEX = re.compile(r"\[(\d+(?:\s*,\s*\d+)*|\d+\s*-\s*\d+)\]")
AUTHOR_YEAR_INLINE_REGEX = re.compile(
    r"\b([A-Z][A-Za-z\-]+(?:\s+et\s+al\.)?)\s*\((\d{4}[a-z]?)\)"
    r"|\(([A-Z][A-Za-z\-]+(?:\s+et\s+al\.)?),\s*(\d{4}[a-z]?)\)"
)

BIBLIOGRAPHY_HEADER_REGEX = re.compile(
    r"(?i)\n\s*(?:references|daftar\s+pustaka|bibliography|literature\s+cited)\s*\n"
)
BIB_NUMERIC_ENTRY_REGEX = re.compile(r"\[(\d+)\]\s*([^\[\n]+)")


class CitationAuditor(BaseAuditModule):
    """
    Performs bidirectional citation cross-matching:
    1. Forward check: Are all inline citations present in the bibliography?
    2. Backward check: Are all bibliography entries cited at least once in the text?
    """

    def audit(self, doc: fitz.Document, **kwargs) -> Tuple[CitationCrosscheckModule, List[Tuple[int, List[int], str, str]]]:
        full_text = ""
        for page in doc:
            full_text += page.get_text("text") + "\n"

        annotations: List[Tuple[int, List[int], str, str]] = []

        # Split document into Body and Bibliography
        parts = BIBLIOGRAPHY_HEADER_REGEX.split(full_text, maxsplit=1)
        if len(parts) < 2:
            # Bibliography header not found
            return CitationCrosscheckModule(
                pass_=False,
                total_cited=0,
                uncited_references=[],
                missing_citations=["Bibliography header (References/Daftar Pustaka) not detected"],
            ), annotations

        body_text = parts[0]
        bib_text = parts[1]

        # 1. Parse Numeric Inline Citations [1], [2, 3], [4-6]
        inline_numbers: Set[int] = set()
        raw_inline_matches = NUMERIC_INLINE_REGEX.findall(body_text)

        for match in raw_inline_matches:
            if "-" in match:
                start, end = match.split("-")
                try:
                    s_int = int(start.strip())
                    e_int = int(end.strip())
                    inline_numbers.update(range(s_int, e_int + 1))
                except ValueError:
                    pass
            elif "," in match:
                for token in match.split(","):
                    try:
                        inline_numbers.add(int(token.strip()))
                    except ValueError:
                        pass
            else:
                try:
                    inline_numbers.add(int(match.strip()))
                except ValueError:
                    pass

        # 2. Parse Numeric Bibliography Entries
        bib_entries = {}
        for b_match in BIB_NUMERIC_ENTRY_REGEX.finditer(bib_text):
            idx = int(b_match.group(1))
            desc = b_match.group(2).strip()
            bib_entries[idx] = desc

        missing_citations: List[str] = []
        uncited_references: List[str] = []

        if bib_entries or inline_numbers:
            # Numeric cross-check
            for num in sorted(inline_numbers):
                if num not in bib_entries:
                    missing_citations.append(f"[{num}]")

            for idx, desc in bib_entries.items():
                if idx not in inline_numbers:
                    short_desc = desc[:45].strip() + "..." if len(desc) > 45 else desc.strip()
                    uncited_references.append(f"[{idx}] {short_desc}")

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
            # Check presence in bib_text
            for ca in cited_authors:
                author_key = ca.split("(")[0].strip()
                if author_key.lower() not in bib_text.lower():
                    missing_citations.append(ca)

        is_passed = len(missing_citations) == 0 and len(uncited_references) == 0

        return CitationCrosscheckModule(
            pass_=is_passed,
            total_cited=total_cited,
            uncited_references=uncited_references,
            missing_citations=missing_citations,
        ), annotations

