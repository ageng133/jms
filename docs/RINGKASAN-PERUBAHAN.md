# Ringkasan Perubahan: Format Kilat (JMS) Pre-Submission Review

**Cakupan:** penyempurnaan prototipe (frontend, gateway Go, ai-worker Python, database, skrip tes, dokumentasi)
**Branch:** `feature/poc-hardening` (sudah digabung dengan update terbaru `master`; diajukan lewat Pull Request ke `master`)
**Status:** semua perubahan sudah diuji (tes unit, uji end-to-end langsung, dan Docker Compose penuh)

Dokumen ini ditujukan untuk seluruh tim. Isinya: apa yang ditemukan, apa yang diubah, cara menjalankan versi terbaru, dan hal yang perlu diperhatikan sebelum merge. Bagian 10 menjelaskan penggabungan dengan fitur tim (reshape, rate limiter, readiness) dan perbaikan sebelum merge. Detail teknis yang lebih lengkap ada di [`plans/PLAN-14-poc-hardening-real-audit-engine.md`](../plans/PLAN-14-poc-hardening-real-audit-engine.md) dan [`docs/HUMAN_GUIDE.md`](./HUMAN_GUIDE.md).

---

## 1. Ringkasan singkat (TL;DR)

| Sebelum | Sesudah |
|---|---|
| Frontend **tidak bisa di-build** (file `lib/api.ts` dan `lib/utils.ts` hilang karena aturan `.gitignore`). | Build sukses. `utils.ts` memakai versi asli; `api.ts` adalah gabungan versi asli dan versi baru (lihat bagian 3, P0). |
| Database gagal inisialisasi (migrasi *down* ikut dijalankan; seed salah tipe). | Docker hanya menjalankan migrasi *up* + seed; `make migrate` aman. |
| **Siapa pun bisa jadi ADMIN** (role dikirim dari browser); token Google tidak diverifikasi; semua user bisa membaca/mengubah naskah orang lain; file bisa diunduh tanpa login. | Role ditentukan server; token Google diverifikasi; ada pemeriksaan kepemilikan; file wajib login; upload aman dari *path traversal*. |
| Tanpa API key Gemini, sistem membuat **hasil audit palsu**; worker Python tidak pernah dipanggil; skor "95/100" ditulis langsung di UI. | Audit sungguhan oleh **worker PyMuPDF** (Gemini hanya cadangan). Kalau gagal, statusnya **FAILED** dengan alasan, tidak pernah skor palsu. |
| Rumus skor berbeda antara Go, Python, dan UI. | Satu rumus yang sama di semua tempat. |
| Hanya template IEEE (hardcoded). | 4 preset layout (IEEE, ACM, Springer LNCS, UTS Open) + bisa upload template PDF sendiri. |
| Status sistem di admin hanya teks statis ("Online/Active"). | Status asli dari server (storage + engine audit). |
| README menjelaskan arsitektur yang tidak sesuai kode. | README, HUMAN_GUIDE, dan plans diperbarui sesuai kode. |

---

## 2. Cara menjalankan versi terbaru

> Perubahan terpenting: **worker audit Python sekarang wajib jalan**. Tanpa worker (dan tanpa key Gemini), setiap audit akan berstatus FAILED.

**Cara tercepat (satu perintah):**
- **Docker:** dari root repo, `docker compose up -d --build`. Perintah ini menjalankan PostgreSQL (lengkap dengan migrasi + seed), worker, gateway, dan frontend. Port host bisa diganti dengan `DB_PORT`, `GATEWAY_PORT`, `FRONTEND_PORT`.
- **Native:** `./deploy.sh --native` menjalankan worker, gateway, dan frontend langsung di mesin. Fitur reshape layout hanya aktif di mode ini.

**Cara manual (untuk development):**

```bash
# 1. Database
cd backend
docker compose up -d postgres
#   Kalau port 5432 sudah dipakai (mis. PostgreSQL bawaan Windows):
#   POSTGRES_PORT=5434 docker compose up -d postgres

# 2. Worker audit (port 8090)
cd backend/ai-worker
python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm
python -m app.server
#   atau via Docker: cd backend && docker compose up -d ai-worker

# 3. Gateway Go (port 8080)
cp backend/.env.example backend/gateway/.env
cd backend/gateway
go run ./cmd/api          # tambahkan POSTGRES_PORT=5434 kalau DB dipindah port

# 4. Frontend (port 3000)
cp frontend/.env.example frontend/.env.local
cd frontend
pnpm install && pnpm dev
```

