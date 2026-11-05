# PLAN-10: Editorial Admin Control Plane & Google OAuth SSO

**Plan ID:** PLAN-10  
**Component:** `frontend/src/app/admin` & `backend/gateway/internal/delivery/http/handler/auth_handler.go`  
**Target Release:** Thursday MVC & POC Hardening  
**Assigned Persona:** Security Architect & Executive Dashboard Engineer (ENTJ / ESTJ)  
**Story Points:** 5 SP  
**Status:** Completed & Verified ✅  

---

> **Status update (PLAN-14):** The audit is no longer Gemini-only. The gateway now calls the PyMuPDF worker (`backend/ai-worker`, `python -m app.server`) first and uses Gemini only as an optional fallback; failed audits are marked FAILED instead of returning placeholder scores. See [PLAN-14](./PLAN-14-poc-hardening-real-audit-engine.md) for the current architecture. The text below is kept as the original plan.

## 1. Plan Objective
Deliver a unified editorial management, triage, and submission control plane for Authors and Managing Editors signed in with Google SSO. The admin panel integrates executive KPI metrics, live microservice telemetry, a rich data table for desk triage decisions (`ACCEPT`, `REVISION_REQUIRED`, `REJECT`), and an embedded In-Admin Submission Studio for dual-upload to Box Cloud.

---

## 2. Component Architecture & Workflow

```mermaid
flowchart TD
    User([Author / Managing Editor]) --> GoogleAuth[Google Sign-In: POST /api/v1/auth/google]
    GoogleAuth --> JWT[JWT Token Claim: role='ADMIN'|'AUTHOR']
    JWT --> AdminDashboard[Admin Panel: /admin]
    
    subgraph AdminModules ["Admin Workspace (shadcn/ui)"]
        KPIs[Executive KPIs: Total Submissions, Pass Rate, Desk Review, Box Volume]
        TabsNav[Tabs Navigation: Submissions & Triage | Submit Studio | Template Vault]
        TriageTable[Submissions Data Table & Filters]
        InAdminSubmit[In-Admin Submission Studio: Dual Box Upload]
        Vault[Template Vault: IEEE, ACM, Springer, UTS]
    end
    
    AdminDashboard --> AdminModules
    TriageTable --> DecisionAction[Editorial Decision: PATCH /manuscripts/:id/status]
    DecisionAction --> DBUpdate[(PostgreSQL 16 Transaction)]
    InAdminSubmit --> BoxDriver[Box Storage Driver]
    InAdminSubmit --> GeminiEngine[Google AI Gemini 2.0 Flash]
```

---

## 3. Sub-Task Verification

* **TSK-501.1: Google Single Sign-On (SSO) & Session Governance**
  - Gateway Endpoint: `POST /api/v1/auth/google` accepting `{ email, full_name, role, affiliation }`.
  - Client Authentication: Role-aware session persistence in `localStorage` (`jms_token`, `jms_user`).
  - Frictionless persona switching: Instant toggle between Author (`Dr. Alexander Wright`) and Managing Editor (`Prof. Dr. Sarah Connor`).

* **TSK-501.2: Executive KPI Metrics & System Telemetry**
  - KPI Cards: Total Submissions, AI Pre-Check Pass Rate (%), Pending Desk Review, Box Storage Driver status.
  - Telemetry badges: Live indicator for Box Cloud Driver (`Online`) and Google AI Gemini 2.0 Flash (`Active`).

* **TSK-501.3: Submissions Hub & Editorial Triage Table**
  - Filterable by lifecycle status (`ALL`, `UNDER_REVIEW`, `ACCEPTED`, `REVISION_REQUIRED`).
  - Search input for real-time querying across titles and manuscript IDs.
  - Table columns: Manuscript Title, Author & Affiliation, Submitted Date, Template Type (Custom Reference vs IEEE Baseline), AI Scorecard badge (`95/100 PASSED`), Status badge, and Instant Triage buttons.

* **TSK-501.4: Embedded In-Admin Submission Studio**
  - Authors and Editors submit research papers directly from within the Admin Panel.
  - Side-by-side dropzones for Journal Reference Template and Author Manuscript Draft streaming to Box.

---

## 4. Definition of Done (DoD)
- [x] Landing page strictly acts as public showcase and routes user authentication into `/admin`.
- [x] Admin Panel enforces Google OAuth SSO with clear Author vs Managing Editor identities.
- [x] Full in-panel submission capability eliminates the need for unauthenticated public upload forms.
- [x] TypeScript compiler passes with 0 warnings.
