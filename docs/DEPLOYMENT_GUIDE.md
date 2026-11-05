# ⚡ Format Kilat (⚡) — Turnkey Production Deployment Guide

Format Kilat is an academic pre-submission compliance and layout auto-remediation platform built on Go (Gateway API), Next.js 15 (Apple HIG Frontend), PostgreSQL 16, and Google AI (Gemini Multimodal Vision + PyMuPDF).

---

## 🚀 1. One-Click Automated Deployment Today

The repository includes a turnkey orchestration script that automates environment validation, compilation, and live healthchecks:

```bash
./deploy.sh
```

### Deployment Modes
- **Docker Compose (Default when Docker daemon is running):**
  ```bash
  ./deploy.sh --docker
  ```
- **Native Host Production (Immediate zero-dependency execution):**
  ```bash
  ./deploy.sh --native
  ```

---

## 🐳 2. Docker Compose Production Topology

The root `docker-compose.yml` orchestrates three isolated services:

```yaml
services:
  postgres:      # PostgreSQL 16 Alpine on port 5432 with healthcheck
  gateway:       # Go 1.23 REST API on port 8080 with PyMuPDF layout engine
  frontend:      # Next.js 15 standalone optimized build on port 3000
```

To run Docker Compose directly:
```bash
docker compose up -d --build
```

---

## 🤖 3. Autonomous Layout Audit & Auto-Fix Script

To run the complete automated layout audit and fixed layout PDF generation without opening a browser:

```bash
# With any target manuscript PDF:
./scripts/automate_layout_audit_and_fix.sh path/to/manuscript.pdf

# Or with automated sample manuscript generation:
./scripts/automate_layout_audit_and_fix.sh
```

**Artifacts Generated:**
- `output/audit_report.json`: Full compliance scorecard, module checks, and IEEE specifications.
- `output/fixed_layout_remediated.pdf`: Remediated camera-ready PDF stamped with IEEE 2-column guidelines, double-blind redaction blocks, and verification badges.

---

## 🌐 4. Cloud Deployment Targets

### A. Ubuntu / Debian VPS (DigitalOcean, Hetzner, AWS EC2)
1. Clone the repository:
   ```bash
   git clone https://github.com/ageng133/jms.git format-kilat
   cd format-kilat
   ```
2. Populate `.env` with your credentials:
   ```bash
   cp backend/.env.example .env
   # Add GEMINI_API_KEY, NEXT_PUBLIC_GOOGLE_CLIENT_ID, etc.
   ```
3. Run the deploy script:
   ```bash
   ./deploy.sh
   ```

### B. Railway / Fly.io (Backend & Database)
- **Database:** Deploy managed PostgreSQL 16 plugin.
- **Gateway:** Connect `backend/gateway` repository path with `Dockerfile`. Set environment variables: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`, `GEMINI_API_KEY`.

### C. Vercel (Frontend UI)
- Connect `frontend/` directory.
- Build command: `pnpm run build`
- Environment Variables:
  - `NEXT_PUBLIC_API_URL`: `https://your-gateway-api-domain.com/api/v1`
  - `NEXT_PUBLIC_GOOGLE_CLIENT_ID`: Your Google OAuth 2.0 Client ID

---

## 🧪 5. Automated Verification & Smoke Tests

Run the complete E2E test suite to verify Google SSO, strict Author role assignment, draft creation, and editorial review:
```bash
./scripts/test_e2e_google_auth.sh
```
