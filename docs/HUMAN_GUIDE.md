# Format Kilat (JMS) Architecture & Operations Guide (For Human Engineers)

This document explains the **Journal Management System (JMS)** in straightforward language: what each component does, how data travels through the system, and how to operate or debug it.

---

## 1. What Does This System Do?

When an academic paper is submitted to a journal:
1. **Layout Check:** Does the paper follow the required format (e.g. 2 columns, specific margins, correct font size)?
2. **Double-Blind Review Check:** Did the author accidentally leave their name, university, or email inside the PDF?
3. **Citation Check:** Do all citations in the text match items in the bibliography?

Usually, editorial assistants check these by hand. **JMS automates this pre-check**, usually within a few seconds, before a human editor reads the paper. Every finding is drawn as a red box on an annotated copy of the PDF.

---

## 2. User Journey (Screen by Screen)

1. **Public Landing Page (`/`):**
   - Shows what the platform does.
   - Includes a sample visual report so visitors can see what issues look like.
   - Has a **"Sign in with Google"** button. (There are no public upload forms on the landing page).

2. **Google Single Sign-On (SSO) & Mandatory Audit Gate:**
   - **Zero-Bypass Policy:** Visitors cannot submit papers, upload files to Box, or view/run pre-submission audits without signing in first.
   - **Real sign-in:** Google Identity Services when `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (frontend) and `GOOGLE_CLIENT_ID` (gateway) are set. The gateway verifies the Google ID token's signature, audience, issuer, and expiry.
   - **Demo sign-in (development only):** with `AUTH_DEMO_LOGIN=true` / `NEXT_PUBLIC_DEMO_LOGIN` not `false`, the user can pick a demo Author/Editor or type any e-mail. Anyone can impersonate anyone in this mode, so it must be off in production.
   - **Roles are decided by the server:** new users are always `AUTHOR`; `ADMIN_EMAILS` / `EDITOR_EMAILS` grant elevated roles. A role sent by the browser is ignored.
   - If an unauthenticated user navigates directly to `/submissions/new`, `/submissions/:id/audit`, or `/admin`, they are presented with a clean light-mode **Auth Gate Card** (`AuthGateCard.tsx`) explaining why sign-in is required.
   - The backend creates or updates their account and returns a standard JWT token.

3. **Admin & Submission Portal (`/admin`):**
   - **Tab 1: All Submissions:** Authors see their own papers; editors/admins see everything. The table shows the compliance score and the current status (`UNDER_DESK_REVIEW`, `ACCEPTED`, etc.). Only editors/admins can change the status.
   - **Tab 2: Submit New Paper:**
     - **Step 1:** Author enters the paper's title, abstract, and keywords (with a 1-click sample button for testing).
     - **Step 2:** Author attaches two PDFs side-by-side:
       - The manuscript draft PDF (mandatory).
       - The journal template PDF (optional). Without it, the author picks a layout preset (IEEE A4 by default, ACM Letter, Springer LNCS, UTS Open).
     - **Step 3:** The files are uploaded and the audit runs in the background. The result card updates when the audit is COMPLETED (score out of 100) or FAILED (with the reason).
   - **Tab 3: Journal Templates:** The built-in layout presets, loaded from `GET /api/v1/templates`.
   - **System Status (sidebar):** Real storage driver and audit-engine liveness from `GET /api/v1/system/status`.

4. **Visual Audit Inspector (`/submissions/:id/audit`):**
   - Shows the score, each check, the engine that produced the report, and the template that was used, next to the annotated PDF.

---

## 3. How the Backend & Storage Work

### Tech Stack
- **Frontend:** Next.js 15, Tailwind CSS, Lucide icons, shadcn-style components.
- **Backend:** Go 1.23 API Gateway (Gin, GORM) on port `8080`.
- **Database:** PostgreSQL 16 (default port `5432`; use `POSTGRES_PORT` if it is taken).
- **Storage:** Box.com (Box API v2) when `BOX_DEVELOPER_TOKEN` is set, always with a local copy in `./storage/box/`.
- **Audit engine:** Python worker (`backend/ai-worker`, PyMuPDF + spaCy) exposed over HTTP on port `8090`. Gemini is an optional fallback.

### How an audit runs
1. The browser uploads the PDF to the gateway (`PUT /api/v1/files/upload`). The gateway checks auth, ownership, size, and the `%PDF-` header.
2. `POST /manuscripts/:id/files/confirm` records the file, creates a `QUEUED` audit (with the chosen `template_preset`), and moves the manuscript to `PRE_CHECK_PENDING`.
3. `AuditRunner` (in a goroutine, or through Redis when `ENABLE_REDIS=true`) marks the audit `PROCESSING` and tries each engine in order:
   1. **PyMuPDF worker**: `POST {AUDIT_ENGINE_URL}/v1/audit`. It returns the findings plus an annotated PDF.
   2. **Gemini** (only if `GEMINI_API_KEY` is set). It returns findings only, with no annotated PDF.

   An invalid PDF stops the run immediately, since retrying it on another engine is pointless.
4. The gateway scores the findings (one shared rule, see below), saves the annotated PDF under `audits/annotated_<audit-id>.pdf`, and sets the audit to `COMPLETED`. The manuscript becomes `UNDER_DESK_REVIEW` (PASS) or `PRE_CHECK_FAILED` (FAIL).
5. If every engine fails, the audit is `FAILED` with the reason and the manuscript goes back to `DRAFT`. Audits interrupted by a gateway restart are also marked `FAILED` on startup.

**Score:** `100 - 15 x (distinct failed layout rules) - 5 x (leaks + uncited + missing citations)`, clamped to 0-100. **PASS** = no failed layout rule and at most 2 warnings.

### Why Redis is optional
The first prototype needed MinIO, Redis, and a queue worker running at once, which was fragile for local development. The default now runs audits in-process from the gateway and calls the worker over HTTP. Redis (`ENABLE_REDIS=true` + `python -m app.worker`) and MinIO (`STORAGE_DRIVER=minio`) are still supported.

### Troubleshooting
| Symptom | Cause / fix |
|---|---|
| Every audit is `FAILED` with "audit worker unreachable" | Start the worker: `make run-worker` or `docker compose up -d ai-worker`. |
| Gateway log: "no audit engine configured" | Set `AUDIT_ENGINE_URL` and/or `GEMINI_API_KEY`. |
| Gateway cannot log in to Postgres | Another Postgres is on 5432. Start compose with `POSTGRES_PORT=5434` and the gateway with the same value. |
| `column "summary" does not exist` | The database predates migration 000003. Run `make migrate`. |
| Annotated PDF missing | The report came from Gemini, which does not draw annotations. |

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
| **Submission Logic & Access Control** | `backend/gateway/internal/usecase/submission_usecase.go`, `access.go` |
| **Audit Runner (engine fallback, scoring, persistence)** | `backend/gateway/internal/usecase/audit_runner.go` |
| **Scoring rule & layout presets** | `backend/gateway/internal/domain/audit.go`, `template.go` |
| **Worker HTTP client / Gemini engine** | `backend/gateway/internal/infrastructure/auditengine/worker_client.go`, `ai/gemini_engine.go` |
| **Google ID-token verifier** | `backend/gateway/internal/infrastructure/googleauth/verifier.go` |
| **Python audit engine** | `backend/ai-worker/app/engine.py`, `app/server.py`, `app/modules/` |

---

## 5. Running the Tests

```bash
cd backend/gateway && go test ./...                     # Go unit tests
cd backend/ai-worker && pytest -q                       # Python engine tests
cd frontend && pnpm exec tsc --noEmit --incremental false
```

With the gateway and worker running (demo login on):
```bash
bash scripts/test_audit_flow.sh            # live audit pipeline (upload -> audit -> annotated PDF)
bash scripts/test_e2e_google_auth.sh       # sign-in, roles, and access control
```

All of them should pass with 0 errors.
