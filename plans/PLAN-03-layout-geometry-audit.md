# PLAN-03: AI Layout & Geometry Audit Module

**Plan ID:** PLAN-03  
**Component:** `backend/ai-worker/app/modules/layout.py`  
**Target Release:** Thursday MVC (2026-11-05)  
**Assigned Persona:** Computational Geometry Engineer (ISTP / INTJ)  
**Story Points:** 5 SP (8 Hours)  
**Status:** Completed / Verified  

---

## 1. Plan Objective
Develop a deterministic document geometry and layout analysis engine using `PyMuPDF` (`fitz`) to verify page margins (top, bottom, left, right) in millimeters and points, identifying non-compliant text blocks and recording bounding boxes `[x0, y0, x1, y1]`.

---

## 2. Technical Specifications & Math Formulation

* **Coordinate System & Conversion:**
  - PDF native coordinate space uses PostScript Points where $72\text{ pt} = 1\text{ inch} = 25.4\text{ mm}$.
  - Conversion Factor:
    $$\text{pts} = \text{mm} \times \frac{72.0}{25.4} \approx \text{mm} \times 2.83464567$$
    $$\text{mm} = \text{pts} \times \frac{25.4}{72.0} \approx \text{pts} \times 0.35277778$$
* **Standard Journal Margin Thresholds:**
  - Standard Margin: $25.4\text{ mm}$ ($72.0\text{ pt}$) with a tolerance $\epsilon = 1.0\text{ mm}$ ($2.83\text{ pt}$).
* **Boundary Breach Rules:**
  1. $\text{Rule}(\text{MARGIN\_TOP}): y_0 < (25.4 - \epsilon) \times \frac{72}{25.4}$
  2. $\text{Rule}(\text{MARGIN\_BOTTOM}): y_1 > \text{height} - (25.4 - \epsilon) \times \frac{72}{25.4}$
  3. $\text{Rule}(\text{MARGIN\_LEFT}): x_0 < (25.4 - \epsilon) \times \frac{72}{25.4}$
  4. $\text{Rule}(\text{MARGIN\_RIGHT}): x_1 > \text{width} - (25.4 - \epsilon) \times \frac{72}{25.4}$

---

## 3. Sub-Task Drilldown

* **TSK-301.1: Block Extraction & Header/Footer Filtering**
  - Iterate through `doc.pages()`, extracting text blocks via `page.get_text("blocks")`.
  - Filter running headers/footers: isolate blocks with `len(text) <= 5` located within $20\text{ pt}$ of outer page limits.

* **TSK-301.2: Bounding Box Coordinate Registration**
  - For each violating block, construct `GeometryCheck`:
    ```json
    {
      "rule": "MARGIN_TOP",
      "expected": "25.4mm",
      "actual": "18.2mm",
      "passed": false,
      "page": 1,
      "bbox": [50, 0, 545, 51]
    }
    ```
  - Register coordinate tuple `(page_idx, bbox, rule, comment)` for downstream annotation rendering.

---

## 4. Definition of Done (DoD)
- [x] Margin calculations match physical page ruler measurements within $\pm 0.2\text{ mm}$.
- [x] `tests/test_layout.py` passes all assertions for both clean and breached documents.
- [x] Zero floating-point coordinate leakage in JSON (rounded integers `[x0, y0, x1, y1]`).
