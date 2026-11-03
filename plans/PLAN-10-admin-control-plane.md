# PLAN-10: Editorial Admin Control Plane & Google OAuth

**Plan ID:** PLAN-10  
**Component:** `frontend/src/app/admin` & `backend/gateway/internal/delivery/http/handler/auth_handler.go`  
**Target Release:** Thursday MVC (2026-11-05)  
**Assigned Persona:** Security Architect & Executive Dashboard Engineer (ENTJ / ESTJ)  
**Story Points:** 5 SP (7 Hours)  
**Status:** Completed / Verified  

---

## 1. Plan Objective
Deliver a unified editorial management and triage control plane for Managing Editors and Administrators signed in with Google, enabling rapid review of automated pre-submission compliance reports, inspection of dynamic template conformity, and immediate editorial desk-triage decisions (`ACCEPT`, `REVISION_REQUIRED`, `REJECT`).

---

## 2. Component Architecture & Workflow

```mermaid
flowchart TD
    User([Managing Editor / Admin]) --> GoogleAuth[Google Sign-In: POST /api/v1/auth/google]
    GoogleAuth --> JWT[JWT Token Claim: role='ADMIN'|'EDITOR']
    JWT --> AdminDashboard[Admin Dashboard: /admin]
    
    AdminDashboard --> Metrics[Executive Metrics: Total, Triage Required, Failed, Accepted]
    AdminDashboard --> HealthStrip[Microservices Cluster Health: 8080, 5432, 6379, 9000, AI Worker]
    AdminDashboard --> TriageTable[Submissions Triage Table & Filters]
    
    TriageTable --> ViewAudit[1-Click Audit Report: /submissions/:id/audit]
    TriageTable --> DecisionAction[Editorial Decision: PATCH /manuscripts/:id/status]
    DecisionAction --> DBUpdate[(PostgreSQL 16 Transaction)]
```

---

## 3. Sub-Task Drilldown

* **TSK-501.1: Google Sign-In & Automated User Provisioning**
  - Gateway Endpoint: `POST /api/v1/auth/google` accepting `{ email, full_name, role, affiliation }`.
  - Flow: Automatically matches existing accounts or provisions new users with specified role (`ADMIN` / `EDITOR` / `AUTHOR`), issuing an HMAC-SHA256 JWT claim valid for 72 hours.
  - Client state: Stores JWT and user profile in `localStorage` (`jms_token`, `jms_user`).

* **TSK-501.2: Executive KPI Metrics & Cluster Health Strip**
  - Path: `frontend/src/app/admin/page.tsx`
  - Metrics cards: Total Submissions, Desk Review Required (`UNDER_DESK_REVIEW`), Pre-Check Non-Compliant (`PRE_CHECK_FAILED`), Active Peer Review (`IN_PEER_REVIEW`, `ACCEPTED`).
  - Infrastructure indicator displaying live connection to Go Gateway, PostgreSQL, Redis, MinIO S3, and Python AI Worker.

* **TSK-501.3: Submissions Triage Table & Status Mutation**
  - Filterable by lifecycle status (`ALL`, `NEEDS_REVIEW`, `UNDER_DESK_REVIEW`, `PRE_CHECK_FAILED`).
  - Preloaded file records showing whether the submission uses a **Custom Journal Template** or **UTS Standard Baseline**.
  - Decision endpoints: Direct invocation of `PATCH /api/v1/manuscripts/:id/status` to advance papers to `IN_PEER_REVIEW`, `REVISION_REQUIRED`, or `ACCEPTED`.

---

## 4. Definition of Done (DoD)
- [x] Landing page provides 1-click Google Sign-In modal supporting Author and Managing Editor identities.
- [x] Admin dashboard displays all submitted manuscripts with preloaded author and audit score details.
- [x] Editorial status changes (`PATCH /manuscripts/:id/status`) commit atomically to PostgreSQL.
- [x] Next.js TypeScript build (`tsc --noEmit`) passes with 0 warnings.
