# Journal Management System (JMS) • Automated Pre-Submission Review

A web-based platform that helps academic authors and journal editors check research paper formatting before submission. It automatically verifies page margins, column layouts, double-blind privacy (checking for author name or email leaks), and citation validity.

---

## 📌 Problem & Solution (In Plain English)

### The Problem
When authors submit academic manuscripts, editors spend hours manually reviewing formatting:
- Is the paper 2 columns or 1 column?
- Are the margins 19mm as required by the journal, or did the author use standard Word margins?
- For double-blind reviews, did the author accidentally leave their name, email, or university in the text?
- Are the references in the bibliography cited properly, or are links broken?

When papers fail these basic formatting rules, they get rejected or sent back for revisions, delaying publication by weeks.

### The Solution
JMS automates this pre-check:
1. **The author logs in with Google** and opens the **Submission Portal**.
2. **The author uploads two PDFs side-by-side:**
   - Their manuscript draft (`.pdf`).
   - The official journal reference template (`.pdf`), or selects a standard template like IEEE Transactions.
3. **The files stream directly to Box Cloud Storage** (or save locally for testing).
4. **An automated AI check (Google Gemini)** inspects the draft against the template in roughly 1 second.
5. **The author and editor receive an instant visual report** showing a score out of 100 with highlighted bounding boxes around any issues found.

---

## 🏗️ System Architecture

```
                               ┌────────────────────────────────┐
                               │       Next.js 15 Frontend      │
                               │   (Port 3000 • React/Tailwind) │
                               └──────────────┬─────────────────┘
                                              │ REST API / JWT
                                              ▼
                               ┌────────────────────────────────┐
                               │         Go API Gateway         │
                               │          (Port 8080)           │
                               └───────┬──────────────┬─────────┘
                                       │              │
                   Direct File Uploads │              │ AI Inspection
                                       ▼              ▼
                    ┌─────────────────────┐   ┌────────────────────────┐
                    │  Box Cloud Storage  │   │  Google AI (Gemini)    │
                    │ (Local ./storage/box│   │ (Multimodal PDF Vision)│
                    └─────────────────────┘   └────────────────────────┘
                                       │
                                       ▼
                            ┌─────────────────────┐
                            │     PostgreSQL      │
                            │ (Database on :5432) │
                            └─────────────────────┘
```

### Components
1. **Frontend (`frontend/`):**
   - Built with **Next.js 15 App Router**, **Tailwind CSS**, and **shadcn/ui** components.
   - **Landing Page (`/`):** Public introduction explaining the features, with an interactive visual preview of what the report looks like and a "Sign in with Google" button.
   - **Admin & Submission Portal (`/admin`):** Protected by Google SSO. Authors and editors can submit new papers, browse all submissions, filter by review status, and see instant format scores.
   - **Audit Report Inspector (`/submissions/:id/audit`):** Shows the full visual scorecard with red bounding box highlights for layout issues and privacy warnings.

2. **Backend API Gateway (`backend/gateway/`):**
   - Written in **Go 1.23** using clean hexagonal architecture (Domain &rarr; Usecase &rarr; Delivery &rarr; Infrastructure).
   - Handles Google SSO user login, manuscript tracking, and presigned upload URLs.
   - Triggers the pre-check audit in a lightweight background Goroutine.

3. **Storage Tier (`BoxStorage`):**
   - Uploads are sent directly to **Box.com Cloud Storage** using the Box API v2.
   - For local development and testing without API keys, it automatically falls back to saving files in `./storage/box/`.

4. **AI Pre-Submission Engine (`GoogleAIService`):**
   - Uses **Google Gemini** multimodal vision to analyze the PDF layout, compare it against the reference template, and return structured JSON with page numbers, bounding boxes, and compliance scores.

---

## 🚀 How to Run the Project Locally

### Prerequisites
- Node.js 18+ and `pnpm`
- Go 1.23+
- Docker (for PostgreSQL)

### Step 1: Start PostgreSQL
```bash
docker run -d --name jms-postgres -p 5432:5432 -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=jms_db postgres:16-alpine
```

### Step 2: Start the Go Backend Gateway
```bash
cd backend/gateway
go run ./cmd/api
```
The backend starts at `http://localhost:8080`.

### Step 3: Start the Next.js Frontend
```bash
cd frontend
pnpm install
pnpm dev
```
The frontend starts at `http://localhost:3000`.

---

## 🧪 Testing the Entire Workflow

1. Open `http://localhost:3000` in your browser.
2. Click **"Sign in with Google to Submit"**.
3. Choose either **Author** (`Dr. Alexander Wright`) or **Editor** (`Prof. Sarah Connor`).
4. You will arrive at the **Admin & Submission Portal** (`http://localhost:3000/admin`).
5. Click **"Submit New Paper"**:
   - Click **"Auto-fill Sample Paper"** to populate sample title and abstract.
   - Click **"Continue to File Upload"**.
   - Attach your manuscript PDF and template PDF.
   - Click **"Upload to Box & Check Format"**.
6. The file is uploaded and checked with AI. Click **"View Detailed Report"** to inspect the live visual audit scorecard.
