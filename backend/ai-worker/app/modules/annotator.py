import io
from typing import List, Tuple
import pymupdf as fitz

from app.modules.base import BaseAuditModule


class VisualPDFAnnotator(BaseAuditModule):
    """
    Renders visual bounding box overlays and sticky note annotations
    over detected formatting and anonymization violations using PyMuPDF.
    """

    def audit(self, doc: fitz.Document, **kwargs) -> bytes:
        annotations: List[Tuple[int, List[int], str, str]] = kwargs.get("annotations", [])
        return self.annotate_document(doc, annotations)

    def annotate_document(
        self,
        doc: fitz.Document,
        annotations: List[Tuple[int, List[int], str, str]],
    ) -> bytes:
        """
        Args:
            doc: PyMuPDF document instance.
            annotations: List of tuples (page_idx, bbox [x0, y0, x1, y1], rule_name, comment)
        Returns:
            bytes: Byte stream of the annotated PDF.
        """
        for page_idx, bbox, rule, comment in annotations:
            if page_idx >= len(doc):
                continue

            page = doc[page_idx]
            rect = fitz.Rect(bbox[0], bbox[1], bbox[2], bbox[3])

            # 1. Draw red bounding box rectangle
            page.draw_rect(
                rect,
                color=(1, 0, 0),       # RGB Red
                width=1.5,
                dashes="[3 2] 0",      # Dashed line for clean visual audit
            )

            # 2. Add sticky annotation icon with detail popup
            point = fitz.Point(bbox[0], max(0, bbox[1] - 5))
            annot = page.add_text_annot(point, f"[{rule}]\n{comment}")
            annot.set_colors(stroke=(1, 0, 0))
            annot.set_info(title="JMS AI Pre-Submission Auditor")
            annot.update()

        # Save to memory buffer with maximum compression & garbage collection
        out_buf = io.BytesIO()
        doc.save(out_buf, garbage=4, deflate=True)
        return out_buf.getvalue()

