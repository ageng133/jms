# Business Requirements Document (BRD)
## Journal Management System (JMS) - AI Pre-Submission Engine

**Document Version:** 1.0 (MVC Scope)  
**Target Sprint:** Thursday MVC Sprint (2026-11-05)  
**Author:** DeepMind Singularity Engineering Consortium  
**Status:** Approved for Sprint Execution  

---

## 1. Executive Summary & Problem Context

Current scholarly journal workflows suffer from high operational drag during the initial desk-review stage. Based on empirical analysis of publishing bottlenecks:
1. **Administrative Desk Rejections:** Over 30% of submitted manuscripts are returned to authors or desk-rejected not for scientific insufficiency, but for minor formatting defects (margins, font guidelines, citation mismatches, or accidental author leaks in double-blind review).
2. **Author Frustration & Delay:** Authors spend 4–16 hours manually adapting papers to journal templates, and subsequent editorial desk checks take 2–6 weeks of idle waiting.
3. **Editor Burnout:** Managing editors spend significant manual effort inspecting document geometry, looking up unlinked citations, and checking metadata.

**Solution Vision:** An automated, decoupled **AI Pre-Submission Engine** that acts as an intelligent pre-flight gate. Within 15 seconds of upload, the author and editor receive an actionable compliance audit report with visual PDF annotation overlays.

---

## 2. Target Users & Stakeholders

| Persona | Role | Primary Needs |
|---|---|---|
| **Author (Submitter)** | Submits research manuscripts | Instant pre-submission feedback on template compliance, margin boundaries, and double-blind anonymization before formal review. |
| **Managing Editor** | Triages initial submissions | Automated compliance scoring (0–100) and desk-review readiness status (`UNDER_DESK_REVIEW` vs `PRE_CHECK_FAILED`). |
| **Peer Reviewer** | Conducts blind evaluation | Strict assurance of zero author identity leaks in double-blind reviews. |
| **System Administrator** | Operates platform infrastructure | Decoupled architecture with zero gateway buffering and asynchronous worker fault-tolerance. |

---

## 3. Product Scope (MoSCoW Prioritization for Thursday Sprint)

### In-Scope (Must Have - Thursday MVC)
* **[FR-1] Dual-File Direct S3 Ingestion Wizard:** 3-step author workflow in Next.js 15. The author uploads **both** the **Journal Reference Template** (`.pdf`) and the **Manuscript Draft** (`.pdf`). The browser streams files directly to MinIO/S3 via presigned PUT URLs without passing payload bytes through the API gateway.
* **[FR-2] Event-Driven Dispatcher:** Go API Gateway saves metadata for both files in `manuscript_files` (`MANUSCRIPT` vs `TEMPLATE`), creates an audit record linked to `template_file_id`, sets status `PRE_CHECK_PENDING`, and publishes job payload with `s3_key` and `template_s3_key` to Redis `queue:ai_audit`.
* **[FR-3] Dynamic Template Extraction & Comparative Layout Audit:** Python worker extracts target geometry specs from the uploaded template (A4/Letter dimensions, target margins, column grid) and audits the manuscript draft directly against the template guidelines ($1\text{ mm} \approx 2.83465\text{ pt}$). Captures violation coordinates `[x0, y0, x1, y1]`.
* **[FR-4] Double-Blind Anonymization Module:** Combines `spaCy` NER (`PERSON`, `ORG`) and regex to detect author names, affiliations, email addresses, ORCIDs, grant numbers, and embedded PDF metadata.
* **[FR-5] Bidirectional Citation Integrity Module:** Extracts inline citations (`[1]`, `[1-3]`) and bibliography entries. Flags uncited references and missing text citations.
* **[FR-6] Visual PDF Annotation:** PyMuPDF renders red dashed bounding boxes and sticky comment notes over violation coordinates, saving `annotated_v1.pdf` to S3.
* **[FR-7] Interactive AI Audit Report Viewer:** Displays compliance score (0–100), PASS/FAIL indicator, extracted reference template specs card, breakdown of comparative checks, and a direct download link for the annotated PDF.

### Out-of-Scope (Deferred to Post-Thursday Sprints)
* Reviewer matching and bidding algorithms.
* Payment gateway integration for Article Processing Charges (APC).
* Crossref DOI minting and metadata deposit.
* LaTeX `.zip` cloud compilation sandbox.
* Real-time WebSocket/SSE streaming (MVC uses polling).

---

## 4. Non-Functional Requirements (NFRs)

1. **Performance:** Total audit turnaround time $\le 15$ seconds for manuscripts up to 30 pages.
2. **Scalability:** Worker queue decoupling allows horizontal scaling of Python AI workers without reconfiguring the Go API gateway.
3. **Resilience & Idempotency:** Failed parsing jobs do not crash the consumer; errors are captured in `pre_submission_audits.error_message`.
4. **Security & Privacy:** Presigned S3 URLs expire in 15 minutes. Double-blind author metadata is stripped from annotated outputs.
5. **Contract Parity:** Pydantic v2 schemas in Python worker match TypeScript types in Next.js 15 exactly.

---

## 5. Success Criteria for Thursday Sprint Demo

1. Author can create a manuscript draft and upload a test PDF via presigned S3 URL.
2. Redis worker receives the event, executes all 3 modules, and finishes within 10 seconds.
3. Audit report correctly flags simulated margin breaches and test email leaks.
4. Author can inspect the report in Next.js 15 and download the red-annotated PDF.

