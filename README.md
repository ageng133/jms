# Journal Management System (JMS) with AI Pre-Submission Engine

A decoupled, asynchronous journal management control plane and AI pre-submission compliance engine designed to eliminate desk-review drag by automating manuscript layout checks, double-blind anonymization auditing, and citation integrity cross-checks.

```
jms-uts/
├── backend/
│   ├── gateway/                  # Go 1.23 API Gateway (Clean Architecture: Domain, Usecase, HTTP, Infra)
│   │   ├── cmd/api/main.go       # Composition Root & Graceful Shutdown
│   │   ├── config/               # Strongly typed configuration
│   │   ├── internal/
│   │   │   ├── domain/           # Core Entities & Interfaces (Zero 3rd party framework dependencies)
│   │   │   ├── usecase/          # Business logic (3-step submission pipeline, Auth)
│   │   │   ├── delivery/http/    # Gin Handlers, JWT/RBAC Middleware, Router
│   │   │   └── infrastructure/   # GORM Postgres, Redis Event Publisher, MinIO S3 Client
│   │   └── pkg/response/         # Standardized API response envelopes
│   ├── ai-worker/                # Python 3.11 Async Audit Engine (PyMuPDF + spaCy)
│   │   ├── app/
│   │   │   ├── config.py         # Pydantic v2 Settings
│   │   │   ├── models/           # Strict JSON Audit Contract Pydantic schemas
│   │   │   ├── modules/          # Clean Single-Responsibility Audit Parsers:
│   │   │   │   ├── layout.py     # PyMuPDF geometry, margins (pt/mm) & bbox capture
│   │   │   │   ├── anonymization.py # spaCy NER + regex double-blind leak checker
│   │   │   │   ├── citation.py   # Regex inline-to-bibliography graph cross-checker
│   │   │   │   └── annotator.py  # PyMuPDF visual bounding box & sticky note drawer
│   │   │   ├── storage/          # S3 / MinIO client
│   │   │   ├── db/               # PostgreSQL audit outcome persistence
│   │   │   └── worker.py         # Redis BRPOP consumer loop
│   │   └── tests/                # Pytest unit tests for all audit modules
│   ├── db/
│   │   ├── migrations/           # PostgreSQL 16 schema DDL
│   │   └── seeds/                # Development demo users (Author, Editor, Reviewer, Admin)
│   ├── docker-compose.yml        # PostgreSQL 16, Redis 7, MinIO S3 + init container
│   ├── .env.example
│   └── .env
├── frontend/                     # Next.js 15 App Router Frontend Control Plane
│   ├── src/
│   │   ├── app/                  # App Router Pages
│   │   │   ├── page.tsx          # System Overview & Metrics Dashboard
│   │   │   ├── submissions/      # Manuscripts List
│   │   │   ├── submissions/new/  # 3-Step Submission Wizard (Presign -> Direct S3 -> AI Pre-Check)
│   │   │   └── submissions/[id]/audit/ # Interactive AI Audit Report Viewer
│   │   ├── lib/api.ts            # Typed API Client with Direct S3 Upload
│   │   └── types/jms.ts          # TypeScript interfaces matching Go & Python contracts
│   ├── package.json
│   └── tsconfig.json
├── scripts/
│   └── test_audit_flow.sh        # Integration smoke test script
├── Makefile                      # Monorepo command runner
└── README.md
```

---

## 3-Step Ingestion & Pre-Submission Workflow

1. **Direct Upload (Zero Gateway Pressure):** Author requests a presigned S3/MinIO upload URL from `POST /api/v1/manuscripts/:id/files/presign`.
2. **Metadata Commitment:** Gateway commits file metadata in `manuscript_files`, sets manuscript status to `PRE_CHECK_PENDING`, and queues `pre_submission_audits`.
3. **Async Event Dispatch:** Gateway pushes `{ "audit_id": "...", "file_id": "...", "s3_key": "...", "file_type": "PDF" }` to Redis list `queue:ai_audit`.
4. **AI Parsing:** Python worker pops task, parses margins ($1\text{ mm} \approx 2.83465\text{ pt}$), checks double-blind NER, executes bidirectional citation cross-checks, burns red bounding boxes to `annotated_v1.pdf`, and saves structured JSON report to PostgreSQL.

---

## Quickstart (Phase 0)

### 1. Launch Infrastructure
```bash
make up
```
Starts PostgreSQL 16 on port 5432, Redis 7 on port 6379, and MinIO S3 on port 9000 (Console: 9001).

### 2. Run Database Migrations & Seeds
```bash
make migrate
make seed
```

### 3. Start Services
```bash
# Terminal 1: Go Gateway
make run-gateway

# Terminal 2: Python AI Worker
make run-worker

# Terminal 3: Next.js 15 Frontend
make run-frontend
```
The Frontend is available at `http://localhost:3000` and the Gateway at `http://localhost:8080`.

### 4. Run Test Suites
```bash
make test-worker
make test-gateway
```

