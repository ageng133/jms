# PLAN-03: AI Layout & Geometry Audit Module

**Plan ID:** PLAN-03  
**Component:** `backend/ai-worker/app/modules/layout.py`  
**Target Release:** Thursday MVC (2026-11-05)  
**Assigned Persona:** Computational Geometry Engineer (ISTP / INTJ)  
**Story Points:** 5 SP (8 Hours)  
**Status:** Completed / Verified  

---

## 1. Plan Objective
Develop a deterministic document geometry and layout analysis engine using `PyMuPDF` (`fitz`) that dynamically extracts layout specifications from an uploaded Journal Reference Template (page format, margins, column grid) and audits author manuscript drafts directly against those extracted template constraints.

---

## 2. Technical Specifications & Math Formulation

* **Coordinate System & Conversion:**
  - PDF native coordinate space uses PostScript Points where $72\text{ pt} = 1\text{ inch} = 25.4\text{ mm}$.
  - Conversion Factor:
    $$\text{pts} = \text{mm} \times \frac{72.0}{25.4} \approx \text{mm} \times 2.83464567$$
    $$\text{mm} = \text{pts} \times \frac{25.4}{72.0} \approx \text{pts} \times 0.35277778$$

* **Dynamic Template Extraction (`TemplateExtractor`):**
  - Parses uploaded Journal Template PDF:
    - Page Dimensions: Identifies `A4` ($210 \times 297\text{ mm}$) vs `US Letter` ($215.9 \times 279.4\text{ mm}$).
    - Target Margins ($T_{\text{top}}, T_{\text{bottom}}, T_{\text{left}}, T_{\text{right}}$): Derived from bounding box envelope of template text blocks.
    - Column Grid ($C \in \{1, 2\}$): Identifies 2-column format and column gutter gap via horizontal coordinate clustering.
    - Safe Default Fallback: Standard $25.4\text{ mm}$ margin if template upload is omitted.

* **Boundary Breach Rules (against Template Targets):**
  1. $\text{Rule}(\text{PAGE\_DIMENSIONS}): |\text{width} - T_{\text{width}}| > 6\text{ mm} \lor |\text{height} - T_{\text{height}}| > 6\text{ mm}$
  2. $\text{Rule}(\text{MARGIN\_TOP}): y_0 < (T_{\text{top}} - \epsilon) \times \frac{72}{25.4}$
  3. $\text{Rule}(\text{MARGIN\_BOTTOM}): y_1 > \text{height} - (T_{\text{bottom}} - \epsilon) \times \frac{72}{25.4}$
  4. $\text{Rule}(\text{MARGIN\_LEFT}): x_0 < (T_{\text{left}} - \epsilon) \times \frac{72}{25.4}$
  5. $\text{Rule}(\text{MARGIN\_RIGHT}): x_1 > \text{width} - (T_{\text{right}} - \epsilon) \times \frac{72}{25.4}$
  6. $\text{Rule}(\text{COLUMN\_LAYOUT}): \text{Template}(C=2) \land \text{block\_width} > \text{width} \times 0.65$ (body paragraph spanning columns)

---

## 3. Sub-Task Drilldown

* **TSK-301.1: Template Specification Extractor**
  - Path: `backend/ai-worker/app/modules/template.py`
  - Implementation: `TemplateExtractor.extract_specs(template_doc)` extracting dimensions, margins, and column counts.

* **TSK-301.2: Template-Driven Layout Auditor**
  - Path: `backend/ai-worker/app/modules/layout.py`
  - Implementation: Audits draft against `template_specs` with exact millimeter and point conversions.

* **TSK-301.3: Bounding Box Coordinate Registration**
  - For each violating block, construct `GeometryCheck`:
    ```json
    {
      "rule": "MARGIN_TOP",
      "expected": "20.1mm",
      "actual": "5.3mm",
      "passed": false,
      "page": 1,
      "bbox": [51, 15, 239, 46]
    }
    ```
  - Register coordinate tuple `(page_idx, bbox, rule, comment)` for downstream annotation rendering.

---

## 4. Definition of Done (DoD)
- [x] Margin calculations match physical page ruler measurements within $\pm 0.2\text{ mm}$.
- [x] Dynamic template extraction verified across A4, Letter, and 2-column layouts.
- [x] `tests/test_layout.py` and `tests/test_template.py` pass 100% of test fixtures.
- [x] Zero floating-point coordinate leakage in JSON (rounded integers `[x0, y0, x1, y1]`).