**Database lama** (dibuat sebelum perubahan ini) perlu migrasi baru `000003`: jalankan `make migrate`, atau reset dengan `docker compose down -v`.

---

## 3. Detail perubahan per tahap

### P0: Membuat proyek bisa di-build dan dijalankan
- **`frontend/src/lib/api.ts` dan `utils.ts`.** Keduanya sebelumnya tidak ikut ter-commit karena aturan `.gitignore` `lib/`. Aturan itu sekarang dipersempit menjadi `/lib/` dan `backend/ai-worker/lib/`.
  - Karena file asli belum tersedia saat itu, `api.ts` ditulis ulang lebih dulu. Setelah file asli diterima, keduanya **sudah disesuaikan** dan folder sementara `old-libs` dihapus.
  - **`utils.ts`:** memakai **versi asli** apa adanya. Isinya mencakup `cn` (identik dengan versi baru), `formatDate`, `mmToPoints`, `pointsToMm`, dan `getComplianceBadge`.
  - **`api.ts`:** memakai **versi baru sebagai basis, digabung dengan versi asli**:
    - nama fungsi tetap sama dengan versi asli: `loginWithGoogle`, `listManuscripts`, `getManuscript`, `createDraftManuscript`, `updateManuscriptStatus`, `requestUploadPresign`, `uploadDirectToS3`, `confirmSubmission`, `getAuditReport`, `getCurrentUser`, `logout`, `isAuthenticated`;
    - penanda sesi `jms_auth_explicit` dari versi asli tetap dipakai (perbaikan bug auto-login: sesi yang tidak berasal dari login sungguhan dibuang).
  - Versi asli tidak bisa dipakai langsung karena tidak cocok dengan backend yang sekarang:
    - `uploadDirectToS3` tidak mengirim token, padahal upload sekarang wajib login (hasilnya 401);
    - `getAuditReport` mengembalikan data mentah dari database, sedangkan halaman laporan butuh format laporan (skor, ringkasan, modul);
    - fungsi `listTemplatePresets`, `getSystemStatus`, `getLatestAudit`, dan `getFileDownloadUrl` belum ada.
- **Docker Compose** sekarang me-*mount* file migrasi *up* satu per satu (sebelumnya file *down* ikut jalan sehingga init gagal).
- **Seed** memakai `'[...]'::jsonb` untuk keyword.
- **Makefile** `migrate` menjalankan semua migrasi dengan `ON_ERROR_STOP`.
- **Halaman audit**:
  - *polling* berhenti setelah audit selesai;
  - status QUEUED/PROCESSING/FAILED ditampilkan dengan jelas;
  - laporan hanya dirender saat COMPLETED.
- **Halaman admin**: skor "95/100" yang hardcoded diganti data asli.

### P1: Keamanan
- **Verifikasi Google ID token** (`infrastructure/googleauth/verifier.go`): signature RS256 lewat JWKS Google, `aud`, `iss`, dan `exp`.
- **Role ditentukan server:**
  - user baru selalu `AUTHOR`;
  - `ADMIN_EMAILS` / `EDITOR_EMAILS` memberi role lebih tinggi;
  - role yang dikirim browser diabaikan.
- **Login demo** (email saja, tanpa verifikasi) hanya aktif jika `AUTH_DEMO_LOGIN=true`. Default-nya hanya menyala di development.
- **Kontrol akses per objek** (`usecase/access.go`):
  - author hanya bisa melihat naskahnya sendiri;
  - hanya EDITOR/ADMIN yang boleh mengubah status naskah.
- **File:**
  - `/files` wajib login, dan hanya *download* yang menerima `?token=`;
  - key divalidasi sehingga *path traversal* ditolak;
  - ukuran upload dibatasi (`MAX_UPLOAD_MB`);
  - file wajib PDF asli (header `%PDF-`).
