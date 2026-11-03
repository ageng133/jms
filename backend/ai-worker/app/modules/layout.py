from typing import List, Tuple
import fitz

from app.config import settings
from app.models.audit import GeometryCheck, GeometryModule
from app.modules.base import BaseAuditModule

MM_TO_PTS = 72.0 / 25.4  # 1 mm ≈ 2.83464567 pt
PTS_TO_MM = 25.4 / 72.0


class LayoutAuditor(BaseAuditModule):
    """
    Audits PDF geometry, page margins, and bounding box compliance.
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

        self.top_pts = (top_mm - tolerance_mm) * MM_TO_PTS
        self.bottom_pts = (bottom_mm - tolerance_mm) * MM_TO_PTS
        self.left_pts = (left_mm - tolerance_mm) * MM_TO_PTS
        self.right_pts = (right_mm - tolerance_mm) * MM_TO_PTS

    def audit(self, doc: fitz.Document, **kwargs) -> Tuple[GeometryModule, List[Tuple[int, List[int], str, str]]]:
        """
        Returns:
            GeometryModule: Module output for JSON contract.
            List[Tuple[int, List[int], str, str]]: Annotation annotations list (page, bbox, rule, comment).
        """
        checks: List[GeometryCheck] = []
        annotations: List[Tuple[int, List[int], str, str]] = []

        for page_idx, page in enumerate(doc):
            rect = page.rect
            blocks = page.get_text("blocks")  # (x0, y0, x1, y1, text, block_no, block_type)

            for b in blocks:
                if b[6] != 0:  # Skip image/vector blocks
                    continue

                x0, y0, x1, y1, text = b[0], b[1], b[2], b[3], b[4].strip()
                if not text:
                    continue

                # Ignore trivial running headers or page numbers at extreme edges if single short token
                is_running_header_footer = len(text) <= 5 and (y0 < 20 or y1 > rect.height - 20)
                if is_running_header_footer:
                    continue

                # 1. Top Margin Breach
                if y0 < self.top_pts:
                    actual_mm = y0 * PTS_TO_MM
                    bbox = [int(round(coord)) for coord in (x0, y0, x1, y1)]
                    checks.append(GeometryCheck(
                        rule="MARGIN_TOP",
                        expected=f"{self.top_mm:.1f}mm",
                        actual=f"{actual_mm:.1f}mm",
                        passed=False,
                        page=page_idx + 1,
                        bbox=bbox,
                    ))
                    annotations.append((
                        page_idx,
                        bbox,
                        "MARGIN_TOP",
                        f"Top margin breach: {actual_mm:.1f}mm < {self.top_mm:.1f}mm"
                    ))

                # 2. Bottom Margin Breach
                if y1 > (rect.height - self.bottom_pts):
                    actual_mm = (rect.height - y1) * PTS_TO_MM
                    bbox = [int(round(coord)) for coord in (x0, y0, x1, y1)]
                    checks.append(GeometryCheck(
                        rule="MARGIN_BOTTOM",
                        expected=f"{self.bottom_mm:.1f}mm",
                        actual=f"{actual_mm:.1f}mm",
                        passed=False,
                        page=page_idx + 1,
                        bbox=bbox,
                    ))
                    annotations.append((
                        page_idx,
                        bbox,
                        "MARGIN_BOTTOM",
                        f"Bottom margin breach: {actual_mm:.1f}mm < {self.bottom_mm:.1f}mm"
                    ))

                # 3. Left Margin Breach
                if x0 < self.left_pts:
                    actual_mm = x0 * PTS_TO_MM
                    bbox = [int(round(coord)) for coord in (x0, y0, x1, y1)]
                    checks.append(GeometryCheck(
                        rule="MARGIN_LEFT",
                        expected=f"{self.left_mm:.1f}mm",
                        actual=f"{actual_mm:.1f}mm",
                        passed=False,
                        page=page_idx + 1,
                        bbox=bbox,
                    ))
                    annotations.append((
                        page_idx,
                        bbox,
                        "MARGIN_LEFT",
                        f"Left margin breach: {actual_mm:.1f}mm < {self.left_mm:.1f}mm"
                    ))

                # 4. Right Margin Breach
                if x1 > (rect.width - self.right_pts):
                    actual_mm = (rect.width - x1) * PTS_TO_MM
                    bbox = [int(round(coord)) for coord in (x0, y0, x1, y1)]
                    checks.append(GeometryCheck(
                        rule="MARGIN_RIGHT",
                        expected=f"{self.right_mm:.1f}mm",
                        actual=f"{actual_mm:.1f}mm",
                        passed=False,
                        page=page_idx + 1,
                        bbox=bbox,
                    ))
                    annotations.append((
                        page_idx,
                        bbox,
                        "MARGIN_RIGHT",
                        f"Right margin breach: {actual_mm:.1f}mm < {self.right_mm:.1f}mm"
                    ))

        is_passed = len(checks) == 0
        return GeometryModule(pass_=is_passed, checks=checks), annotations
