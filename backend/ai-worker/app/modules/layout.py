from typing import List, Tuple, Optional
import pymupdf as fitz

from app.config import settings
from app.models.audit import GeometryCheck, GeometryModule, TemplateSpecs
from app.modules.base import BaseAuditModule

MM_TO_PTS = 72.0 / 25.4  # 1 mm ≈ 2.83464567 pt
PTS_TO_MM = 25.4 / 72.0


class LayoutAuditor(BaseAuditModule):
    """
    Audits PDF geometry, page margins, and column compliance against target
    Journal Template specifications or IEEE defaults.
    Consolidates margin violations per page to provide clean, non-repetitive,
    actionable audit feedback.
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

        top_limit_pts = (target_top_mm - self.tolerance_mm) * MM_TO_PTS
        bottom_limit_pts = (target_bottom_mm - self.tolerance_mm) * MM_TO_PTS
        left_limit_pts = (target_left_mm - self.tolerance_mm) * MM_TO_PTS
        right_limit_pts = (target_right_mm - self.tolerance_mm) * MM_TO_PTS

        for page_idx, page in enumerate(doc):
            rect = page.rect
            page_width_mm = rect.width * PTS_TO_MM
            page_height_mm = rect.height * PTS_TO_MM

            # 1. Page Dimensions Check against Template
            if template_specs and template_specs.page_width_mm > 0:
                width_diff = abs(page_width_mm - template_specs.page_width_mm)
                height_diff = abs(page_height_mm - template_specs.page_height_mm)
                if width_diff > 6.0 or height_diff > 6.0:
                    bbox = [0, 0, int(round(rect.width)), int(round(rect.height))]
                    exp_fmt = f"{template_specs.page_format} ({template_specs.page_width_mm:.1f} × {template_specs.page_height_mm:.1f} mm)"
                    act_fmt = f"{page_width_mm:.1f} × {page_height_mm:.1f} mm"
                    comment = (
                        f"Page dimensions mismatch on Page {page_idx + 1}: Target template specifies {exp_fmt}, "
                        f"but manuscript page is {act_fmt}."
                    )
                    checks.append(GeometryCheck(
                        rule="PAGE_DIMENSIONS",
                        expected=exp_fmt,
                        actual=act_fmt,
                        passed=False,
                        page=page_idx + 1,
                        bbox=bbox,
                    ))
                    annotations.append((
                        page_idx,
                        [10, 10, int(rect.width - 10), 35],
                        "PAGE_DIMENSIONS",
                        comment,
                    ))

            blocks = page.get_text("blocks")  # (x0, y0, x1, y1, text, block_no, block_type)

            top_breaches = []
            bottom_breaches = []
            left_breaches = []
            right_breaches = []
            column_breaches = []

            for b in blocks:
                if b[6] != 0:  # Skip image/graphics
                    continue

                text = b[4].strip()
                if not text or len(text) < 5:
                    continue

                # Ignore isolated running headers/footers or page numbers (< 25pt from edges)
                is_running_edge = len(text) <= 30 and (b[1] < 25 or b[3] > rect.height - 25)
                if is_running_edge:
                    continue

                x0, y0, x1, y1 = b[0], b[1], b[2], b[3]

                # Margin checks
                if y0 < top_limit_pts:
                    top_breaches.append(b)
                if y1 > (rect.height - bottom_limit_pts):
                    bottom_breaches.append(b)
                if x0 < left_limit_pts:
                    left_breaches.append(b)
                if x1 > (rect.width - right_limit_pts):
                    right_breaches.append(b)

                # Column layout check (if target template is 2-column)
                if template_specs and template_specs.column_count == 2:
                    is_lower_or_subsequent = (page_idx > 0) or (y0 > rect.height * 0.35)
                    block_width = x1 - x0
                    if is_lower_or_subsequent and block_width > (rect.width * 0.65) and len(text) > 80:
                        column_breaches.append(b)

            # 2. Consolidated Top Margin Breach for this page
            if top_breaches:
                min_y0 = min(b[1] for b in top_breaches)
                actual_mm = round(min_y0 * PTS_TO_MM, 1)
                bbox = [
                    int(min(b[0] for b in top_breaches)),
                    int(min_y0),
                    int(max(b[2] for b in top_breaches)),
                    int(max(b[3] for b in top_breaches)),
                ]
                delta_mm = round(target_top_mm - actual_mm, 1)
                comment = (
                    f"Top margin breach on Page {page_idx + 1}: Content starts at {actual_mm:.1f} mm "
                    f"(required: ≥ {target_top_mm:.1f} mm). Increase top margin by at least {delta_mm:.1f} mm."
                )
                checks.append(GeometryCheck(
                    rule="MARGIN_TOP",
                    expected=f"≥ {target_top_mm:.1f} mm",
                    actual=f"{actual_mm:.1f} mm ({len(top_breaches)} block(s) affected)",
                    passed=False,
                    page=page_idx + 1,
                    bbox=bbox,
                ))
                annotations.append((page_idx, bbox, "MARGIN_TOP", comment))

            # 3. Consolidated Bottom Margin Breach for this page
            if bottom_breaches:
                max_y1 = max(b[3] for b in bottom_breaches)
                actual_mm = round((rect.height - max_y1) * PTS_TO_MM, 1)
                bbox = [
                    int(min(b[0] for b in bottom_breaches)),
                    int(min(b[1] for b in bottom_breaches)),
                    int(max(b[2] for b in bottom_breaches)),
                    int(max_y1),
                ]
                delta_mm = round(target_bottom_mm - actual_mm, 1)
                comment = (
                    f"Bottom margin breach on Page {page_idx + 1}: Outermost text extends to {actual_mm:.1f} mm "
                    f"from bottom (required: ≥ {target_bottom_mm:.1f} mm). Increase bottom margin by at least {delta_mm:.1f} mm."
                )
                checks.append(GeometryCheck(
                    rule="MARGIN_BOTTOM",
                    expected=f"≥ {target_bottom_mm:.1f} mm",
                    actual=f"{actual_mm:.1f} mm ({len(bottom_breaches)} block(s) affected)",
                    passed=False,
                    page=page_idx + 1,
                    bbox=bbox,
                ))
                annotations.append((page_idx, bbox, "MARGIN_BOTTOM", comment))

            # 4. Consolidated Left Margin Breach for this page
            if left_breaches:
                min_x0 = min(b[0] for b in left_breaches)
                actual_mm = round(min_x0 * PTS_TO_MM, 1)
                bbox = [
                    int(min_x0),
                    int(min(b[1] for b in left_breaches)),
                    int(max(b[2] for b in left_breaches)),
                    int(max(b[3] for b in left_breaches)),
                ]
                delta_mm = round(target_left_mm - actual_mm, 1)
                comment = (
                    f"Left margin breach on Page {page_idx + 1}: Leftmost content starts at {actual_mm:.1f} mm "
                    f"(required: ≥ {target_left_mm:.1f} mm). {len(left_breaches)} text block(s) breach margin by up to {delta_mm:.1f} mm."
                )
                checks.append(GeometryCheck(
                    rule="MARGIN_LEFT",
                    expected=f"≥ {target_left_mm:.1f} mm",
                    actual=f"{actual_mm:.1f} mm ({len(left_breaches)} block(s) affected)",
                    passed=False,
                    page=page_idx + 1,
                    bbox=bbox,
                ))
                annotations.append((page_idx, bbox, "MARGIN_LEFT", comment))

            # 5. Consolidated Right Margin Breach for this page
            if right_breaches:
                max_x1 = max(b[2] for b in right_breaches)
                actual_mm = round((rect.width - max_x1) * PTS_TO_MM, 1)
                bbox = [
                    int(min(b[0] for b in right_breaches)),
                    int(min(b[1] for b in right_breaches)),
                    int(max_x1),
                    int(max(b[3] for b in right_breaches)),
                ]
                delta_mm = round(target_right_mm - actual_mm, 1)
                comment = (
                    f"Right margin breach on Page {page_idx + 1}: Text extends to {actual_mm:.1f} mm "
                    f"from right edge (required: ≥ {target_right_mm:.1f} mm). {len(right_breaches)} block(s) affected."
                )
                checks.append(GeometryCheck(
                    rule="MARGIN_RIGHT",
                    expected=f"≥ {target_right_mm:.1f} mm",
                    actual=f"{actual_mm:.1f} mm ({len(right_breaches)} block(s) affected)",
                    passed=False,
                    page=page_idx + 1,
                    bbox=bbox,
                ))
                annotations.append((page_idx, bbox, "MARGIN_RIGHT", comment))

            # 6. Consolidated Column Layout Compliance Check for this page
            if column_breaches:
                bbox = [
                    int(min(b[0] for b in column_breaches)),
                    int(min(b[1] for b in column_breaches)),
                    int(max(b[2] for b in column_breaches)),
                    int(max(b[3] for b in column_breaches)),
                ]
                comment = (
                    f"Column layout breach on Page {page_idx + 1}: Template specifies a 2-column grid, "
                    f"but {len(column_breaches)} full-width paragraph block(s) span across columns."
                )
                checks.append(GeometryCheck(
                    rule="COLUMN_LAYOUT",
                    expected="2-Column Grid",
                    actual=f"{len(column_breaches)} full-width block(s)",
                    passed=False,
                    page=page_idx + 1,
                    bbox=bbox,
                ))
                annotations.append((page_idx, bbox, "COLUMN_LAYOUT", comment))

        is_passed = len(checks) == 0
        return GeometryModule(pass_=is_passed, checks=checks), annotations