- **Lainnya:**
  - query string tidak lagi tercatat di log (token tidak bocor);
  - CORS bisa dikonfigurasi;
  - `JWT_SECRET` default ditolak di luar development;
  - secret dihapus dari `.env` frontend.
- **Error domain** (`ErrNotFound`, `ErrForbidden`, …) dipetakan ke kode HTTP yang benar (404/403/400/401).

### P2: Engine audit sungguhan
- **Worker Python menjadi layanan HTTP** (`app/server.py`, FastAPI):
  - `POST /v1/audit` menerima naskah, template PDF (opsional), dan spesifikasi preset (opsional);
  - hasilnya temuan audit + PDF beranotasi;
  - `GET /healthz` untuk cek kesehatan;
  - token `X-Worker-Token` bersifat opsional.
- **`AuditRunner` di Go** (`usecase/audit_runner.go`):
  - mencoba engine secara berurutan: **PyMuPDF worker**, lalu **Gemini** (kalau key diisi);
  - kalau semua gagal, audit = **FAILED** beserta alasannya, dan naskah kembali ke `DRAFT`;
  - audit yang terputus karena server restart otomatis ditandai FAILED.
- **`google_ai.go` dihapus** karena berisi generator hasil palsu. Penggantinya `ai/gemini_engine.go`:
  - template ikut dikirim;
  - API key dikirim lewat header, bukan URL;
  - model default `gemini-2.5-flash`.
- **Rumus skor tunggal** (Go `domain/audit.go` dan Python `app/scoring.py`):
  - *critical* = jumlah aturan layout berbeda yang gagal;
  - *warning* = kebocoran identitas + referensi tidak disitasi + sitasi tanpa referensi;
  - `skor = 100 − 15 × critical − 5 × warning` (dibatasi 0–100);
  - **PASS** jika critical = 0 dan warning ≤ 2.
- **Preset layout** (`domain/template.go`): IEEE A4 (default), ACM Letter, Springer LNCS, UTS Open.
  - Endpoint: `GET /api/v1/templates`.
  - Urutan prioritas: template PDF yang di-upload, lalu preset, lalu default.
- **Migrasi `000003_audit_summary_engine`**: kolom `summary`, `engine`, `template_preset` di tabel `pre_submission_audits`.
- **Python:**
  - kebocoran identitas sekarang ditandai kotak merah di PDF;
  - bug `pass_` di penyimpanan hasil sitasi diperbaiki;
  - `import fitz` diganti `import pymupdf` (alias lama sudah deprecated).
- **Frontend:**
  - pemilih preset (`TemplatePresetSelect.tsx`) di `/submissions/new` dan `/admin`;
  - Template Vault diambil dari API;
  - laporan menampilkan engine dan template yang dipakai.
- **Docker:**
  - ada service `ai-worker` baru di `docker-compose.yml`;
  - Dockerfile menjalankan `python -m app.server`;
  - `make run-worker` diperbarui.

### P3: Polish dan dokumentasi
- **Status sistem asli:**
  - endpoint `GET /api/v1/system/status` (wajib login) melaporkan driver storage dan status tiap engine (online/offline/configured);
  - tampil di sidebar admin (`SystemStatusPanel.tsx`) dan diperbarui tiap 30 detik.
- **Header:**
  - link "Editorial Portal" hanya muncul setelah login;
  - "How It Works" sekarang berfungsi dari halaman mana pun.
- **Branding** "Format Kilat" dibuat konsisten. Teks yang menyebut Gemini sebagai engine utama sudah diganti.
- **Skrip `scripts/test_audit_flow.sh`** sebelumnya hanya kerangka. Sekarang menguji alur penuh:
  - login, upload, lalu audit sampai COMPLETED;
  - deteksi kebocoran email dan referensi tidak disitasi;
  - download PDF beranotasi, dan memastikan akses anonim ditolak (401).
- **Dokumentasi:**
  - `README.md` dan `docs/HUMAN_GUIDE.md` ditulis ulang;
  - `plans/PLAN-14` baru;
  - `plans/00-INDEX.md` diberi tabel status implementasi;
  - PLAN-07/10/12/13 diberi catatan status di bagian atas, isi aslinya tidak diubah.

---

