# PLAN-01: Ingestion & Control Plane (Go Gateway)

**Plan ID:** PLAN-01  
**Component:** `backend/gateway`  
**Target Release:** Thursday MVC (2026-11-05)  
**Assigned Persona:** Systems Architect (INTJ / ENTJ)  
**Story Points:** 9 SP (13 Hours)  
**Status:** Completed / Verified  

---

## 1. Plan Objective
Design and implement an ultra-low latency, non-buffering Go API Gateway handling user authentication, role-based access control (RBAC), and direct-to-S3 presigned upload generation without proxying large manuscript files through gateway memory.

---

## 2. Technical Deliverables & Architecture

```mermaid
sequenceDiagram
    autonumber
    actor Author
    participant Gateway as Go Gateway (:8080)
    participant S3 as MinIO / S3 (:9000)
    participant DB as PostgreSQL 16 (:5432)
    participant Redis as Redis Queue (:6379)

    Author->>Gateway: POST /api/v1/auth/login
    Gateway-->>Author: JWT Bearer Token (HS256)
    Author->>Gateway: POST /api/v1/manuscripts/:id/files/presign (file_role: TEMPLATE)
    Gateway-->>Author: { upload_url, s3_key, file_role: "TEMPLATE" }
    Author->>S3: PUT /raw/.../template_xxx.pdf (Direct Stream)
    Author->>Gateway: POST /api/v1/manuscripts/:id/files/presign (file_role: MANUSCRIPT)
    Gateway-->>Author: { upload_url, s3_key, file_role: "MANUSCRIPT" }
    Author->>S3: PUT /raw/.../draft_xxx.pdf (Direct Stream)
    Author->>Gateway: POST /api/v1/manuscripts/:id/files/confirm { draft_file, template_file }
    Gateway->>DB: Atomic Tx (manuscript_files [MANUSCRIPT & TEMPLATE], audit QUEUED with template_file_id)
    Gateway->>Redis: LPUSH queue:ai_audit { s3_key, template_s3_key }
    Gateway-->>Author: 202 Accepted { audit_id }
```

---

## 3. Sub-Task Drilldown

* **TSK-101: IAM, JWT & RBAC Engine**
  - Path: `backend/gateway/internal/usecase/auth_usecase.go`
  - Implementation: bcrypt password hashing (cost 10), HMAC-SHA256 JWT claims (`user_id`, `email`, `role`, `exp`).
  - Middleware: `RequireRoles(roles ...domain.Role)` enforcing author/editor boundaries.

* **TSK-102: Dual Direct-to-S3 Presigned URL Provider (Template & Draft)**
  - Path: `backend/gateway/internal/infrastructure/storage/minio_storage.go`
  - Implementation: MinIO Go SDK v7 client calling `PresignedPutObject` with 15-minute TTL.
  - S3 Key Partitioning:
    - Template: `raw/{manuscript_id}/template_{uuid}.{ext}`
    - Draft: `raw/{manuscript_id}/draft_{uuid}.{ext}`
  - Role differentiation: `file_role: "TEMPLATE"` vs `file_role: "MANUSCRIPT"`.

* **TSK-103: Transactional Dual Metadata Submission Handler**
  - Path: `backend/gateway/internal/usecase/submission_usecase.go`
  - Implementation: GORM transactional block computing next manuscript file version, inserting both `MANUSCRIPT` and `TEMPLATE` records into `manuscript_files`, inserting `pre_submission_audits` linked to `template_file_id` in state `QUEUED`, and transitioning manuscript to `PRE_CHECK_PENDING`.
  - Event Dispatch: Dispatches Redis payload containing both `s3_key` (draft) and `template_s3_key` (reference template).

* **TSK-104: Audit Outcome Query Endpoint**
  - Path: `backend/gateway/internal/delivery/http/handler/submission_handler.go`
  - Implementation: `GET /api/v1/audits/:id` fetching JSONB audit records, overall score, extracted template specs, and S3 annotated key.

---

## 4. Definition of Done (DoD)
- [x] Zero payload buffering on Go gateway during 50MB PDF upload tests.
- [x] Dual-file presigning & confirmation operational (Template & Manuscript Draft).
- [x] All endpoints output unified `{ "success": true, "data": ..., "error": null }` envelope.
- [x] Unit test `TestRequestUploadURL` passes in `submission_usecase_test.go`.

