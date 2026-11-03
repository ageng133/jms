# PLAN-07: Frontend 3-Step Submission Wizard

**Plan ID:** PLAN-07  
**Component:** `frontend/src/app/submissions/new`  
**Target Release:** Thursday MVC (2026-11-05)  
**Assigned Persona:** Frontend Ergonomist & UI Architect (ENFP / ISFJ)  
**Story Points:** 5 SP (7 Hours)  
**Status:** Completed / Verified  

---

## 1. Plan Objective
Design and implement an intuitive 3-step submission wizard in Next.js 15 App Router that guides authors through metadata input, direct-to-S3 drag-and-drop file upload, and automated pre-check audit dispatching with real-time feedback.

---

## 2. User Journey Flow

```mermaid
stateDiagram-v2
    [*] --> Step1_Metadata : Author enters Title, Abstract, Keywords
    Step1_Metadata --> Step2_DirectUpload : Calls POST /api/v1/manuscripts (Draft created)
    Step2_DirectUpload --> Direct_S3_Stream : Obtains Presigned PUT URL & Streams PDF
    Direct_S3_Stream --> Step3_Dispatch : Calls POST /api/v1/manuscripts/:id/files/confirm
    Step3_Dispatch --> Audit_Inspection : Redirects to /submissions/:id/audit?audit_id=...
```

---

## 3. Sub-Task Drilldown

* **TSK-401.1: Step 1 Metadata Form**
  - Path: `frontend/src/app/submissions/new/page.tsx`
  - Inputs: Manuscript Title, Abstract (multi-line textarea), comma-separated Keywords.
  - Client-side validation: Ensures minimum length requirements before enabling transition.

* **TSK-401.2: Step 2 Drag-and-Drop S3 Direct Upload**
  - Interactive dropzone supporting `.pdf` files up to 50MB.
  - Integrates `requestUploadPresign(manuscriptId, filename, "PDF")` to fetch S3 presigned PUT URL.
  - Executes raw binary upload via `uploadDirectToS3(uploadUrl, file)`.

* **TSK-401.3: Step 3 Confirmation & Automated Routing**
  - Invokes `confirmSubmission(manuscriptId, payload)` to update gateway and trigger Redis worker.
  - Displays progress spinner and transitions seamlessly to `/submissions/[id]/audit`.

---

## 4. Definition of Done (DoD)
- [x] Zero payload bytes proxied through the Next.js server runtime (direct browser-to-S3 upload).
- [x] Responsive layout with graceful error toasts for network drops or invalid file formats.
- [x] Next.js 15 static build (`pnpm build`) succeeds without warnings.
