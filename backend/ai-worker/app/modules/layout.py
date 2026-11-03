from typing import List, Tuple, Optional
import fitz

from app.config import settings
from app.models.audit import GeometryCheck, GeometryModule, TemplateSpecs
from app.modules.base import BaseAuditModule

MM_TO_PTS = 72.0 / 25.4  # 1 mm ≈ 2.83464567 pt
PTS_TO_MM = 25.4 / 72.0


class LayoutAuditor(BaseAuditModule):
    """
    Audits PDF geometry, page margins, and column compliance against target
    Journal Template specifications or IEEE defaults.
    Flags margin violations with exact [x0, y0, x1, y1] coordinates.
    """

    def __init__(
        self,
        top_mm: float = settings.MARGIN_TOP_MM,
        bottom_mm: float = settings.MARGIN_BOTTOM_MM,
        left_mm: float = settings.MARGIN_LEFT_MM,
        right_mm: float = settings.MARGIN_RIGHT_MM,
        tolerance_mm: float = settings.MARGIN_TOLERANCE_MM,
    ):
        self.top_mm = top_mm
        self.bottom_mm = bottom_mm
        self.left_mm = left_mm
        self.right_mm = right_mm
        self.tolerance_mm = tolerance_mm

    def audit(
        self,
        doc: fitz.Document,
        template_specs: Optional[TemplateSpecs] = None,
        **kwargs,
    ) -> Tuple[GeometryModule, List[Tuple[int, List[int], str, str]]]:
        """
        Audits document against template specs (or defaults).
        Returns:
            GeometryModule: Module output for JSON contract.
            List[Tuple[int, List[int], str, str]]: Annotation list (page, bbox, rule, comment).
        """
        checks: List[GeometryCheck] = []
        annotations: List[Tuple[int, List[int], str, str]] = []

        # Target specs from template or defaults
        target_top_mm = template_specs.margin_top_mm if template_specs else self.top_mm
        target_bottom_mm = template_specs.margin_bottom_mm if template_specs else self.bottom_mm
        target_left_mm = template_specs.margin_left_mm if template_specs else self.left_mm
        target_right_mm = template_specs.margin_right_mm if template_specs else self.right_mm

        top_pts = (target_top_mm - self.tolerance_mm) * MM_TO_PTS
        bottom_pts = (target_bottom_mm - self.tolerance_mm) * MM_TO_PTS
        left_pts = (target_left_mm - self.tolerance_mm) * MM_TO_PTS
        right_pts = (target_right_mm - self.tolerance_mm) * MM_TO_PTS

        for page_idx, page in enumerate(doc):
            rect = page.rect
            page_width_mm = rect.width * PTS_TO_MM
            page_height_mm = rect.height * PTS_TO_MM

            # 1. Page Dimensions Check against Template
            if template_specs:
                width_diff = abs(page_width_mm - template_specs.page_width_mm)
                height_diff = abs(page_height_mm - template_specs.page_height_mm)
                if width_diff > 6.0 or height_diff > 6.0:
                    bbox = [0, 0, int(round(rect.width)), int(round(rect.height))]
                    checks.append(GeometryCheck(
                        rule="PAGE_DIMENSIONS",
                        expected=f"{template_specs.page_format} ({template_specs.page_width_mm:.1f}x{template_specs.page_height_mm:.1f}mm)",
                        actual=f"{page_width_mm:.1f}x{page_height_mm:.1f}mm",
                        passed=False,
                        page=page_idx + 1,
                        bbox=bbox,
                    ))
                    annotations.append((
                        page_idx,
                        [10, 10, int(rect.width - 10), 40],
                        "PAGE_DIMENSIONS",
                        f"Page dimensions mismatch: expected {template_specs.page_format} "
                        f"({template_specs.page_width_mm:.1f}x{template_specs.page_height_mm:.1f}mm), "
                        f"actual is {page_width_mm:.1f}x{page_height_mm:.1f}mm"
                    ))

            blocks = page.get_text("blocks")  # (x0, y0, x1, y1, text, block_no, block_type)

            for b in blocks:
                if b[6] != 0:  # Skip image/vector blocks
                    continue

                x0, y0, x1, y1, text = b[0], b[1], b[2], b[3], b[4].strip()
                if not text:
                    continue

                # Ignore running headers or page numbers at extreme edges if single short token
                is_running_header_footer = len(text) <= 5 and (y0 < 20 or y1 > rect.height - 20)
                if is_running_header_footer:
                    continue

                # 2. Top Margin Breach
                if y0 < top_pts:
                    actual_mm = y0 * PTS_TO_MM
                    bbox = [int(round(coord)) for coord in (x0, y0, x1, y1)]
                    checks.append(GeometryCheck(
                        rule="MARGIN_TOP",
                        expected=f"{target_top_mm:.1f}mm",
                        actual=f"{actual_mm:.1f}mm",
                        passed=False,
                        page=page_idx + 1,
                        bbox=bbox,
                    ))
                    annotations.append((
                        page_idx,
                        bbox,
                        "MARGIN_TOP",
                        f"Top margin breach against template: {actual_mm:.1f}mm < {target_top_mm:.1f}mm"
                    ))

                # 3. Bottom Margin Breach
                if y1 > (rect.height - bottom_pts):
                    actual_mm = (rect.height - y1) * PTS_TO_MM
                    bbox = [int(round(coord)) for coord in (x0, y0, x1, y1)]
                    checks.append(GeometryCheck(
                        rule="MARGIN_BOTTOM",
                        expected=f"{target_bottom_mm:.1f}mm",
                        actual=f"{actual_mm:.1f}mm",
                        passed=False,
                        page=page_idx + 1,
                        bbox=bbox,
                    ))
                    annotations.append((
                        page_idx,
                        bbox,
                        "MARGIN_BOTTOM",
                        f"Bottom margin breach against template: {actual_mm:.1f}mm < {target_bottom_mm:.1f}mm"
                    ))

                # 4. Left Margin Breach
                if x0 < left_pts:
                    actual_mm = x0 * PTS_TO_MM
                    bbox = [int(round(coord)) for coord in (x0, y0, x1, y1)]
                    checks.append(GeometryCheck(
                        rule="MARGIN_LEFT",
                        expected=f"{target_left_mm:.1f}mm",
                        actual=f"{actual_mm:.1f}mm",
                        passed=False,
                        page=page_idx + 1,
                        bbox=bbox,
                    ))
                    annotations.append((
                        page_idx,
                        bbox,
                        "MARGIN_LEFT",
                        f"Left margin breach against template: {actual_mm:.1f}mm < {target_left_mm:.1f}mm"
                    ))

                # 5. Right Margin Breach
                if x1 > (rect.width - right_pts):
                    actual_mm = (rect.width - x1) * PTS_TO_MM
                    bbox = [int(round(coord)) for coord in (x0, y0, x1, y1)]
                    checks.append(GeometryCheck(
                        rule="MARGIN_RIGHT",
                        expected=f"{target_right_mm:.1f}mm",
                        actual=f"{actual_mm:.1f}mm",
                        passed=False,
                        page=page_idx + 1,
                        bbox=bbox,
                    ))
                    annotations.append((
                        page_idx,
                        bbox,
                        "MARGIN_RIGHT",
                        f"Right margin breach against template: {actual_mm:.1f}mm < {target_right_mm:.1f}mm"
                    ))

                # 6. Column Layout Compliance Check
                if template_specs and template_specs.column_count == 2:
                    # If page 2+ or lower half of page 1, body blocks must not span full width
                    is_lower_or_subsequent = (page_idx > 0) or (y0 > rect.height * 0.35)
                    block_width = x1 - x0
                    if is_lower_or_subsequent and block_width > (rect.width * 0.65) and len(text) > 80:
                        bbox = [int(round(coord)) for coord in (x0, y0, x1, y1)]
                        checks.append(GeometryCheck(
                            rule="COLUMN_LAYOUT",
                            expected="2-Column Grid",
                            actual="Full-width Block spanning columns",
                            passed=False,
                            page=page_idx + 1,
                            bbox=bbox,
                        ))
                        annotations.append((
                            page_idx,
                            bbox,
                            "COLUMN_LAYOUT",
                            "Layout breach: Template specifies a 2-column format, but full-width block was detected."
                        ))

        is_passed = len(checks) == 0
        return GeometryModule(pass_=is_passed, checks=checks), annotations