## 4. Perubahan yang berdampak ke kode/klien lain (breaking changes)

| Perubahan | Dampak |
|---|---|
| `POST /auth/register` dan `/auth/google` **tidak lagi menerima `role`**. | Klien yang mengirim role tetap jalan, tapi role-nya diabaikan (selalu AUTHOR kecuali email ada di allowlist). |
| `PATCH /manuscripts/:id/status` hanya untuk **EDITOR/ADMIN**. | Author mendapat 403. |
| `/files/upload` dan `/files/download` **wajib login**. | Download dari `<iframe>`/link memakai `?token=` (sudah ditangani `getFileDownloadUrl()`). |
| `GET /manuscripts` dan `/audits/:id` memeriksa kepemilikan. | Author tidak bisa melihat naskah orang lain (403/404). |
| Konfirmasi upload menerima `template_preset` (opsional). | Preset tidak dikenal mendapat 400. |
| Audit butuh worker atau Gemini. | Tanpa keduanya, audit selalu FAILED (dulu menghasilkan skor palsu). |
| Endpoint baru | `GET /api/v1/templates`, `GET /api/v1/system/status`. |
| Kolom DB baru | Butuh migrasi `000003`. |

---

## 5. Konfigurasi baru (`.env`)

| Variabel | Lokasi | Fungsi |
|---|---|---|
| `AUDIT_ENGINE_URL` | gateway | URL worker PyMuPDF (default `http://127.0.0.1:8090`) |
| `AUDIT_ENGINE_TOKEN` | gateway + worker | Secret bersama (opsional) |
| `AUDIT_TIMEOUT_SECONDS` | gateway | Batas waktu satu audit (default 300) |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | gateway | Engine cadangan (opsional) |
| `GOOGLE_CLIENT_ID` | gateway | Mengaktifkan verifikasi token Google |
| `AUTH_DEMO_LOGIN` | gateway | Login demo (**matikan di produksi**) |
| `NEXT_PUBLIC_DEMO_LOGIN` | frontend | Menampilkan akun demo di modal login |
| `ADMIN_EMAILS`, `EDITOR_EMAILS` | gateway | Daftar email untuk role ADMIN/EDITOR |
| `GATEWAY_PUBLIC_URL`, `CORS_ALLOWED_ORIGINS`, `MAX_UPLOAD_MB` | gateway | URL publik, origin yang diizinkan, batas upload |
| `AUDIT_ENGINE_HOST`, `AUDIT_ENGINE_PORT`, `AUDIT_MAX_UPLOAD_MB` | worker | Alamat dan batas upload worker |
| `RESHAPE_ENABLED` | gateway | Menyalakan langkah reshape layout setelah audit (default `true`; di Docker `false`) |
| `RESHAPE_PYTHON`, `RESHAPE_SCRIPT` | gateway | Path Python dan `scripts/remediate_pdf.py`. Kosong = dideteksi otomatis (Python dari `.venv` worker, skrip dari root repo) |
| `DB_PORT`, `GATEWAY_PORT`, `FRONTEND_PORT` | root `docker-compose.yml` | Port host untuk Docker Compose penuh |

Contoh lengkap ada di `backend/.env.example`, `backend/ai-worker/.env.example`, dan `frontend/.env.example`.

---

## 6. Hasil pengujian

| Pengujian | Perintah | Hasil |
|---|---|---|
| Tes unit Go | `cd backend/gateway && go test ./...` | ✅ lulus |
| Tes Python (17 tes) | `cd backend/ai-worker && pytest -q` | ✅ lulus |
| Typecheck + build frontend | `pnpm exec tsc --noEmit --incremental false && pnpm build` | ✅ lulus (7 halaman). Setelah penggabungan `api.ts`/`utils.ts`: typecheck diulang ✅ dan semua halaman berhasil dikompilasi di `pnpm dev` ✅ |
| Alur audit langsung | `bash scripts/test_audit_flow.sh` | ✅ lulus |
| Auth, role, dan akses langsung | `bash scripts/test_e2e_google_auth.sh` | ✅ lulus (15 cek) |
| Worker dimatikan | upload saat worker mati | ✅ audit FAILED, naskah kembali DRAFT |
| Keamanan upload/download | `bash scripts/test_security_patches.sh` | ✅ lulus (7 cek) |
| Docker Compose penuh (root) | `docker compose up -d --build`, lalu `test_audit_flow.sh` dan `test_security_patches.sh` ke stack tersebut | ✅ 4 container sehat, audit COMPLETED, 7/7 cek keamanan lulus |
| Reshape layout | audit di mode native | ✅ `audits/<id>_fixed_layout.pdf` dibuat dan bisa diunduh (wajib login; anonim 401) |

