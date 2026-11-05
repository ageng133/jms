import logging
import re
from typing import Optional, List, Tuple, Dict, Any
import pymupdf as fitz

from app.models.audit import TemplateSpecs, TemplateRuleComparison

logger = logging.getLogger("jms-ai-worker")

MM_TO_PTS = 72.0 / 25.4  # 1 mm ≈ 2.83464567 pt
PTS_TO_MM = 25.4 / 72.0

GUIDELINE_KEYWORDS = [
    r"author\s+guidelines?",
    r"instructions?\s+(?:for|to)\s+authors?",
    r"pedoman\s+penulisan",
    r"petunjuk\s+(?:bagi|untuk)?\s*penulis",
    r"panduan\s+penulisan",
    r"aturan\s+penulisan",
    r"format\s+penulisan",
    r"gaya\s+selingkung",
    r"manuscript\s+preparation",
    r"guide\s+for\s+authors",
    r"tata\s+cara\s+penulisan",
    r"instruksi\s+(?:bagi|untuk)?\s*penulis",
]


class TemplateExtractor:
    """
    Intelligent Dual-Engine Journal Template Analyzer & DNA Extractor.
    Automatically classifies whether the uploaded journal template is:
      1. Aturan / Pedoman Penulisan (Author Guidelines with textual rules), OR
      2. Contoh Dokumen Jurnal (Sample Paper Template with physical geometry & typography).
    Then generates an exhaustive Comparative Audit Matrix between the target journal template
    and the author's draft manuscript.
    """

    def extract_specs(
        self,
        template_doc: fitz.Document,
        draft_doc: Optional[fitz.Document] = None,
        original_filename: Optional[str] = None,
    ) -> TemplateSpecs:
        if len(template_doc) == 0:
            logger.warning("Empty template document provided, using default baseline specs")
            return TemplateSpecs(name="Default Baseline (A4, 25.4mm)", source="default")

        # 1. Read document text to analyze whether it is an Author Guidelines or Sample Document
        full_text = " ".join(page.get_text() for page in template_doc[:6])

        is_guideline = any(re.search(pat, full_text, re.IGNORECASE) for pat in GUIDELINE_KEYWORDS)
        has_written_margins = bool(
            re.search(
                r"(?:margin|batas\s*tepi)\s*(?:atas|top|kiri|left|bawah|bottom|kanan|right)?\s*[:=]?\s*\d+",
                full_text,
                re.IGNORECASE,
            )
        )

        extracted_rules_summary: List[str] = []

        if is_guideline or (has_written_margins and len(template_doc) <= 5):
            # Engine A: Textual Guideline Rule Parser
            template_type = "AUTHOR_GUIDELINES"
            template_type_label = "Pedoman / Aturan Penulisan (Author Guidelines)"
            extraction_mode = "TEXTUAL_GUIDELINE_PARSER"
            specs_dict = self._parse_textual_guidelines(full_text, template_doc)
            extracted_rules_summary = specs_dict.pop("rules_summary", [])
        else:
            # Engine B: Physical Sample Document Inspector
            template_type = "SAMPLE_PAPER"
            template_type_label = "Contoh Dokumen Jurnal (Sample Paper Template)"
            extraction_mode = "GEOMETRIC_INSPECTION"
            specs_dict = self._inspect_sample_document(template_doc)
            extracted_rules_summary = specs_dict.pop("rules_summary", [])

        # Display Name
        doc_label = original_filename or f"Uploaded Journal Template ({specs_dict['page_format']})"
        tpl_name = f"{doc_label} • {specs_dict['column_count']}-Col (T:{specs_dict['margin_top_mm']} B:{specs_dict['margin_bottom_mm']} L:{specs_dict['margin_left_mm']} R:{specs_dict['margin_right_mm']}mm)"

        specs = TemplateSpecs(
            page_format=specs_dict["page_format"],
            page_width_mm=specs_dict["page_width_mm"],
            page_height_mm=specs_dict["page_height_mm"],
            margin_top_mm=specs_dict["margin_top_mm"],
            margin_bottom_mm=specs_dict["margin_bottom_mm"],
            margin_left_mm=specs_dict["margin_left_mm"],
            margin_right_mm=specs_dict["margin_right_mm"],
            column_count=specs_dict["column_count"],
            column_gap_mm=specs_dict.get("column_gap_mm"),
            is_custom_template=True,
            name=tpl_name,
            source="uploaded_template",
            template_type=template_type,
            template_type_label=template_type_label,
            extraction_mode=extraction_mode,
            detected_font_family=specs_dict.get("font_family"),
            detected_font_size_pt=specs_dict.get("font_size_pt"),
            detected_citation_style=specs_dict.get("citation_style"),
            double_blind_required=specs_dict.get("double_blind", True),
            extracted_rules_summary=extracted_rules_summary,
            comparison_matrix=[],
        )

        # 3. If draft_doc is provided, compute the comparative audit matrix
        if draft_doc:
            specs.comparison_matrix = self.build_comparison_matrix(specs, draft_doc)

        logger.info(
            f"Extracted template DNA [{template_type}]: format={specs.page_format}, "
            f"margins=[T:{specs.margin_top_mm}, B:{specs.margin_bottom_mm}, L:{specs.margin_left_mm}, R:{specs.margin_right_mm}], "
            f"cols={specs.column_count}, font={specs.detected_font_family} {specs.detected_font_size_pt}pt, cite={specs.detected_citation_style}"
        )

        return specs

    def _parse_textual_guidelines(self, text: str, doc: fitz.Document) -> Dict[str, Any]:
        """Engine A: Parses written instructions, numerical margin constraints, and typography rules."""
        rules_summary = []

        # 1. Page Format
        first_page = doc[0]
        rect = first_page.rect
        w_mm = round(rect.width * PTS_TO_MM, 1)
        h_mm = round(rect.height * PTS_TO_MM, 1)

        m_paper = re.search(r"(?:ukuran\s*kertas|paper\s*size)\s*[:=]?\s*(A4|Letter|B5|A5)", text, re.I)
        if m_paper:
            page_format = m_paper.group(1).upper()
        elif abs(w_mm - 210.0) <= 6.0 and abs(h_mm - 297.0) <= 6.0:
            page_format = "A4"
        elif abs(w_mm - 215.9) <= 6.0 and abs(h_mm - 279.4) <= 6.0:
            page_format = "Letter"
        else:
            page_format = f"Custom ({w_mm}x{h_mm}mm)"

        rules_summary.append(f"Ukuran Kertas: {page_format} ({w_mm} × {h_mm} mm)")

        # 2. Margins (Top, Bottom, Left, Right)
        # Check unified margin pattern: e.g. "atas 3cm, bawah 2.5cm, kiri 3cm, kanan 2.5cm"
        top_mm, bot_mm, left_mm, right_mm = 25.4, 25.4, 25.4, 25.4

        m_top = re.search(r"(?:margin|batas)?\s*(?:atas|top)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(cm|mm|inch|in)", text, re.I)
        if m_top:
            val, unit = float(m_top.group(1).replace(",", ".")), m_top.group(2).lower()
            top_mm = val * 10 if unit == "cm" else (val * 25.4 if "in" in unit else val)

        m_bot = re.search(r"(?:margin|batas)?\s*(?:bawah|bottom)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(cm|mm|inch|in)", text, re.I)
        if m_bot:
            val, unit = float(m_bot.group(1).replace(",", ".")), m_bot.group(2).lower()
            bot_mm = val * 10 if unit == "cm" else (val * 25.4 if "in" in unit else val)

        m_left = re.search(r"(?:margin|batas)?\s*(?:kiri|left)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(cm|mm|inch|in)", text, re.I)
        if m_left:
            val, unit = float(m_left.group(1).replace(",", ".")), m_left.group(2).lower()
            left_mm = val * 10 if unit == "cm" else (val * 25.4 if "in" in unit else val)

        m_right = re.search(r"(?:margin|batas)?\s*(?:kanan|right)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(cm|mm|inch|in)", text, re.I)
        if m_right:
            val, unit = float(m_right.group(1).replace(",", ".")), m_right.group(2).lower()
            right_mm = val * 10 if unit == "cm" else (val * 25.4 if "in" in unit else val)

        # Check all-sides uniform margin: e.g. "margin 3 cm di setiap sisi"
        m_uniform = re.search(r"(?:margin|batas)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(cm|mm|inch|in)\s*(?:di\s*semua\s*sisi|all\s*sides)", text, re.I)
        if m_uniform:
            val, unit = float(m_uniform.group(1).replace(",", ".")), m_uniform.group(2).lower()
            u_mm = val * 10 if unit == "cm" else (val * 25.4 if "in" in unit else val)
            top_mm, bot_mm, left_mm, right_mm = u_mm, u_mm, u_mm, u_mm

        rules_summary.append(f"Aturan Margin: Atas {top_mm:.1f}mm, Bawah {bot_mm:.1f}mm, Kiri {left_mm:.1f}mm, Kanan {right_mm:.1f}mm")

        # 3. Columns
        column_count = 1
        column_gap_mm = None
        m_col = re.search(r"(\d|satu|dua|tiga|single|two|double)\s*(?:kolom|column)", text, re.I)
        if m_col:
            word = m_col.group(1).lower()
            column_count = 2 if word in ("2", "dua", "two", "double") else (3 if word in ("3", "tiga") else 1)

        m_gap = re.search(r"jarak\s*(?:antar)?\s*kolom\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(cm|mm)", text, re.I)
        if m_gap:
            val, unit = float(m_gap.group(1).replace(",", ".")), m_gap.group(2).lower()
            column_gap_mm = round(val * 10 if unit == "cm" else val, 1)
        elif column_count == 2:
            column_gap_mm = 6.35

        rules_summary.append(f"Format Kolom: {column_count} Kolom" + (f" (Jarak Antar Kolom: {column_gap_mm} mm)" if column_gap_mm else ""))

        # 4. Typography (Font & Size)
        font_family = "Times New Roman"
        m_font = re.search(r"(?:font|huruf|tipe\s*huruf)\s*(?:menggunakan|adalah)?\s*[:=]?\s*(Times New Roman|Arial|Calibri|Garamond|Palatino)", text, re.I)
        if m_font:
            font_family = m_font.group(1)

        font_size_pt = 10.0
        m_pt = re.search(r"(?:ukuran\s*(?:font|huruf)?|font\s*size)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*pt", text, re.I)
        if m_pt:
            font_size_pt = float(m_pt.group(1).replace(",", "."))

        rules_summary.append(f"Tipografi: Font {font_family} {font_size_pt} pt")

        # 5. Citation Style
        citation_style = "IEEE Numeric [1]"
        m_cite = re.search(r"(?:gaya|style|format)\s*sitasi\s*[:=]?\s*(IEEE|APA|Harvard|Vancouver|Chicago|MLA)", text, re.I)
        if m_cite:
            c = m_cite.group(1).upper()
            citation_style = f"{c} ({'Numeric [1]' if c == 'IEEE' else 'Author, Year'})"
        elif "[1]" in text or "kurung siku" in text:
            citation_style = "IEEE Numeric [1]"

        rules_summary.append(f"Gaya Sitasi: {citation_style}")

        # 6. Double-blind policy
        double_blind = bool(re.search(r"double-blind|blind\s*review|tanpa\s*nama\s*penulis|hilangkan\s*identitas", text, re.I))
        if double_blind:
            rules_summary.append("Integritas Review: Double-Blind (Nama & afiliasi penulis harus dihilangkan)")

        return {
            "page_format": page_format,
            "page_width_mm": w_mm,
            "page_height_mm": h_mm,
            "margin_top_mm": round(top_mm, 1),
            "margin_bottom_mm": round(bot_mm, 1),
            "margin_left_mm": round(left_mm, 1),
            "margin_right_mm": round(right_mm, 1),
            "column_count": column_count,
            "column_gap_mm": column_gap_mm,
            "font_family": font_family,
            "font_size_pt": font_size_pt,
            "citation_style": citation_style,
            "double_blind": double_blind,
            "rules_summary": rules_summary,
        }

    def _inspect_sample_document(self, doc: fitz.Document) -> Dict[str, Any]:
        """Engine B: Inspects physical sample paper geometry, columns, font spans, and citation layout."""
        first_page = doc[0]
        rect = first_page.rect
        width_pts = rect.width
        height_pts = rect.height

        w_mm = round(width_pts * PTS_TO_MM, 1)
        h_mm = round(height_pts * PTS_TO_MM, 1)

        if abs(w_mm - 210.0) <= 6.0 and abs(h_mm - 297.0) <= 6.0:
            page_format = "A4"
        elif abs(w_mm - 215.9) <= 6.0 and abs(h_mm - 279.4) <= 6.0:
            page_format = "Letter"
        else:
            page_format = f"Custom ({w_mm}x{h_mm}mm)"

        # Collect verified body blocks across up to 3 pages
        all_body_blocks = []
        fonts = {}
        sizes = {}

        for page in doc[:3]:
            # Dict analysis for fonts
            pdict = page.get_text("dict")
            for b in pdict.get("blocks", []):
                if b.get("type") == 0:
                    for l in b.get("lines", []):
                        for s in l.get("spans", []):
                            fn = s.get("font", "")
                            sz = round(s.get("size", 0), 1)
                            t = s.get("text", "").strip()
                            if len(t) > 3 and not (s["bbox"][1] < 45 or s["bbox"][3] > page.rect.height - 45):
                                # Clean font name e.g. TimesNewRomanPSMT -> Times New Roman
                                clean_fn = fn.replace("PSMT", "").replace("-Regular", "").replace("-Italic", "").replace("-Bold", "")
                                if "Times" in clean_fn: clean_fn = "Times New Roman"
                                elif "Helvetica" in clean_fn: clean_fn = "Helvetica"
                                elif "Arial" in clean_fn: clean_fn = "Arial"
                                fonts[clean_fn] = fonts.get(clean_fn, 0) + len(t)
                                sizes[sz] = sizes.get(sz, 0) + len(t)

            for b in page.get_text("blocks"):
                if b[6] != 0: continue
                text = b[4].strip()
                if not text or len(text) < 15: continue
                if b[1] < 45 or b[3] > (page.rect.height - 45): continue
                all_body_blocks.append(b)

        if not all_body_blocks:
            return {
                "page_format": page_format,
                "page_width_mm": w_mm,
                "page_height_mm": h_mm,
                "margin_top_mm": 25.4,
                "margin_bottom_mm": 25.4,
                "margin_left_mm": 25.4,
                "margin_right_mm": 25.4,
                "column_count": 1,
                "column_gap_mm": None,
                "font_family": "Times New Roman",
                "font_size_pt": 10.0,
                "citation_style": "IEEE Numeric [1]",
                "double_blind": True,
                "rules_summary": [f"Ukuran Kertas: {page_format} (Default 25.4mm margin)"],
            }

        # Bounding box envelope for margins
        min_y0 = min(b[1] for b in all_body_blocks)
        max_y1 = max(b[3] for b in all_body_blocks)
        min_x0 = min(b[0] for b in all_body_blocks)
        max_x1 = max(b[2] for b in all_body_blocks)

        margin_top_mm = min(38.0, max(14.0, round(min_y0 * PTS_TO_MM, 1)))
        raw_bottom_pts = height_pts - max_y1
        if raw_bottom_pts > (height_pts * 0.45):
            margin_bottom_mm = margin_top_mm
        else:
            margin_bottom_mm = min(38.0, max(14.0, round(raw_bottom_pts * PTS_TO_MM, 1)))

        margin_left_mm = min(35.0, max(14.0, round(min_x0 * PTS_TO_MM, 1)))
        margin_right_mm = min(35.0, max(14.0, round((width_pts - max_x1) * PTS_TO_MM, 1)))

        # Column Detection
        full_width_count = 0
        col_width_count = 0
        left_col_count = 0
        right_col_count = 0
        midpoint = width_pts / 2.0

        for b in all_body_blocks:
            w = b[2] - b[0]
            ratio = w / width_pts
            if len(b[4].strip()) < 30: continue
            if ratio >= 0.55:
                full_width_count += 1
            elif 0.28 <= ratio <= 0.52:
                col_width_count += 1
                if b[0] < midpoint and b[2] < (midpoint + 40):
                    left_col_count += 1
                elif b[0] > (midpoint - 40):
                    right_col_count += 1

        column_count = 1
        column_gap_mm = None

        if left_col_count >= 1 and right_col_count >= 1:
            if full_width_count == 0 or (
                col_width_count >= 4
                and left_col_count >= 2
                and right_col_count >= 2
                and col_width_count > (full_width_count * 1.5)
            ):
                column_count = 2
                left_blocks = [b for b in all_body_blocks if b[0] < midpoint and b[2] < (midpoint + 30)]
                right_blocks = [b for b in all_body_blocks if b[0] > (midpoint - 30)]
                if left_blocks and right_blocks:
                    right_min_x0 = min(b[0] for b in right_blocks)
                    left_max_x1 = max(b[2] for b in left_blocks)
                    if right_min_x0 > left_max_x1:
                        column_gap_mm = round((right_min_x0 - left_max_x1) * PTS_TO_MM, 1)

        # Dominant typography
        font_family = "Times New Roman"
        if fonts:
            font_family = sorted(fonts.items(), key=lambda x: x[1], reverse=True)[0][0]

        font_size_pt = 10.0
        if sizes:
            font_size_pt = sorted(sizes.items(), key=lambda x: x[1], reverse=True)[0][0]

        # Citation style from text markers
        sample_text = " ".join(b[4] for b in all_body_blocks)
        citation_style = "IEEE Numeric [1]" if bool(re.search(r"\[\d+\]", sample_text)) else "APA / Harvard (Author, Year)"

        rules_summary = [
            f"Karakter Fisik Dokumen: {page_format} ({w_mm} × {h_mm} mm)",
            f"Batas Tepi Konten (Margin): Atas {margin_top_mm}mm, Bawah {margin_bottom_mm}mm, Kiri {margin_left_mm}mm, Kanan {margin_right_mm}mm",
            f"Struktur Kolom: {column_count} Kolom" + (f" (Jarak Gutter: {column_gap_mm} mm)" if column_gap_mm else ""),
            f"Tipografi Terdeteksi: {font_family} {font_size_pt} pt",
            f"Gaya Sitasi Terdeteksi: {citation_style}",
        ]

        return {
            "page_format": page_format,
            "page_width_mm": w_mm,
            "page_height_mm": h_mm,
            "margin_top_mm": margin_top_mm,
            "margin_bottom_mm": margin_bottom_mm,
            "margin_left_mm": margin_left_mm,
            "margin_right_mm": margin_right_mm,
            "column_count": column_count,
            "column_gap_mm": column_gap_mm,
            "font_family": font_family,
            "font_size_pt": font_size_pt,
            "citation_style": citation_style,
            "double_blind": True,
            "rules_summary": rules_summary,
        }

    def build_comparison_matrix(self, specs: TemplateSpecs, draft_doc: fitz.Document) -> List[TemplateRuleComparison]:
        """
        Engine C: Generates a high-density, side-by-side Comparative Audit Log
        directly contrasting the uploaded journal template specifications vs author draft.
        """
        matrix: List[TemplateRuleComparison] = []
        if len(draft_doc) == 0:
            return matrix

        first_page = draft_doc[0]
        rect = first_page.rect
        draft_w_mm = round(rect.width * PTS_TO_MM, 1)
        draft_h_mm = round(rect.height * PTS_TO_MM, 1)

        # 1. Page Format Check
        w_diff = abs(draft_w_mm - specs.page_width_mm)
        h_diff = abs(draft_h_mm - specs.page_height_mm)
        is_dim_match = w_diff <= 6.0 and h_diff <= 6.0
        matrix.append(
            TemplateRuleComparison(
                category="Page Format",
                rule_name="Ukuran & Dimensi Kertas",
                target_spec=f"{specs.page_format} ({specs.page_width_mm:.1f} × {specs.page_height_mm:.1f} mm)",
                draft_actual=f"{draft_w_mm:.1f} × {draft_h_mm:.1f} mm",
                status="MATCH" if is_dim_match else "BREACH",
                delta_note="Ukuran kertas sesuai" if is_dim_match else f"Selisih lebar: {w_diff:.1f}mm, tinggi: {h_diff:.1f}mm",
            )
        )

        # Measure Draft Margins & Columns
        draft_body = []
        for p in draft_doc[:3]:
            for b in p.get_text("blocks"):
                if b[6] == 0 and len(b[4].strip()) >= 15:
                    if not (b[1] < 25 or b[3] > p.rect.height - 25):
                        draft_body.append(b)

        if draft_body:
            min_y0 = min(b[1] for b in draft_body)
            max_y1 = max(b[3] for b in draft_body)
            min_x0 = min(b[0] for b in draft_body)
            max_x1 = max(b[2] for b in draft_body)

            draft_top = round(min_y0 * PTS_TO_MM, 1)
            draft_bot = round((rect.height - max_y1) * PTS_TO_MM, 1)
            draft_left = round(min_x0 * PTS_TO_MM, 1)
            draft_right = round((rect.width - max_x1) * PTS_TO_MM, 1)

            # 2. Top Margin
            top_pass = draft_top >= (specs.margin_top_mm - 2.0)
            top_delta = round(specs.margin_top_mm - draft_top, 1)
            matrix.append(
                TemplateRuleComparison(
                    category="Margins",
                    rule_name="Margin Atas (Top Margin)",
                    target_spec=f"≥ {specs.margin_top_mm:.1f} mm",
                    draft_actual=f"{draft_top:.1f} mm",
                    status="MATCH" if top_pass else "BREACH",
                    delta_note="Sesuai batas aman" if top_pass else f"Kurang {top_delta:.1f} mm dari template",
                )
            )

            # 3. Bottom Margin
            bot_pass = draft_bot >= (specs.margin_bottom_mm - 2.0)
            bot_delta = round(specs.margin_bottom_mm - draft_bot, 1)
            matrix.append(
                TemplateRuleComparison(
                    category="Margins",
                    rule_name="Margin Bawah (Bottom Margin)",
                    target_spec=f"≥ {specs.margin_bottom_mm:.1f} mm",
                    draft_actual=f"{draft_bot:.1f} mm",
                    status="MATCH" if bot_pass else "BREACH",
                    delta_note="Sesuai batas aman" if bot_pass else f"Kurang {bot_delta:.1f} mm dari template",
                )
            )

            # 4. Left Margin
            left_pass = draft_left >= (specs.margin_left_mm - 2.0)
            left_delta = round(specs.margin_left_mm - draft_left, 1)
            matrix.append(
                TemplateRuleComparison(
                    category="Margins",
                    rule_name="Margin Kiri (Left Margin)",
                    target_spec=f"≥ {specs.margin_left_mm:.1f} mm",
                    draft_actual=f"{draft_left:.1f} mm",
                    status="MATCH" if left_pass else "BREACH",
                    delta_note="Sesuai batas aman" if left_pass else f"Kurang {left_delta:.1f} mm dari template",
                )
            )

            # 5. Right Margin
            right_pass = draft_right >= (specs.margin_right_mm - 2.0)
            right_delta = round(specs.margin_right_mm - draft_right, 1)
            matrix.append(
                TemplateRuleComparison(
                    category="Margins",
                    rule_name="Margin Kanan (Right Margin)",
                    target_spec=f"≥ {specs.margin_right_mm:.1f} mm",
                    draft_actual=f"{draft_right:.1f} mm",
                    status="MATCH" if right_pass else "BREACH",
                    delta_note="Sesuai batas aman" if right_pass else f"Kurang {right_delta:.1f} mm dari template",
                )
            )

            # 6. Column Layout Check
            draft_full_w = sum(1 for b in draft_body if (b[2] - b[0]) / rect.width >= 0.55)
            draft_col_w = sum(1 for b in draft_body if 0.28 <= (b[2] - b[0]) / rect.width <= 0.52)
            draft_cols = 2 if (draft_col_w >= 4 and draft_col_w > draft_full_w * 1.5) else 1

            col_match = draft_cols == specs.column_count
            matrix.append(
                TemplateRuleComparison(
                    category="Columns",
                    rule_name="Struktur Kolom Teks",
                    target_spec=f"{specs.column_count} Kolom" + (f" (Gutter: {specs.column_gap_mm}mm)" if specs.column_gap_mm else ""),
                    draft_actual=f"{draft_cols} Kolom",
                    status="MATCH" if col_match else "BREACH",
                    delta_note="Format kolom sesuai" if col_match else f"Naskah dibuat {draft_cols} kolom, template mensyaratkan {specs.column_count} kolom",
                )
            )

        # 7. Citation System Check
        draft_full_text = " ".join(p.get_text() for p in draft_doc)
        draft_uses_numeric = bool(re.search(r"\[\d+\]", draft_full_text))
        draft_cite_label = "IEEE Numeric [1]" if draft_uses_numeric else "APA / Harvard (Author, Year)"

        target_is_numeric = "IEEE" in (specs.detected_citation_style or "IEEE") or "[1]" in (specs.detected_citation_style or "")
        cite_match = (target_is_numeric and draft_uses_numeric) or (not target_is_numeric and not draft_uses_numeric)

        matrix.append(
            TemplateRuleComparison(
                category="Citation",
                rule_name="Sistem Sitasi & Referensi",
                target_spec=specs.detected_citation_style or "IEEE Numeric [1]",
                draft_actual=draft_cite_label,
                status="MATCH" if cite_match else "WARNING",
                delta_note="Gaya rujukan selaras" if cite_match else f"Template memakai {specs.detected_citation_style}, draft memakai {draft_cite_label}",
            )
        )

        # 8. Review Anonymity Policy
        matrix.append(
            TemplateRuleComparison(
                category="Anonymity",
                rule_name="Pemeriksaan Double-Blind Review",
                target_spec="Wajib Anonim (Nama, Email, Afiliasi Dihilangkan)" if specs.double_blind_required else "Boleh Mencantumkan Penulis",
                draft_actual="Pemeriksaan Integritas Identitas",
                status="INFO",
                delta_note="Evaluasi kebocoran metadata dan baris byline pada naskah",
            )
        )

        return matrix
