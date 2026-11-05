# PLAN-14: POC Hardening, Access Control & Real Audit Engine

**Plan ID:** PLAN-14  
**Component:** Whole stack (`frontend/`, `backend/gateway/`, `backend/ai-worker/`, `backend/db/`, `scripts/`)  
**Target Release:** Post-MVC hardening  
**Status:** Completed & Verified ✅ (unit tests + live E2E scripts)  

---

## 1. Why this plan exists

A review of the MVC found that the prototype *looked* complete but had several gaps:

| Area | Finding |
|---|---|
| Build | `frontend/src/lib/api.ts` and `utils.ts` were missing (a `.gitignore` rule `lib/` ignored them), so the frontend did not build. |
| Database | Docker init ran the `*.down.sql` migrations as well; the seed inserted `text[]` into a `jsonb` column. |
| Security | The client chose its own role (anyone could become ADMIN); Google tokens were never verified; any user could read or change any manuscript; `/files` was public; uploads allowed path traversal; secrets sat in the frontend `.env`. |
| Audit | Without a Gemini key the gateway produced a **fake deterministic result**; the Python worker was never called; scoring differed between Go, Python, and the UI; the "95/100" score in the admin page was hardcoded. |
| Docs | The README described a Gemini-only pipeline and "~1 second" results that did not exist. |

## 2. What was done

### P0: Make it build and run
- Rewrote `frontend/src/lib/api.ts` (typed API client, session handling, audit-report mapping) and `utils.ts`; narrowed `.gitignore` to `/lib/`.
- Compose mounts only `*.up.sql` + seed; seed keywords use `'[...]'::jsonb`; `make migrate` runs all migrations with `ON_ERROR_STOP`.
- Audit page polls until the audit is final and shows QUEUED/PROCESSING/FAILED states; admin scores come from real data.

### P1: Security
- `googleauth` verifier: Google ID tokens checked against Google's JWKS (RS256, `aud`, `iss`, `exp`).
- Roles are server-side only: new users are `AUTHOR`; `ADMIN_EMAILS` / `EDITOR_EMAILS` grant elevated roles. Demo e-mail login only with `AUTH_DEMO_LOGIN` (default on in development only).
- `Actor`-based ownership checks on every manuscript/audit/file call; status changes are editor/admin only.
- `/files` requires auth; only download accepts `?token=`; keys are validated (no traversal); uploads are size-limited and must start with `%PDF-`; query strings are redacted from logs.
- Strong `JWT_SECRET` enforced outside development; CORS origins configurable; secrets removed from the frontend.

### P2: Real audit engine
- **Python worker as an HTTP service** (`app/server.py`, FastAPI): `POST /v1/audit` (manuscript, optional template PDF, optional preset specs), returning findings + base64 annotated PDF. `GET /healthz`. Optional `X-Worker-Token`.
- **`AuditRunner` (Go)** tries engines in order: PyMuPDF worker, then Gemini (optional). If all fail, the audit is `FAILED` with the reason. No placeholder results. Interrupted audits are failed on restart.
- **One scoring rule** (`domain.ScoreAudit` / `app/scoring.py`): `100 − 15·critical − 5·warnings`, PASS iff critical = 0 and warnings ≤ 2.
- **Layout presets** owned by the gateway (`domain/template.go`): IEEE A4 (default), ACM Letter, Springer LNCS, UTS Open, served at `GET /api/v1/templates`. Precedence: uploaded template, then preset, then default.
- Migration `000003_audit_summary_engine`: `summary`, `engine`, `template_preset` on `pre_submission_audits`.
- Anonymisation leaks are now drawn on the annotated PDF; `import pymupdf` replaces the deprecated `fitz` alias.
- Frontend: preset picker (`TemplatePresetSelect`), data-driven Template Vault, engine + template shown on the report.
- Compose `ai-worker` service; Dockerfile runs `python -m app.server`.

### P3: Docs & polish
- README and `docs/HUMAN_GUIDE.md` rewritten to match the code (architecture, run steps, config, troubleshooting).
- Live **system status** (`GET /api/v1/system/status`): storage driver and engine liveness, shown in the admin sidebar instead of hardcoded "Online/Active".
- Header: "Editorial Portal" only shown to signed-in users; "How It Works" works from every page.
- `scripts/test_audit_flow.sh` rewritten from a stub into a real live pipeline test.
- Branding: "Format Kilat" used consistently in the UI and docs.

## 3. Verification

| Check | Command | Result |
|---|---|---|
| Go unit tests | `cd backend/gateway && go test ./...` | ✅ |
| Python tests | `cd backend/ai-worker && pytest -q` | ✅ |
| Frontend types + build | `pnpm exec tsc --noEmit --incremental false && pnpm build` | ✅ |
| Live audit pipeline | `bash scripts/test_audit_flow.sh` | ✅ |
| Live auth / RBAC | `bash scripts/test_e2e_google_auth.sh` | ✅ |
| Engine down | stop worker, then upload | ✅ audit `FAILED`, manuscript back to `DRAFT` |

## 4. Known limitations / next steps
- Presets approximate page size and margins only (no fonts, column widths, or heading styles).
- Anonymisation uses spaCy `en_core_web_sm`; it can flag title words as PERSON/ORG (false positives).
- The Gemini fallback cannot produce an annotated PDF.
- Only PDF manuscripts are audited (DOCX / LaTeX ZIP are accepted for storage but not analysed).
- Demo login must be switched off (`AUTH_DEMO_LOGIN=false`, `NEXT_PUBLIC_DEMO_LOGIN=false`) before any public deployment.
