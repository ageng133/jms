# Format Kilat • Journal Management System (JMS) Pre-Submission Review

A web platform that helps academic authors and journal editors check a paper's formatting before submission. It checks page size and margins against a journal layout, looks for double-blind leaks (author e-mails, ORCIDs, grant numbers, names), and cross-checks in-text citations against the bibliography. Every problem is highlighted in an annotated PDF.

---

## 📌 Problem & Solution (In Plain English)

### The Problem
When authors submit academic manuscripts, editors spend hours manually reviewing formatting:
- Does the paper use the journal's page size and margins (e.g. IEEE A4, ACM Letter)?
- For double-blind reviews, did the author accidentally leave their name, e-mail, or university in the text?
- Is every reference in the bibliography actually cited, and is every citation in the bibliography?

Papers that fail these basic rules get desk-rejected or sent back, which delays publication by weeks.

### The Solution
Format Kilat automates this pre-check:
1. **The author signs in with Google** (or with a demo account in development).
2. **The author uploads the manuscript PDF** plus, optionally, the journal's own template PDF. Without a template they pick a built-in layout preset (IEEE A4, ACM Letter, Springer LNCS, UTS Open).
3. **Files are stored in Box Cloud Storage** (or on local disk for development).
4. **The audit engine (PyMuPDF worker)** measures margins and page size, finds identity leaks, and cross-checks citations. Most papers finish in a few seconds. If the worker is unavailable and a Gemini key is configured, Gemini is used as a fallback.
5. **The author and editor get a report**: a score out of 100, pass/fail per check, and an annotated PDF with red boxes around each problem.

If no engine can process the paper, the audit is marked **FAILED** with the reason. The system never invents a score.

---

## 🏗️ System Architecture

```
                         ┌──────────────────────────────────┐
                         │        Next.js 15 Frontend        │
                         │   (port 3000 · React / Tailwind)  │
                         └────────────────┬─────────────────┘
                                          │ REST + JWT
                                          ▼
                         ┌──────────────────────────────────┐
                         │          Go API Gateway           │
                         │  (port 8080 · Gin · hexagonal)    │
                         └──┬──────────────┬─────────────┬──┘
                            │              │             │ AuditRunner (goroutine)
              uploads /     │              │ GORM        │ engines tried in order
              downloads     ▼              ▼             ▼
                ┌────────────────┐ ┌──────────────┐ ┌───────────────────────────┐
                │ Box Cloud or   │ │ PostgreSQL 16│ │ 1. PyMuPDF worker (HTTP)  │
                │ ./storage/box  │ │              │ │    python -m app.server   │
                └────────────────┘ └──────────────┘ │    port 8090              │
                                                    │ 2. Gemini (optional,      │
                                                    │    no annotated PDF)      │
                                                    └───────────────────────────┘
```

### Components
1. **Frontend (`frontend/`)**: Next.js 15 App Router, Tailwind CSS, shadcn-style components.
   - **Landing page (`/`)**: public introduction with an interactive preview.
   - **Portal (`/admin`)**: requires sign-in. Lists submissions, has the in-portal submission studio (with a layout-preset picker), a Template Vault, and live system status (storage driver and audit engine liveness).
   - **Author pages (`/submissions`, `/submissions/new`, `/submissions/:id`)**.
   - **Audit report (`/submissions/:id/audit`)**: score, per-check results, the engine that produced the report, the template used, and the annotated PDF.

2. **API Gateway (`backend/gateway/`)**: Go 1.23 with a hexagonal layout (domain → usecase → delivery → infrastructure).
   - Google ID-token verification (JWKS). Demo e-mail login is available in development only.
   - Role-based access: authors only see their own manuscripts; editors/admins can change manuscript status. Roles come from `ADMIN_EMAILS` / `EDITOR_EMAILS`, never from the client.
   - `AuditRunner` dispatches each audit in a goroutine, or through Redis when `ENABLE_REDIS=true`. It tries the configured engines in order, stores the result and the annotated PDF, and sets the manuscript status.

3. **Audit engine (`backend/ai-worker/`)**: Python 3.11, PyMuPDF and spaCy.
   - `app/server.py`: FastAPI service with `POST /v1/audit` and `GET /healthz`.
   - Modules: layout and margins (`layout.py`), anonymisation (`anonymization.py`), citations (`citation.py`), and PDF annotation (`annotator.py`).
   - `app/worker.py` is the legacy Redis queue consumer, still available.

