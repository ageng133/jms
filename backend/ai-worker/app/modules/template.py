import logging
from typing import Optional
import pymupdf as fitz

from app.models.audit import TemplateSpecs

logger = logging.getLogger("jms-ai-worker")

MM_TO_PTS = 72.0 / 25.4  # 1 mm ≈ 2.83464567 pt
PTS_TO_MM = 25.4 / 72.0


class TemplateExtractor:
    """
    Extracts geometric specifications and layout constraints from an uploaded
    Journal Template PDF (e.g. A4 vs Letter dimensions, margins, and column layouts).
    """

    def extract_specs(self, template_doc: fitz.Document) -> TemplateSpecs:
        if len(template_doc) == 0:
            logger.warning("Empty template document provided, using default IEEE/A4 template specs")
            return TemplateSpecs(name="Default (A4, 25.4mm)", source="default")

        first_page = template_doc[0]
        rect = first_page.rect
        width_pts = rect.width
        height_pts = rect.height

        width_mm = round(width_pts * PTS_TO_MM, 1)
        height_mm = round(height_pts * PTS_TO_MM, 1)

        # 1. Detect Page Format
        if abs(width_mm - 210.0) <= 6.0 and abs(height_mm - 297.0) <= 6.0:
            page_format = "A4"
        elif abs(width_mm - 215.9) <= 6.0 and abs(height_mm - 279.4) <= 6.0:
            page_format = "Letter"
        else:
            page_format = f"Custom ({width_mm}x{height_mm}mm)"

        # 2. Collect verified body text blocks across up to 3 pages
        # Exclude running headers, footers, page numbering, and isolated badges (< 45pt from edges)
        all_body_blocks = []
        for page in template_doc[:3]:
            blocks = page.get_text("blocks")
            for b in blocks:
                if b[6] != 0:  # Skip image/graphics
                    continue
                text = b[4].strip()
                if not text or len(text) < 15:
                    continue
                # Skip running headers / footers (< 45pt from top or bottom)
                if b[1] < 45 or b[3] > (page.rect.height - 45):
                    continue
                all_body_blocks.append(b)

        if not all_body_blocks:
            return TemplateSpecs(
                page_format=page_format,
                page_width_mm=width_mm,
                page_height_mm=height_mm,
                margin_top_mm=25.4,
                margin_bottom_mm=25.4,
                margin_left_mm=25.4,
                margin_right_mm=25.4,
                column_count=1,
                is_custom_template=True,
                name=f"Custom Template ({page_format}, 1-Col, 25.4mm)",
                source="uploaded_template",
            )

        # 3. Calculate bounding box envelope for margins
        min_y0 = min(b[1] for b in all_body_blocks)
        max_y1 = max(b[3] for b in all_body_blocks)
        min_x0 = min(b[0] for b in all_body_blocks)
        max_x1 = max(b[2] for b in all_body_blocks)

        raw_top_mm = round(min_y0 * PTS_TO_MM, 1)
        # Clamp top margin to standard academic bounds [14.0mm, 38.0mm]
        margin_top_mm = min(38.0, max(14.0, raw_top_mm))

        raw_bottom_pts = height_pts - max_y1
        if raw_bottom_pts > (height_pts * 0.45):
            margin_bottom_mm = margin_top_mm
        else:
            raw_bot_mm = round(raw_bottom_pts * PTS_TO_MM, 1)
            margin_bottom_mm = min(38.0, max(14.0, raw_bot_mm))

        raw_left_mm = round(min_x0 * PTS_TO_MM, 1)
        margin_left_mm = min(35.0, max(14.0, raw_left_mm))

        raw_right_mm = round((width_pts - max_x1) * PTS_TO_MM, 1)
        margin_right_mm = min(35.0, max(14.0, raw_right_mm))

        # 4. Robust Column Detection:
        # Academic multi-column formats (e.g. IEEE, Nature) are characterized by having
        # multiple substantial paragraph blocks running in both columns, with paragraph
        # width occupying 30% - 50% of the page.
        # Single-column documents (or reports with occasional side-by-side tables/code blocks)
        # have dominant body paragraphs spanning >= 55% of the page width.
        column_count = 1
        column_gap_mm: Optional[float] = None

        full_width_count = 0
        column_width_count = 0
        left_col_count = 0
        right_col_count = 0
        midpoint = width_pts / 2.0

        for b in all_body_blocks:
            w = b[2] - b[0]
            w_ratio = w / width_pts
            text = b[4].strip()
            # Only count substantial paragraphs (at least 30 chars)
            if len(text) < 30:
                continue

            if w_ratio >= 0.55:
                full_width_count += 1
            elif 0.28 <= w_ratio <= 0.52:
                column_width_count += 1
                if b[0] < midpoint and b[2] < (midpoint + 40):
                    left_col_count += 1
                elif b[0] > (midpoint - 40):
                    right_col_count += 1

        # A true 2-column paper has substantial column-width blocks in both columns:
        # Either no full-width body blocks (pure 2-col template), or column blocks heavily dominate (> 1.5x full-width blocks)
        is_two_column = False
        if left_col_count >= 1 and right_col_count >= 1:
            if full_width_count == 0:
                is_two_column = True
            elif (
                column_width_count >= 4
                and left_col_count >= 2
                and right_col_count >= 2
                and column_width_count > (full_width_count * 1.5)
            ):
                is_two_column = True

        if is_two_column:
            column_count = 2
            left_blocks = [b for b in all_body_blocks if b[0] < midpoint and b[2] < (midpoint + 30)]
            right_blocks = [b for b in all_body_blocks if b[0] > (midpoint - 30)]
            if left_blocks and right_blocks:
                right_min_x0 = min(b[0] for b in right_blocks)
                left_max_x1 = max(b[2] for b in left_blocks)
                if right_min_x0 > left_max_x1:
                    column_gap_mm = round((right_min_x0 - left_max_x1) * PTS_TO_MM, 1)

        tpl_name = f"Uploaded Template ({page_format}, {column_count}-Col, Margins: T:{margin_top_mm} B:{margin_bottom_mm} L:{margin_left_mm} R:{margin_right_mm}mm)"

        logger.info(
            f"Extracted template specs: format={page_format}, margins=[T:{margin_top_mm}, B:{margin_bottom_mm}, "
            f"L:{margin_left_mm}, R:{margin_right_mm}], cols={column_count}"
        )

        return TemplateSpecs(
            page_format=page_format,
            page_width_mm=width_mm,
            page_height_mm=height_mm,
            margin_top_mm=margin_top_mm,
            margin_bottom_mm=margin_bottom_mm,
            margin_left_mm=margin_left_mm,
            margin_right_mm=margin_right_mm,
            column_count=column_count,
            column_gap_mm=column_gap_mm,
            is_custom_template=True,
            name=tpl_name,
            source="uploaded_template",
        )