Contoh hasil audit nyata (preset ACM, PDF uji berukuran A4): skor 25.
- 4 aturan layout gagal: ukuran halaman dan 3 margin.
- Email penulis terdeteksi.
- Referensi `[2]` yang tidak disitasi terdeteksi.
- PDF beranotasi berisi 14 penanda.

---

## 7. Yang perlu dilakukan tim sebelum merge

1. ~~Hapus binary dari repo~~ (**sudah**: `backend/gateway/api` dihapus dari repo di commit `9e1ff68` dan masuk `.gitignore`).
2. **`frontend/src/lib/api.ts` dan `utils.ts` sudah disesuaikan** dengan versi asli (lihat P0). Kalau ada perubahan baru di versi asli, gabungkan ke `src/lib/`, jangan menimpa seluruh file. Fungsi berikut dipakai halaman-halaman baru dan wajib tetap ada:
   - `listTemplatePresets`
   - `getSystemStatus`
   - `getAuditReport`
   - `getLatestAudit`
   - `getFileDownloadUrl`
3. **Jalankan migrasi** `000003` di database yang sudah ada (`make migrate`).
4. **Sebelum deploy publik:**
   - set `AUTH_DEMO_LOGIN=false` dan `NEXT_PUBLIC_DEMO_LOGIN=false`;
   - isi `GOOGLE_CLIENT_ID` dan `JWT_SECRET` yang kuat;
   - isi `ADMIN_EMAILS` dengan email yang benar (default dev: `editor.google@uts.edu.au`).
5. **Pastikan worker ikut di-deploy.** Root `docker-compose.yml` dan `deploy.sh --native` sudah otomatis menjalankannya.
6. **Jangan isi secret di `frontend/.env`.** Semua variabel berawalan `NEXT_PUBLIC_` ikut terkirim ke browser dan bisa dibaca siapa pun. Contohnya `NEXT_PUBLIC_BOX_CLIENT_SECRET` dan `NEXT_PUBLIC_BOX_DEVELOPER_TOKEN`: biarkan kosong, atau hapus saja.
   - Key Box ditaruh di `backend/.env`: `BOX_DEVELOPER_TOKEN`, `BOX_CLIENT_ID`, `BOX_CLIENT_SECRET`, `BOX_FOLDER_ID`.
   - Key Gemini juga di `backend/.env` (`GEMINI_API_KEY`).
   - Di frontend cukup `NEXT_PUBLIC_API_URL` dan `NEXT_PUBLIC_GOOGLE_CLIENT_ID`. Client ID Google memang aman untuk publik.

---

## 8. Batasan yang masih ada (saran pekerjaan berikutnya)

- **Preset hanya perkiraan** ukuran halaman dan margin. Font, lebar kolom, dan gaya heading belum dicek. Untuk hasil akurat, upload template PDF resmi jurnal.
- **Deteksi nama** memakai spaCy `en_core_web_sm` dan kadang menandai kata judul (mis. "Deep Learning") sebagai nama orang/organisasi (*false positive*).
- **Gemini tidak membuat PDF beranotasi.** Laporan dari Gemini hanya berisi temuan.
- **Hanya PDF yang diaudit.** DOCX dan LaTeX ZIP diterima untuk disimpan, tapi belum dianalisis.
- **Belum ada tes otomatis frontend** (hanya typecheck/build). Bisa ditambah Playwright untuk alur login dan upload.

---

## 9. Daftar file