4. **Storage (`BoxStorage`)**: Box API v2 when `BOX_DEVELOPER_TOKEN` is set, with a local cache in `./storage/box/`. Files are never public: downloads need a valid token and ownership.

### Scoring rule (same in Go and Python)
- *critical errors* = number of distinct failed layout rules
- *warnings* = identity leaks + uncited references + missing citations
- `score = 100 − 15 × critical − 5 × warnings` (clamped to 0–100)
- **PASS** when there are no critical errors and at most 2 warnings

> Layout presets are approximations of each publisher's page size and margins, not the complete official style guides. For an exact check, upload the journal's template PDF.

---

## 🚀 How to Run the Project Locally

### Prerequisites
- Node.js 18+ (pnpm is used through `npx pnpm@9.15.0` if not installed)
- Go 1.23+
- Python 3.11 (for the audit worker), or Docker
- Docker (for PostgreSQL)

### Step 1: Start PostgreSQL
```bash
cd backend
docker compose up -d postgres
```
On first start the container applies `db/migrations/*.up.sql` and the dev seed
(`author@jms.org` / `editor@jms.org`, password `password123`).

> **Port 5432 already in use?** (for example a Windows PostgreSQL service): run
> `POSTGRES_PORT=5434 docker compose up -d postgres` and start the gateway with `POSTGRES_PORT=5434`.
>
> Reset the database: `docker compose down -v && docker compose up -d postgres`
>
> Existing database created before migration 000003? Run `make migrate`.

### Step 2: Start the audit worker (required for audits)
```bash
cd backend/ai-worker
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm
python -m app.server            # http://127.0.0.1:8090/healthz
```
Or with Docker: `cd backend && docker compose up -d ai-worker`.

### Step 3: Start the Go gateway
```bash
cp backend/.env.example backend/gateway/.env   # adjust as needed
cd backend/gateway
go run ./cmd/api
```
The gateway listens on `http://localhost:8080` and logs which audit engines are configured.

### Step 4: Start the Next.js frontend
```bash
cp frontend/.env.example frontend/.env.local
cd frontend
pnpm install
pnpm dev
```
The frontend runs at `http://localhost:3000`.

### Key configuration
| Variable | Where | Purpose |
|---|---|---|
| `AUDIT_ENGINE_URL` | gateway | PyMuPDF worker URL (default `http://127.0.0.1:8090`) |
| `AUDIT_ENGINE_TOKEN` | gateway + worker | Optional shared secret (`X-Worker-Token`) |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | gateway | Optional fallback engine (default model `gemini-2.5-flash`) |
| `GOOGLE_CLIENT_ID` | gateway | Enables real Google ID-token verification |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | frontend | Google Identity Services button |
| `AUTH_DEMO_LOGIN` / `NEXT_PUBLIC_DEMO_LOGIN` | gateway / frontend | Demo e-mail login; **turn off in production** |
| `ADMIN_EMAILS`, `EDITOR_EMAILS` | gateway | Accounts given ADMIN / EDITOR on sign-in |
| `JWT_SECRET` | gateway | Required (non-default) outside `APP_ENV=development` |

---

## 🧪 Testing

### Automated tests
```bash
cd backend/gateway && go test ./...                 # Go unit tests
cd backend/ai-worker && pytest -q                   # Python engine tests
cd frontend && pnpm exec tsc --noEmit --incremental false && pnpm build
```

### Live end-to-end scripts (gateway + worker running, demo login on)
```bash
bash scripts/test_audit_flow.sh [ieee|acm|springer-lncs|uts-open]   # full audit pipeline
bash scripts/test_e2e_google_auth.sh                                # auth, roles and access control
```

### Manual walkthrough
1. Open `http://localhost:3000` and click **Sign In with Google**.
2. Pick a demo account (development) or sign in with Google.
3. In the portal, open **Submit Paper**, fill in the metadata (or click **Auto-fill Sample Paper**), attach the manuscript PDF, and either attach a template PDF or pick a layout preset.
4. Click **Upload & Run Format Check**. The result card updates when the audit finishes. Then open **View Detailed Report** to see the scorecard and annotated PDF.
