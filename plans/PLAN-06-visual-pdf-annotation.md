# PLAN-06: Visual PDF Annotation Engine

**Plan ID:** PLAN-06  
**Component:** `backend/ai-worker/app/modules/annotator.py`  
**Target Release:** Thursday MVC (2026-11-05)  
**Assigned Persona:** Visual Systems & Document Dynamist (ISTP / ESFP)  
**Story Points:** 4 SP (6 Hours)  
**Status:** Completed / Verified  

---

## 1. Plan Objective
Implement a high-performance visual annotation engine using `PyMuPDF` (`fitz`) that draws dashed red bounding rectangles and popup sticky notes directly over formatting breaches and anonymization leaks, saving an optimized `annotated_v1.pdf` back to S3.

---

## 2. Technical Rendering Specifications

```mermaid
flowchart TD
    A[Detected Violation Coordinates: bbox, rule, comment] --> B[PyMuPDF Page Context]
    B --> C["Draw Dashed Red Rectangle<br/>color=(1, 0, 0), width=1.5, dashes='[3 2] 0'"]
    B --> D["Add Sticky Note Annotation<br/>point=(x0, y0-5), title='JMS AI Pre-Submission Auditor'"]
    C & D --> E["doc.save(out_buf, garbage=4, deflate=True)"]
    E --> F[Upload to S3: audits/annotated_{audit_id}.pdf]
```

* **Color Palette & Stroke:**
  - Border Stroke: RGB Red `(1, 0, 0)`
  - Stroke Width: `1.5 pt`
  - Stroke Style: Dashed line `[3 2] 0` for clear visual distinction from document content.
* **Sticky Popup Note:**
  - Anchor point: Top-left corner `fitz.Point(bbox[0], max(0, bbox[1] - 5))`
  - Annotation Title: `"JMS AI Pre-Submission Auditor"`
  - Annotation Text: `[{rule}]\n{comment}`
* **Memory & Storage Optimization:**
  - `doc.save(out_buf, garbage=4, deflate=True)` removes unused objects and deflates content streams to minimize S3 storage costs.

---

## 3. Sub-Task Drilldown

* **TSK-304.1: Multi-Page Annotation Traversal**
  - Group annotations by page index.
  - Skip annotations if page index exceeds document bounds.

* **TSK-304.2: Vector Overlay & Annotation Burning**
  - Call `page.draw_rect(fitz.Rect(bbox), color=(1, 0, 0), width=1.5)`.
  - Call `annot = page.add_text_annot(point, text)` and `annot.update()`.

* **TSK-304.3: S3 Persistence & Metadata Link**
  - Store byte buffer to S3 under `audits/annotated_{audit_id}.pdf`.
  - Update `pre_submission_audits.annotated_pdf_s3_key` in PostgreSQL.

---

## 4. Definition of Done (DoD)
- [x] Generated PDF opens cleanly in Adobe Acrobat, Apple Preview, and Chrome PDF Viewer.
- [x] Sticky note popups open with detailed remediation advice upon clicking.
- [x] Total PDF file size increases by less than 10% after annotation injection.