### File baru
| File | Isi |
|---|---|
| `frontend/src/lib/api.ts`, `utils.ts` | API client (versi baru digabung dengan versi asli) dan helper (versi asli) |
| `frontend/src/components/TemplatePresetSelect.tsx` | Pemilih preset layout |
| `frontend/src/components/SystemStatusPanel.tsx` | Panel status sistem di admin |
| `backend/ai-worker/app/engine.py` | Orkestrasi audit (layout, anonimisasi, sitasi, anotasi) |
| `backend/ai-worker/app/server.py` | API HTTP worker (FastAPI) |
| `backend/ai-worker/app/scoring.py` | Rumus skor |
| `backend/ai-worker/tests/test_engine.py` | Tes engine |
| `backend/db/migrations/000003_audit_summary_engine.{up,down}.sql` | Kolom summary, engine, template_preset |
| `backend/gateway/internal/domain/audit.go`, `template.go`, `auth.go`, `errors.go` | Tipe audit, skor, preset, error domain |
| `backend/gateway/internal/usecase/audit_runner.go`, `access.go` | Runner audit dan kontrol akses |
| `backend/gateway/internal/infrastructure/auditengine/` | Klien HTTP ke worker |
| `backend/gateway/internal/infrastructure/googleauth/` | Verifikasi token Google |
| `backend/gateway/internal/infrastructure/ai/gemini_engine.go` | Engine Gemini (pengganti `google_ai.go`) |
| `*_test.go` baru | `router_test`, `audit_test`, `audit_runner_test`, `worker_client_test`, `gemini_engine_test`, `verifier_test` |
| `plans/PLAN-14-poc-hardening-real-audit-engine.md` | Rencana dan status penyempurnaan |
| `docs/RINGKASAN-PERUBAHAN.md` | Dokumen ini |
| `backend/gateway/internal/infrastructure/remediation/script_runner.go` | Menjalankan skrip reshape tim (`scripts/remediate_pdf.py`) dari gateway |
| `frontend/.dockerignore`, `backend/gateway/.dockerignore`, `backend/ai-worker/.dockerignore` | Supaya `node_modules`, `.next`, dan `.venv` dari Windows tidak ikut masuk image |

### File dihapus
- `backend/gateway/internal/infrastructure/ai/google_ai.go` (berisi generator hasil audit palsu)
- `frontend/src/old-libs/` (folder sementara berisi `api.ts`/`utils.ts` asli; isinya sudah digabung ke `frontend/src/lib/`)

### File diubah (ringkas per area)
- **Root:** `.gitignore`, `Makefile`, `README.md`
- **Frontend:**
  - halaman `admin/page.tsx`, `submissions/page.tsx`, `submissions/new/page.tsx`, `submissions/[id]/page.tsx`, `submissions/[id]/audit/page.tsx`;
  - komponen `AppProviders.tsx`, `AuthGateCard.tsx`, `GoogleAuthModal.tsx`;
  - `types/jms.ts`, `.env.example`.
- **Gateway:**
  - `cmd/api/main.go`, `config/config.go`;
  - handler (`submission_handler.go`, `health_handler.go`), `middleware/auth_middleware.go`, `router.go`;
  - domain (`entity.go`, `event.go`, `repository.go`, `storage.go`);
  - `postgres/repositories.go`, `storage/box_storage.go`;
  - usecase auth dan submission beserta tesnya.
- **AI worker:**
  - `config.py`, `worker.py`, `db/repository.py`, `models/audit.py`;
  - semua modul di `app/modules/` beserta tesnya;
  - `requirements.txt`, `pyproject.toml`, `Dockerfile`, `.env.example`.
- **Database / infrastruktur:** `docker-compose.yml`, `db/seeds/001_seed_dev_data.sql`, `backend/.env.example`
- **Skrip:** `scripts/test_audit_flow.sh`, `scripts/test_e2e_google_auth.sh`, `scripts/test_security_patches.sh`, `deploy.sh`
- **Root:** `docker-compose.yml`, `frontend/Dockerfile` (pnpm dikunci ke 9.15.0)
- **Dokumentasi:**
  - `docs/HUMAN_GUIDE.md`, `docs/TEAM_SPRINT_PLAN_LIGHT_MODE.md`;
  - `plans/00-INDEX.md`, `PLAN-07`, `PLAN-10`, `PLAN-12`, `PLAN-13`.

---

