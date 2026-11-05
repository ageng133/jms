# Master Index: Sprint 1 Plan Files (Thursday MVC)
## Journal Management System (JMS) with AI Pre-Submission Engine

Master plan directory mapping all modular plan files across the decoupled architecture:

* [PLAN-01: Ingestion & Control Plane (Go API Gateway)](./PLAN-01-ingestion-control-plane.md)
* [PLAN-02: Data Plane & Event Broker (Postgres + Redis)](./PLAN-02-data-plane-event-broker.md)
* [PLAN-03: AI Layout & Geometry Audit Module](./PLAN-03-layout-geometry-audit.md)
* [PLAN-04: AI Double-Blind Anonymization Module](./PLAN-04-double-blind-anonymization.md)
* [PLAN-05: AI Citation Graph Integrity Module](./PLAN-05-citation-graph-integrity.md)
* [PLAN-06: Visual PDF Annotation Engine](./PLAN-06-visual-pdf-annotation.md)
* [PLAN-07: In-Admin Submission Studio & Dual Box Upload](./PLAN-07-frontend-submission-wizard.md)
* [PLAN-08: Frontend Live Audit Inspection Dashboard](./PLAN-08-frontend-audit-dashboard.md)
* [PLAN-09: Quality Assurance, Benchmarks & Thursday Demo](./PLAN-09-quality-assurance-demo.md)
* [PLAN-10: Editorial Admin Control Plane & Google OAuth SSO](./PLAN-10-admin-control-plane.md)
* [PLAN-11: Storage Driver Adapter (Box Cloud vs Local Box)](./PLAN-11-storage-driver-adapter.md)
* [PLAN-12: Light-Mode UI Revamp & Admin Panel Sidebar Redesign](./PLAN-12-light-mode-admin-sidebar-revamp.md)
* [PLAN-13: Google Auth SSO Integration & Mandatory Audit Gate](./PLAN-13-google-auth-sso-audit-gate.md)
* [PLAN-14: POC Hardening, Access Control & Real Audit Engine](./PLAN-14-poc-hardening-real-audit-engine.md) **(current state, read this first)**

---

## Architecture Summary (current, after PLAN-14)
1. **Frontend:** Next.js 15 App Router (shadcn-style components, Tailwind CSS), branded **Format Kilat**.
   - **Public Landing (`/`):** Informational showcase, interactive preview, and Google SSO modal. Portal links appear only after sign-in.
   - **Portal (`/admin`):** Left sidebar with All Submissions, In-Admin Submission Studio (upload + layout preset picker), Template Vault (from `GET /templates`), and live System Status (from `GET /system/status`).
   - **Audit Report (`/submissions/:id/audit`):** Score, per-check results, engine, template, annotated PDF.
2. **Backend Gateway:** Go 1.23 + **Gin** + GORM (hexagonal). Google ID-token verification, server-side roles, per-object access control. `AuditRunner` runs audits in a goroutine (or via Redis), trying engines in order: **PyMuPDF worker over HTTP**, then Gemini (optional). If all fail, the audit is FAILED (never a placeholder score).
3. **Audit Engine:** Python 3.11 `backend/ai-worker` (`python -m app.server`, port 8090): layout/margins, anonymisation, citation cross-check, annotated PDF.
4. **Storage:** Box Cloud (Box API v2) with local cache `./storage/box`; MinIO optional.
5. **Database:** PostgreSQL 16 (migrations 000001–000003).

## Implementation Status
| Plan | Status | Notes |
|---|---|---|
| PLAN-01 Ingestion & Control Plane | ✅ | Gin (not Fiber); hardened in PLAN-14 |
| PLAN-02 Data Plane & Event Broker | ✅ | Redis optional; default is in-process `AuditRunner` + worker HTTP |
| PLAN-03 Layout & Geometry | ✅ | Called by the gateway via the worker since PLAN-14 |
| PLAN-04 Anonymization | ✅ | Leaks now annotated on the PDF |
| PLAN-05 Citation Integrity | ✅ | |
| PLAN-06 Visual PDF Annotation | ✅ | Produced by the PyMuPDF worker only |
| PLAN-07 Submission Studio | ✅ | Gemini replaced by engine chain; preset picker added |
| PLAN-08 Audit Dashboard | ✅ | Polls to completion; shows engine/template |
| PLAN-09 QA & Demo | ✅ | `scripts/test_audit_flow.sh`, `scripts/test_e2e_google_auth.sh` |
| PLAN-10 Admin Control Plane | ✅ | Telemetry is now live (`/system/status`) |
| PLAN-11 Storage Driver Adapter | ✅ | |
| PLAN-12 Light-Mode Revamp | ✅ | |
| PLAN-13 Google SSO & Audit Gate | ✅ | Real token verification + server-side roles |
| PLAN-14 Hardening & Real Engine | ✅ | See plan |
