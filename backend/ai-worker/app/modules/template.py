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
            return TemplateSpecs()

        first_page = template_doc[0]
        rect = first_page.rect
        width_pts = rect.width
        height_pts = rect.height

        width_mm = round(width_pts * PTS_TO_MM, 1)
        height_mm = round(height_pts * PTS_TO_MM, 1)

        # Detect Page Format
        if abs(width_mm - 210.0) <= 6.0 and abs(height_mm - 297.0) <= 6.0:
            page_format = "A4"
        elif abs(width_mm - 215.9) <= 6.0 and abs(height_mm - 279.4) <= 6.0:
            page_format = "Letter"
        else:
            page_format = f"Custom ({width_mm}x{height_mm}mm)"

        # Collect text blocks across pages (up to 3 pages)
        all_body_blocks = []
        for page in template_doc[:3]:
            blocks = page.get_text("blocks")
            for b in blocks:
                if b[6] != 0:  # Skip image/graphics
                    continue
                text = b[4].strip()
                if not text or len(text) <= 3:
                    continue
                # Skip running headers / footers (< 25pt from edges)
                if b[1] < 25 or b[3] > (page.rect.height - 25):
                    continue
                all_body_blocks.append(b)

        if not all_body_blocks:
            # Fallback to standard 20mm margins if template is blank / graphical placeholder
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
            )

        # Calculate bounding box envelope for margins
        min_y0 = min(b[1] for b in all_body_blocks)
        max_y1 = max(b[3] for b in all_body_blocks)
        min_x0 = min(b[0] for b in all_body_blocks)
        max_x1 = max(b[2] for b in all_body_blocks)

        margin_top_mm = max(10.0, round(min_y0 * PTS_TO_MM, 1))
        
        # If content only covers top half of the template page, do not infer huge bottom margin
        raw_bottom_margin_pts = height_pts - max_y1
        if raw_bottom_margin_pts > (height_pts * 0.45):
            margin_bottom_mm = margin_top_mm
        else:
            margin_bottom_mm = max(10.0, round(raw_bottom_margin_pts * PTS_TO_MM, 1))

        margin_left_mm = max(10.0, round(min_x0 * PTS_TO_MM, 1))
        margin_right_mm = max(10.0, round((width_pts - max_x1) * PTS_TO_MM, 1))

        # Detect Column Count (1 vs 2 columns)
        column_count = 1
        column_gap_mm: Optional[float] = None

        # Analyze horizontal block start positions
        x0_coords = [b[0] for b in all_body_blocks]
        midpoint = width_pts / 2.0
        left_column_blocks = [b for b in all_body_blocks if b[0] < midpoint and b[2] < (midpoint + 30)]
        right_column_blocks = [b for b in all_body_blocks if b[0] > (midpoint - 30)]

        if len(left_column_blocks) >= 1 and len(right_column_blocks) >= 1:
            column_count = 2
            right_min_x0 = min(b[0] for b in right_column_blocks)
            left_max_x1 = max(b[2] for b in left_column_blocks)
            if right_min_x0 > left_max_x1:
                column_gap_mm = round((right_min_x0 - left_max_x1) * PTS_TO_MM, 1)

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
        )