## 10. Penggabungan dengan update tim (`master`) dan perbaikan sebelum merge

Saat branch ini dibuat, `master` sudah mendapat 11 commit baru dari tim. Semua fitur tim **dipertahankan**, lalu disesuaikan dengan model keamanan dan engine audit yang baru.

### Fitur tim yang dipertahankan
- **Rate limiter** (600 request/menit, burst 100). Endpoint health dan readiness tidak dibatasi.
- **`GET /api/v1/health`** dan **`GET /api/v1/system/readiness`** (probe turnkey). Label engine diperbaiki menjadi `PYMUPDF_WORKER_ONLY`, dengan Gemini sebagai cadangan.
- **Batas upload 35 MB** (`MAX_UPLOAD_MB=35`), sesuai keputusan tim.
- **Badge Turnkey** di header, **badge engine AI** dan **LayoutComparisonViewer** (Before/After) di halaman audit.

### Reshape layout (fitur tim) dipindah ke arsitektur baru
- Logika reshape sebelumnya ada di `google_ai.go`. File itu juga berisi audit palsu dan path khusus Mac, jadi tetap **dihapus**.
- Penggantinya `infrastructure/remediation/script_runner.go`, yang menjalankan `scripts/remediate_pdf.py` milik tim **setelah audit asli selesai**.
- Hasilnya disimpan sebagai `audits/<audit-id>_fixed_layout.pdf`. Deskripsinya disimpan di `template_specs.fixed_layout` (beserta `fixed_pdf_s3_key`).
- **Hanya blok `fixed_layout` yang dipakai.** Skor (96) dan `total_cited` (18) dari skrip adalah angka tetap, bukan hasil analisis, jadi diabaikan. Skor audit tetap dari temuan asli.
- Sifatnya *best effort*: kalau skrip tidak ada atau gagal, audit tetap COMPLETED, hanya tanpa PDF reshape.
- File reshape mengikuti aturan akses yang sama: wajib login dan hanya pemilik/editor yang boleh mengunduh.

### Perubahan API kecil
- `GET /audits/:id` sekarang menerima **ID audit atau ID manuskrip**. Untuk ID manuskrip, yang diambil adalah audit terbaru, tetap dengan pemeriksaan akses.
- Respons audit ditambah `original_pdf_s3_key`, `fixed_layout`, `ai_engine`, dan `ai_mode` (`PYMUPDF_WORKER` atau `LIVE_GEMINI_AI`) untuk halaman perbandingan.

### Perbaikan sebelum merge (masalah yang sudah ada di `master`)
| Masalah | Perbaikan |
|---|---|
| Root `docker-compose.yml` tidak bisa dipakai: nama variabel DB tidak dibaca gateway, migrasi tidak di-mount, dan tidak ada service worker (padahal worker sekarang wajib). | Compose ditulis ulang: variabel `POSTGRES_*` yang benar, migrasi 000001–000003 + seed di-mount, service `ai-worker` dengan healthcheck, `AUDIT_ENGINE_URL=http://ai-worker:8090`, port host bisa diganti. |
| `frontend/Dockerfile` memasang pnpm versi terbaru (v11), yang menolak build script `sharp` sehingga build image gagal. | pnpm dikunci ke `9.15.0` (sesuai lockfile v9). Ditambah `.dockerignore` untuk ketiga image. |
| `deploy.sh --native` tidak menjalankan worker, dan smoke test mencari kata `ok` yang tidak pernah ada di respons health. | Langkah baru *[2/4] Starting PyMuPDF audit worker* (memakai `.venv` kalau ada), cek kesehatan worker, dan cek health memakai `HEALTHY`. |
| `scripts/test_security_patches.sh` mengirim request tanpa login dengan key bebas, sehingga selalu gagal (401) di model keamanan baru. | Ditulis ulang dengan login demo, manuskrip, dan key upload asli. Kelima cek lama tetap ada (oversize sekarang 413 `PAYLOAD_TOO_LARGE`), ditambah cek anonim (401) dan user lain (403). |
| Variabel `RESHAPE_*` belum terdokumentasi. | Ditambahkan di `backend/.env.example`, README, HUMAN_GUIDE, dan tabel konfigurasi di atas. |
