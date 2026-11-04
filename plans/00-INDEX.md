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

---

## Architecture Summary
1. **Frontend:** Next.js 15 App Router (`shadcn/ui`, Radix primitives, Tailwind CSS)
   - **Pure Light Mode:** Clean `#f8fafc` background, crisp `#ffffff` cards, and high-contrast readable text.
   - **Public Landing (`/`):** Informational showcase, interactive 3-column live inspector preview, and Google SSO modal. **No premature portal links.**
   - **Admin Workspace (`/admin`):** Standard SaaS **Left Sidebar (260px wide)** with Dashboard Overview, All Submissions Hub, In-Admin Submission Studio (dual upload to Box), and Template Vault.
2. **Backend Gateway:** Go (Fiber) with pluggable Box Storage Driver (`box_storage.go`) and Google AI service (`google_ai.go`) in an asynchronous Goroutine.
3. **Database:** PostgreSQL 16 (GORM ORM).
