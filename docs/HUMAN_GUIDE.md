# JMS Architecture & Operations Guide (For Human Engineers)

This document explains the **Journal Management System (JMS)** in straightforward language: what each component does, how data travels through the system, and how to operate or debug it.

---

## 1. What Does This System Do?

When an academic paper is submitted to a journal:
1. **Layout Check:** Does the paper follow the required format (e.g. 2 columns, specific margins, correct font size)?
2. **Double-Blind Review Check:** Did the author accidentally leave their name, university, or email inside the PDF?
3. **Citation Check:** Do all citations in the text match items in the bibliography?

Usually, editorial assistants check these by hand. **JMS automates this pre-check** in about 1 second before a human editor reads the paper.

---

## 2. User Journey (Screen by Screen)

1. **Public Landing Page (`/`):**
   - Shows what the platform does.
   - Includes a sample visual report so visitors can see what issues look like.
   - Has a **"Sign in with Google"** button. (There are no public upload forms on the landing page).

2. **Google Single Sign-On (SSO):**
   - The user selects whether they are logging in as an **Author** (`Dr. Alexander Wright`) or an **Editor** (`Prof. Sarah Connor`).
   - The backend creates or updates their account and returns a standard JWT token.

3. **Admin & Submission Portal (`/admin`):**
   - **Tab 1: All Submissions:** A table showing all uploaded papers, their author, format compliance score, and current status (`UNDER_DESK_REVIEW`, `ACCEPTED`, etc.). Editors can accept or request revisions with one click.
   - **Tab 2: Submit New Paper:**
     - **Step 1:** Author enters the paper's title, abstract, and keywords (with a 1-click sample button for testing).
     - **Step 2:** Author attaches two PDFs side-by-side:
       - The manuscript draft PDF (mandatory).
       - The journal template PDF (optional; defaults to IEEE format if empty).
     - **Step 3:** The files are uploaded to Box and checked by AI. The author immediately sees their score out of 100.
   - **Tab 3: Journal Templates:** Reference guidelines for IEEE, ACM, and university formats.

4. **Visual Audit Inspector (`/submissions/:id/audit`):**
   - Displays the paper alongside highlighted bounding boxes showing any layout issues or author privacy leaks found during the check.

---

## 3. How the Backend & Storage Work

### Simplified Tech Stack
- **Frontend:** Next.js 15, Tailwind CSS, Lucide icons, standard React components.
- **Backend:** Go 1.23 API Gateway running on port `8080`.
- **Database:** PostgreSQL 16 on port `5432`.
- **Storage:** Box.com (via Box API v2), with local disk fallback at `./storage/box/`.
- **AI Engine:** Google Gemini (multimodal vision REST API), running inside an asynchronous Go Goroutine.

### Why No Redis or Celery?
In our initial prototype, we had MinIO, Redis, and a separate Python worker daemon. For rapid development and local testing, running 4 separate server processes made the system fragile and hard to run. 

We simplified it:
- The Go backend handles the upload directly to Box.
- The Go backend calls Google AI in a background Goroutine.
- The results save directly to PostgreSQL.

This reduced startup from 4 terminals to just **Go + Next.js**.

---

## 4. Key Code Locations

| What | File Path |
|---|---|
| **Landing Page** | `frontend/src/app/page.tsx` |
| **Admin & Submission Portal** | `frontend/src/app/admin/page.tsx` |
| **Audit Report View** | `frontend/src/app/submissions/[id]/audit/page.tsx` |
| **API Client & Auth** | `frontend/src/lib/api.ts` |
| **UI Components** | `frontend/src/components/ui/` (`button.tsx`, `card.tsx`, `dialog.tsx`, `tabs.tsx`, etc.) |
| **Go Server Entrypoint** | `backend/gateway/cmd/api/main.go` |
| **Box Storage Driver** | `backend/gateway/internal/infrastructure/storage/box_storage.go` |
| **Google AI Service** | `backend/gateway/internal/infrastructure/ai/google_ai.go` |
| **Submission Logic** | `backend/gateway/internal/usecase/submission_usecase.go` |

---

## 5. Running the Tests

To verify the backend:
```bash
cd backend/gateway
go test ./...
```

To verify the frontend TypeScript types:
```bash
cd frontend
pnpm exec tsc --noEmit --incremental false
```

Both should pass with 0 errors.

