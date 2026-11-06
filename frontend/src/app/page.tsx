"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Sparkles,
  Layers,
  AlertTriangle,
  Zap,
  XCircle,
  Check,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { GoogleLogo } from "@/components/GoogleAuthModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AICopilotWidget } from "@/components/audit/AICopilotWidget";
import { AcademicTier } from "@/types/jms";

export default function HomePage() {
  const router = useRouter();
  const { user, openGoogleModal } = useAuth();
  const [selectedTier, setSelectedTier] = useState<AcademicTier>("S1");

  // Interactive Live Scorecard Simulator State
  const [simEmailLeak, setSimEmailLeak] = useState(true);
  const [simSingleColumn, setSimSingleColumn] = useState(true);
  const [simMissingRef, setSimMissingRef] = useState(false);

  // Compute live simulated score
  let simScore = 100;
  if (simEmailLeak) simScore -= 15;
  if (simSingleColumn) simScore -= 12;
  if (simMissingRef) simScore -= 8;

  const simStatus = simScore >= 90 ? "PASS" : simScore >= 75 ? "WARNING" : "REVISE";

  return (
    <div className="space-y-20 sm:space-y-28 pb-20">
      {/* =====================================================================
          1. HERO SECTION: RELATABLE, GROUNDED, NO OVERCLAIMS
         ===================================================================== */}
      <section className="relative overflow-hidden rounded-3xl bg-surface-container-low p-6 sm:p-10 lg:p-12 border border-primary/20 shadow-2xl text-on-surface">
        {/* Ambient Mesh Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-500/15 via-purple-500/10 to-pink-500/5 blur-3xl pointer-events-none rounded-full" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-emerald-500/10 via-cyan-500/10 to-transparent blur-3xl pointer-events-none rounded-full" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
          {/* Left Column: Headline & Action Buttons */}
          <div className="lg:col-span-7 space-y-6">
            {/* Status Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-primary/20 text-xs font-semibold text-on-primary-container">
              <span className="w-2 h-2 rounded-full bg-success shadow-xs animate-pulse" />
              <span>☕ Format Kilat — Asisten Pengecek Format Naskah Tanpa Drama</span>
            </div>

            {/* Headline */}
            <div className="space-y-3">
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.08] text-on-surface">
                Reviewer 2 Boleh Galak, <br />
                <span className="gradient-text-aurora">Tapi Urusan Margin Jangan Sampai Ditolak.</span>
              </h1>
              <p className="text-sm sm:text-base lg:text-lg text-on-surface-variant leading-relaxed max-w-xl">
                Bantu rapikan format skripsi, tesis, dan naskah jurnal sesuai template sasaran. Nggak perlu begadang cuma gara-gara margin meleset 2 milimeter atau kelupaan hapus nama di double-blind review.
              </p>
            </div>

            {/* Academic Level Fast Switcher on Hero */}
            <div className="p-2 rounded-2xl bg-surface-container border border-outline-variant/80 space-y-2">
              <div className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider px-2">
                Realita Lapangan per Jenjang:
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedTier("S1")}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    selectedTier === "S1"
                      ? "bg-success text-on-success shadow-sm"
                      : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high border border-outline-variant"
                  }`}
                >
                  <span>🎓 Pejuang Skripsi S1</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedTier("S2")}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    selectedTier === "S2"
                      ? "bg-primary text-on-primary shadow-sm"
                      : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high border border-outline-variant"
                  }`}
                >
                  <span>🚀 Tesis &amp; Konferensi S2</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedTier("S3")}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    selectedTier === "S3"
                      ? "bg-tertiary text-on-tertiary shadow-sm"
                      : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high border border-outline-variant"
                  }`}
                >
                  <span>🔬 Disertasi &amp; Scopus S3</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedTier("LECTURER")}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    selectedTier === "LECTURER"
                      ? "bg-warning text-on-warning shadow-sm"
                      : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high border border-outline-variant"
                  }`}
                >
                  <span>⚡ Dosen Muda &amp; BKD</span>
                </button>
              </div>

              {/* Dynamic Callout based on Tier */}
              <div className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface-variant flex items-center justify-between">
                <span className="font-medium">
                  {selectedTier === "S1" && "📌 Target S1: Margin 4-4-3-3 cm pas, font TNR 12 konsisten, dan ga panik waktu ditanya penguji soal asal-usul daftar pustaka."}
                  {selectedTier === "S2" && "📌 Target S2: Format 2 kolom IEEE / ACM rapi, formula matematika aman, dan nama pembimbing nggak bocor di blind review."}
                  {selectedTier === "S3" && "📌 Target S3: Standar Scopus Q1–Q4, sitasi nyambung dari teks ke daftar pustaka, dan gambar nggak blur saat di-zoom 300%."}
                  {selectedTier === "LECTURER" && "📌 Target Dosen: Pusing urusan BKD dan target SINTA selesai lebih cepat, biar bisa fokus mengajar tanpa pusing ngutak-ngatik spasi."}
                </span>
                <span className="text-[10px] font-bold text-primary bg-primary-container/60 px-2 py-0.5 rounded-md shrink-0 ml-2">
                  Rekomendasi Spesifik
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {user ? (
                <Button
                  size="lg"
                  onClick={() => router.push("/admin")}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-full gap-2 shadow-lg shadow-primary/25 text-xs sm:text-sm h-11 px-6 active:scale-[0.98] transition-all"
                >
                  <span>Buka Submission Studio</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  size="lg"
                  onClick={openGoogleModal}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-full gap-2.5 shadow-lg shadow-primary/25 text-xs sm:text-sm h-11 px-6 active:scale-[0.98] transition-all"
                >
                  <GoogleLogo className="w-4 h-4" />
                  <span>Masuk dengan Google SSO</span>
                </Button>
              )}

              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  const el = document.getElementById("ai-copilot");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
                className="gap-2 text-xs sm:text-sm rounded-full border-primary/30 hover:bg-primary-container/60 text-on-primary-container h-11 px-6 active:scale-[0.98] transition-all"
              >
                <Sparkles className="w-4 h-4 text-tertiary" />
                <span>Coba Format Kilat AI Copilot</span>
              </Button>
            </div>

            {/* Quick Realistic Metrics */}
            <div className="pt-6 border-t border-outline-variant grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-on-surface-variant">
              <div>
                <div className="text-base font-extrabold text-on-surface">Hitungan Detik</div>
                <div>Pengecekan Cepat</div>
              </div>
              <div>
                <div className="text-base font-extrabold text-on-surface">Template Asli</div>
                <div>Ekstraksi Geometri PDF</div>
              </div>
              <div>
                <div className="text-base font-extrabold text-on-surface">Double-Blind</div>
                <div>Sensor Identitas Otomatis</div>
              </div>
              <div>
                <div className="text-base font-extrabold text-on-surface">IEEE &amp; SINTA</div>
                <div>Dukungan Format Umum</div>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Infographic Showcase */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-3xl border border-primary/60 bg-gradient-to-b from-primary-container/50 to-tertiary-container/50 p-2 shadow-xl overflow-hidden group">
              <div className="relative rounded-2xl overflow-hidden bg-surface-container-low aspect-[4/3] flex items-center justify-center">
                <img
                  src="/illustrations/hero-infographic.jpg"
                  alt="Format Kilat AI Academic Paper Scanner Infographic"
                  className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                />

                {/* Floating Apple HIG Micro-Badges */}
                <div className="absolute top-3 left-3 bg-surface/95 backdrop-blur-md px-3 py-1.5 rounded-full border border-primary/30 shadow-md flex items-center gap-1.5 text-[11px] font-bold text-on-primary-container">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span>Pemeriksaan Koordinat Presisi</span>
                </div>

                <div className="absolute bottom-3 right-3 bg-surface/95 backdrop-blur-md px-3 py-1.5 rounded-full border border-success/30 shadow-md flex items-center gap-1.5 text-[11px] font-bold text-success">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Kepatuhan Format: 98 / 100</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          2. FORMAT KILAT AI ACADEMIC COPILOT (GROUNDED & AMUSING)
         ===================================================================== */}
      <section id="ai-copilot" className="space-y-8 scroll-mt-20">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-pink-500/10 border border-tertiary/20 text-xs font-bold text-on-tertiary-container shadow-xs">
            <Sparkles className="w-4 h-4 text-tertiary" />
            <span>Format Kilat AI Academic Copilot &bull; Multi-Tier Engine</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-on-surface leading-tight">
            Bukan Dukun Skripsi, Bukan Pula Tukang Review Gaib. <br />
            <span className="gradient-text-aurora">Asisten Cek Format yang Kasih Solusi, Bukan Sekadar Marah-Marah.</span>
          </h2>
          <p className="text-xs sm:text-sm text-on-surface-variant max-w-2xl mx-auto leading-relaxed">
            Ditenagai model cerdas yang bekerja secara offline (dan Gemini saat terhubung). AI Copilot kami membedah dokumenmu berdampingan dengan template resmi jurnal tujuan: dari margin yang nyerempet tepi, kolom yang belum dipisah, sampai referensi yang ada di daftar pustaka tapi ga pernah disebut di teks.
          </p>
        </div>

        {/* Live Interactive Copilot Widget */}
        <div className="max-w-4xl mx-auto">
          <AICopilotWidget initialTier={selectedTier} className="w-full shadow-2xl" />
        </div>
      </section>

      {/* =====================================================================
          3. HOW IT WORKS: 3-STEP PIPELINE
         ===================================================================== */}
      <section id="how-it-works" className="space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <Badge variant="default" className="text-xs bg-primary text-on-primary hover:bg-primary">
            Alur Kerja Terarah
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-on-surface">
            Cara Kerja Format Kilat (Tanpa Ribet)
          </h2>
          <p className="text-on-surface-variant text-xs sm:text-sm">
            Dari draf mentah sampai siap kirim ke meja redaksi dalam 3 langkah terarah.
          </p>
        </div>

        {/* Infographic Pipeline Visual Card */}
        <div className="rounded-3xl border border-primary/20 bg-surface-container-low p-4 sm:p-6 shadow-xl overflow-hidden space-y-6">
          <div className="rounded-2xl overflow-hidden border border-primary/20 bg-surface-container">
            <img
              src="/illustrations/how-it-works-pipeline.jpg"
              alt="Format Kilat 3-Stage Pipeline Infographic: Ingest, Analyze, Report"
              className="w-full h-auto object-cover max-h-[480px] mx-auto"
            />
          </div>

          {/* 3 Interactive Pipeline Explanation Nodes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            <div className="p-5 rounded-2xl bg-gradient-to-br from-primary-container/70 to-surface-container-low border border-primary/20 space-y-2 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-xl bg-primary text-on-primary flex items-center justify-center text-xs font-bold shadow-md shadow-primary/20">
                  01
                </span>
                <Badge variant="secondary" className="text-[10px] bg-primary-container text-on-primary-container font-bold border-primary/30">
                  Input Naskah &amp; Aturan
                </Badge>
              </div>
              <h3 className="font-bold text-sm text-on-surface">1. Unggah Naskah &amp; Template Jurnal</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Upload draf PDF naskahmu dan template jurnal yang dituju. Sistem membaca batas margin, struktur kolom, dan gaya selingkung langsung dari berkas aslinya.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-br from-tertiary-container/70 to-surface-container-low border border-tertiary/20 space-y-2 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-xl bg-tertiary text-on-tertiary flex items-center justify-center text-xs font-bold shadow-md shadow-tertiary/20">
                  02
                </span>
                <Badge variant="default" className="text-[10px] bg-tertiary-container text-on-tertiary-container font-bold border-tertiary/30 hover:bg-tertiary-container">
                  Analisis Geometri &amp; Sitasi
                </Badge>
              </div>
              <h3 className="font-bold text-sm text-on-surface">2. Pemindaian Komparatif Otomatis</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                PyMuPDF memvalidasi ukuran margin milimeter demi milimeter. Detektor entitas mencari nama penulis yang masih terselip. Mesin sitasi mencocokkan kutipan di teks langsung ke daftar pustaka.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-br from-success-container/70 to-surface-container-low border border-success/20 space-y-2 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-xl bg-success text-on-success flex items-center justify-center text-xs font-bold shadow-md shadow-success/20">
                  03
                </span>
                <Badge variant="outline" className="text-[10px] bg-success-container text-on-success-container font-bold border-success/30">
                  Laporan Visual
                </Badge>
              </div>
              <h3 className="font-bold text-sm text-on-surface">3. Laporan Visual &amp; Sertifikat Kesiapan</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Dapatkan skor kepatuhan format transparan dan unduh pratinjau PDF berkotak merah pada bagian yang meleset, lengkap dengan sertifikat kesiapan format.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          4. INTERACTIVE SIMULATOR: HAL SEPELE YANG BIKIN EDITOR GELENG-GELENG
         ===================================================================== */}
      <section className="space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <Badge variant="secondary" className="text-xs bg-primary-container/60 text-on-primary-container font-bold border-primary/30">
            Simulasi Kasus Nyata
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-on-surface">
            Hal-Hal Sepele yang Sering Bikin Naskah Mental di Meja Editor
          </h2>
          <p className="text-on-surface-variant text-xs sm:text-sm">
            Coba centang kesalahan klasik di bawah ini dan lihat bagaimana skor kepatuhan format naskahmu berubah secara otomatis:
          </p>
        </div>

        <div className="rounded-3xl border border-primary/20 bg-surface-container-low p-6 sm:p-8 shadow-xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Controls */}
          <div className="lg:col-span-7 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Kondisi Format yang Sering Terjadi:
            </h3>

            <div className="space-y-3 text-xs">
              <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-surface-container border border-outline-variant cursor-pointer hover:bg-error-container/40 hover:border-error/30 transition">
                <input
                  type="checkbox"
                  checked={simEmailLeak}
                  onChange={(e) => setSimEmailLeak(e.target.checked)}
                  className="mt-0.5 rounded text-error focus:ring-error w-4 h-4 cursor-pointer"
                />
                <div className="space-y-0.5">
                  <div className="font-bold text-on-surface flex items-center gap-1.5">
                    <span>Nama atau Email Penulis Masih Muncul di Header</span>
                    <span className="text-[10px] text-error font-mono font-bold">(-15 poin)</span>
                  </div>
                  <p className="text-on-surface-variant">
                    Bikin naskah langsung dikembalikan karena melanggar aturan double-blind peer review.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-surface-container border border-outline-variant cursor-pointer hover:bg-warning-container/40 hover:border-warning/30 transition">
                <input
                  type="checkbox"
                  checked={simSingleColumn}
                  onChange={(e) => setSimSingleColumn(e.target.checked)}
                  className="mt-0.5 rounded text-warning focus:ring-warning w-4 h-4 cursor-pointer"
                />
                <div className="space-y-0.5">
                  <div className="font-bold text-on-surface flex items-center gap-1.5">
                    <span>Masih 1 Kolom padahal Template Minta 2 Kolom</span>
                    <span className="text-[10px] text-warning font-mono font-bold">(-12 poin)</span>
                  </div>
                  <p className="text-on-surface-variant">
                    Kesalahan klasik konversi draf Word mentah ke template prosiding IEEE atau Elsevier.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-surface-container border border-outline-variant cursor-pointer hover:bg-primary-container/40 hover:border-primary/30 transition">
                <input
                  type="checkbox"
                  checked={simMissingRef}
                  onChange={(e) => setSimMissingRef(e.target.checked)}
                  className="mt-0.5 rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                />
                <div className="space-y-0.5">
                  <div className="font-bold text-on-surface flex items-center gap-1.5">
                    <span>Daftar Pustaka Berisi Rujukan yang Ga Pernah Disebut di Teks</span>
                    <span className="text-[10px] text-primary font-mono font-bold">(-8 poin)</span>
                  </div>
                  <p className="text-on-surface-variant">
                    Referensi &quot;hantu&quot; sisa copy-paste proposal lama yang lupa dibersihkan.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Real-time Dynamic Gauge Output */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 rounded-2xl bg-gradient-to-b from-surface-container to-primary-container/30 border border-primary/20 text-center space-y-4 shadow-inner">
            <div className="space-y-1">
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                Skor Format Simulasi
              </span>
              <div
                className={`text-5xl font-black tracking-tight transition-colors duration-300 ${
                  simScore >= 90
                    ? "text-success"
                    : simScore >= 75
                    ? "text-warning"
                    : "text-error"
                }`}
              >
                {simScore} <span className="text-2xl text-outline font-bold">/ 100</span>
              </div>
            </div>

            <div>
              <Badge
                variant={
                  simStatus === "PASS"
                    ? "success"
                    : simStatus === "WARNING"
                    ? "warning"
                    : "destructive"
                }
                className="text-xs px-3.5 py-1 font-bold transition-all shadow-xs"
              >
                {simStatus === "PASS"
                  ? "✓ Siap Kirim (Format Rapi)"
                  : simStatus === "WARNING"
                  ? "⚠️ Catatan Minor Perlu Disesuaikan"
                  : "✗ Perlu Koreksi Sebelum Submit"}
              </Badge>
            </div>

            <p className="text-xs text-on-surface-variant max-w-xs leading-relaxed">
              {simScore === 100
                ? "Geometri dokumen rapi! Seluruh margin, kolom, dan rujukan sudah sesuai panduan."
                : `Ditemukan ${
                    (simEmailLeak ? 1 : 0) + (simSingleColumn ? 1 : 0) + (simMissingRef ? 1 : 0)
                  } kendala format yang berpotensi bikin editor mengembalikan naskah.`}
            </p>

            <Button
              size="sm"
              onClick={openGoogleModal}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-full text-xs shadow-md shadow-primary/20 px-5 h-9"
            >
              Uji Coba pada Naskah Aslimu &rarr;
            </Button>
          </div>
        </div>
      </section>

      {/* =====================================================================
          5. TRADITIONAL VS FORMAT KILAT: HONEST & PRACTICAL
         ===================================================================== */}
      <section className="space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <Badge variant="default" className="text-xs bg-primary text-on-primary hover:bg-primary">
            Perbandingan Proses
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-on-surface">
            Review Manual vs Pengecekan Format Kilat
          </h2>
          <p className="text-on-surface-variant text-xs sm:text-sm">
            Kenapa memeriksa format sebelum kirim menghemat waktu dan kesehatan mentalmu:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* Traditional Card */}
          <div className="rounded-3xl border border-error/80 bg-gradient-to-br from-error-container/40 via-surface-container-low to-error-container/20 p-6 sm:p-8 space-y-4 shadow-lg shadow-error/5">
            <div className="flex items-center justify-between border-b border-error/20 pb-3">
              <span className="font-bold text-sm text-error flex items-center gap-1.5">
                <XCircle className="w-4 h-4 text-error" />
                Cara Manual yang Bikin Waswas
              </span>
              <Badge variant="destructive" className="text-[10px] bg-error-container text-on-error-container font-bold border-error/30">
                Lambat &amp; Berisiko
              </Badge>
            </div>

            <ul className="space-y-3 text-xs text-on-surface-variant">
              <li className="flex items-start gap-2.5">
                <span className="text-error font-bold text-sm leading-none">&times;</span>
                <span><strong>Menghabiskan berjam-jam</strong> mengukur margin penggaris manual di Word atau LaTeX.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-error font-bold text-sm leading-none">&times;</span>
                <span><strong>Naskah dikembalikan</strong> setelah nunggu berminggu-minggu cuma karena margin atau font beda tipis.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-error font-bold text-sm leading-none">&times;</span>
                <span><strong>Identitas penulis tidak sengaja tertinggal</strong>, merusak integritas double-blind review.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-error font-bold text-sm leading-none">&times;</span>
                <span><strong>Catatan editor singkat dan bikin bingung</strong>: &quot;Please conform to our journal style guidelines&quot;.</span>
              </li>
            </ul>
          </div>

          {/* Format Kilat Card */}
          <div className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary-container/60 via-tertiary-container/30 to-success-container/40 p-6 sm:p-8 space-y-4 shadow-xl shadow-primary/10">
            <div className="flex items-center justify-between border-b border-primary/20 pb-3">
              <span className="font-bold text-sm text-on-primary-container flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-primary animate-pulse" />
                Format Kilat Pre-Submission Check
              </span>
              <Badge variant="default" className="text-[10px] bg-success-container text-on-success-container font-bold border-success/30 hover:bg-success-container">
                Praktis &amp; Terarah
              </Badge>
            </div>

            <ul className="space-y-3 text-xs text-on-surface font-medium">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                <span><strong>Pengecekan tuntas dalam hitungan detik</strong>, hemat waktu sebelum berkas resmi diserahkan.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                <span><strong>Validasi presisi milimeter</strong> langsung terhadap berkas template jurnal sasaran.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                <span><strong>Sensor identitas otomatis</strong> membantu menandai nama dan email yang masih tercecer di teks.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                <span><strong>Laporan visual transparan</strong> dengan kotak panduan langsung pada file PDF naskah.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* =====================================================================
          6. SAMPLE AUDIT REPORT (macOS WINDOW)
         ===================================================================== */}
      <section id="demo-preview" className="space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <Badge variant="default" className="text-xs bg-primary text-on-primary hover:bg-primary">
            Pratinjau Laporan Nyata
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-on-surface">
            Transparan, Tanpa Istilah Teknis yang Membingungkan
          </h2>
          <p className="text-on-surface-variant text-xs sm:text-sm">
            Begini tampilan laporan audit saat memeriksa kepatuhan naskah terhadap template IEEE:
          </p>
        </div>

        {/* 3-Column macOS Window */}
        <div className="rounded-3xl border border-primary/20 bg-surface-container-low shadow-2xl overflow-hidden text-on-surface">
          {/* macOS Traffic Lights Header Bar */}
          <div className="h-11 bg-surface-container-high/80 px-4 flex items-center justify-between border-b border-primary/20 text-xs text-on-surface-variant">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-error border border-error inline-block" />
              <span className="w-3 h-3 rounded-full bg-warning/60 border border-warning inline-block" />
              <span className="w-3 h-3 rounded-full bg-success border border-success inline-block" />
              <span className="ml-3 font-semibold text-on-surface hidden sm:inline">
                Sample Report: Evaluasi Template IEEE Transactions
              </span>
            </div>
            <span className="text-[11px] font-bold text-success flex items-center gap-1.5 bg-success-container/60 px-2 py-0.5 rounded-full border border-success/30">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              Audit Selesai
            </span>
          </div>

          {/* 3 Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-primary/20 text-xs">
            {/* Column A: Template */}
            <div className="lg:col-span-3 p-5 sm:p-6 space-y-3 bg-surface-container/60">
              <div className="font-bold text-on-surface uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-primary" />
                Panduan Template Jurnal
              </div>
              <p className="text-[11px] text-on-surface-variant">
                Aturan yang dibaca dari template rujukan IEEE:
              </p>
              <div className="space-y-2">
                <div className="p-3 rounded-2xl bg-surface-container-low border border-outline-variant shadow-xs">
                  <div className="text-outline text-[10px] font-semibold">Struktur Kolom</div>
                  <div className="font-bold text-on-surface">2 Kolom (Double Column)</div>
                </div>
                <div className="p-3 rounded-2xl bg-surface-container-low border border-outline-variant shadow-xs">
                  <div className="text-outline text-[10px] font-semibold">Ukuran Font Isi</div>
                  <div className="font-bold text-on-surface">Times New Roman &bull; 10pt</div>
                </div>
                <div className="p-3 rounded-2xl bg-surface-container-low border border-outline-variant shadow-xs">
                  <div className="text-outline text-[10px] font-semibold">Batas Margin</div>
                  <div className="font-bold text-on-surface">Atas 19mm &bull; Samping 14.3mm</div>
                </div>
                <div className="p-3 rounded-2xl bg-surface-container-low border border-outline-variant shadow-xs">
                  <div className="text-outline text-[10px] font-semibold">Gaya Sitasi</div>
                  <div className="font-bold text-on-surface">Format Numerik [1], [2]</div>
                </div>
              </div>
            </div>

            {/* Column B: Author Draft with Visual Overlays */}
            <div className="lg:col-span-5 p-5 sm:p-6 space-y-3 bg-surface-container-low">
              <div className="flex items-center justify-between">
                <span className="font-bold text-on-surface uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-primary" />
                  Draf Naskah Penulis
                </span>
                <span className="text-[11px] text-error font-bold bg-error-container/60 px-2 py-0.5 rounded-full border border-error/30">
                  2 Catatan Perbaikan
                </span>
              </div>

              {/* Sample Paper Canvas */}
              <div className="bg-surface-container rounded-2xl p-4 h-64 overflow-hidden border border-outline-variant text-[10px] space-y-2.5 select-none shadow-inner">
                <div className="text-center font-bold text-xs text-on-surface">
                  Penyimpanan Data Berkecepatan Tinggi pada Sistem Terdistribusi
                </div>

                {/* Highlight 1: Email Leak */}
                <div className="p-2 border-2 border-dashed border-error bg-error-container/60 rounded-xl text-center">
                  <div className="font-bold text-on-surface">
                    Dr. Alexander Wright &bull; wright@kampus.ac.id
                  </div>
                  <div className="text-[9px] text-error font-bold">
                    Catatan: Hapus nama &amp; email untuk tahap double-blind review
                  </div>
                </div>

                <div className="italic text-on-surface-variant text-[9px] leading-tight">
                  <strong>Abstrak</strong>—Penelitian ini mengkaji efisiensi penyimpanan berkas pada basis data penelitian berskala besar...
                </div>

                {/* Highlight 2: Single Column Layout Issue */}
                <div className="p-2 border-2 border-dashed border-warning bg-warning-container/60 rounded-xl text-[9px] text-on-surface">
                  <strong>1. Pendahuluan</strong>: Dalam arsitektur komputasi modern, pemisahan berkas sering kali memperlambat pertukaran data...
                  <div className="mt-1 font-bold text-warning">
                    Catatan: Draf masih 1 kolom, template mewajibkan format 2 kolom.
                  </div>
                </div>
              </div>
            </div>

            {/* Column C: Scorecard */}
            <div className="lg:col-span-4 p-5 sm:p-6 space-y-3 bg-surface-container/60">
              <div className="flex items-center justify-between">
                <span className="font-bold text-on-surface uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-warning" />
                  Skor Kepatuhan Format
                </span>
                <span className="font-black text-warning text-sm">78 / 100</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-2xl bg-error-container/60 border border-error/30 flex items-start gap-2 text-on-surface">
                  <AlertTriangle className="w-4 h-4 text-error shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-on-error-container">Identitas Penulis Terdeteksi</span>: Bersihkan nama dan email sebelum submit double-blind.
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-warning-container/60 border border-warning/30 flex items-start gap-2 text-on-surface">
                  <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-on-warning-container">Format Kolom Berbeda</span>: Sesuaikan draf menjadi 2 kolom sesuai template.
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-success-container/60 border border-success/30 flex items-start gap-2 text-on-surface">
                  <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-on-success-container">Sitasi Terverifikasi</span>: Seluruh 24 rujukan di teks sesuai dengan daftar pustaka.
                  </div>
                </div>
              </div>

              <Button
                size="sm"
                onClick={openGoogleModal}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold rounded-full mt-2 h-9 shadow-md shadow-primary/20"
              >
                Masuk untuk memeriksa naskahmu &rarr;
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          7. COMMERCIAL PRICING & TIERS (FAIR, HONEST, NO OVERCLAIMS)
         ===================================================================== */}
      <section id="pricing" className="space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <Badge variant="default" className="text-xs bg-success text-on-success hover:bg-success">
            Pilihan Paket Praktis &bull; Transparan &amp; Adil
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-on-surface">
            Pilih Paket Pengecekan Sesuai Kebutuhanmu
          </h2>
          <p className="text-on-surface-variant text-xs sm:text-sm leading-relaxed">
            Dari mahasiswa yang mengejar deadline sidang hingga laboratorium riset kampus. Bebaskan pikiran dari urusan margin dan fokus pada substansi riset.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {/* Tier 1: Mahasiswa S1 */}
          <div className="rounded-3xl border border-outline-variant bg-surface-container-low p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-elevation-1 hover:shadow-xl transition-all">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Mahasiswa S1</span>
                <Badge variant="outline" className="text-[10px] text-on-surface-variant">Free Tier</Badge>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-black text-on-surface">Rp 0</div>
                <p className="text-xs text-outline">Gratis untuk 1 naskah per hari sebelum sidang skripsi</p>
              </div>
              <ul className="space-y-2.5 text-xs text-on-surface-variant pt-2 border-t border-outline-variant">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-success shrink-0" />
                  <span>Cek margin standar A4 &amp; 4-4-3-3 cm</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-success shrink-0" />
                  <span>Pemeriksaan 1 vs 2 kolom IEEE</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-success shrink-0" />
                  <span>Peringatan kebocoran nama penulis di berkas</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-success shrink-0" />
                  <span>Cross-check sitasi numerik di badan teks</span>
                </li>
              </ul>
            </div>
            <Button
              variant="outline"
              onClick={openGoogleModal}
              className="w-full rounded-full text-xs font-bold h-10 border-outline hover:bg-surface-container"
            >
              Mulai Cek Gratis
            </Button>
          </div>

          {/* Tier 2: Peneliti Mandiri S2/S3 (BEST VALUE) */}
          <div className="rounded-3xl border-2 border-primary bg-gradient-to-b from-primary-container/50 via-surface-container-low to-surface-container-low p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-primary text-on-primary text-[10px] font-bold px-4 py-1 rounded-bl-2xl">
              PILIHAN POPULER
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-on-primary-container uppercase tracking-wider">Peneliti Pro (S2 / S3 / Dosen)</span>
              </div>
              <div className="space-y-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-on-surface">Rp 49.000</span>
                  <span className="text-xs text-on-surface-variant">/ naskah</span>
                </div>
                <p className="text-xs text-on-primary-container font-semibold">Untuk naskah tesis, prosiding, atau jurnal yang butuh ketelitian tinggi</p>
              </div>
              <ul className="space-y-2.5 text-xs text-on-surface-variant pt-2 border-t border-primary/20 font-medium">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  <span><strong>Semua fitur Mahasiswa S1</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  <span><strong>Ekstraksi geometri dari berkas template asli jurnal sasaran</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  <span><strong>Rekomendasi perataan tata letak otomatis (&amp; pratinjau PDF)</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  <span><strong>Sertifikat Kepatuhan Format Resmi (dengan QR verifikasi)</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  <span>Pemeriksaan menyeluruh font, gutter spasi, dan daftar pustaka</span>
                </li>
              </ul>
            </div>
            <Button
              onClick={openGoogleModal}
              className="w-full bg-primary hover:bg-primary text-on-primary rounded-full text-xs font-bold h-11 shadow-lg shadow-primary/30"
            >
              Pilih Paket Peneliti Pro &rarr;
            </Button>
          </div>

          {/* Tier 3: Kampus & Lab Riset Enterprise */}
          <div className="rounded-3xl border border-outline-variant bg-surface-container-low p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-elevation-1 hover:shadow-xl transition-all">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Laboratorium &amp; Kampus</span>
                <Badge variant="outline" className="text-[10px] text-on-tertiary-container border-tertiary/30 bg-tertiary-container/60">Institusi</Badge>
              </div>
              <div className="space-y-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-on-surface">Rp 499.000</span>
                  <span className="text-xs text-on-surface-variant">/ bulan</span>
                </div>
                <p className="text-xs text-outline">Audit berkala untuk laboratorium, tim riset, atau dewan jurnal</p>
              </div>
              <ul className="space-y-2.5 text-xs text-on-surface-variant pt-2 border-t border-outline-variant">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-tertiary shrink-0" />
                  <span>Pengecekan naskah untuk seluruh anggota tim riset/lab</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-tertiary shrink-0" />
                  <span>Laporan terintegrasi untuk verifikasi berkas ujian/sidang</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-tertiary shrink-0" />
                  <span>Kustomisasi panduan format internal fakultas/kampus</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-tertiary shrink-0" />
                  <span>Akses API terpadu &amp; prioritas antrean rendering</span>
                </li>
              </ul>
            </div>
            <Button
              variant="outline"
              onClick={openGoogleModal}
              className="w-full rounded-full text-xs font-bold h-10 border-tertiary/50 text-on-tertiary-container hover:bg-tertiary-container/60"
            >
              Hubungi Lisensi Kampus
            </Button>
          </div>
        </div>
      </section>

      {/* =====================================================================
          8. BOTTOM CTA BANNER: GROUNDED & CONVINCING
         ===================================================================== */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-8 sm:p-14 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl">
        {/* Glow Spheres */}
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-surface/15 blur-2xl rounded-full pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-warning/15 blur-2xl rounded-full pointer-events-none" />

        <div className="space-y-2 text-center sm:text-left relative z-10">
          <Badge variant="secondary" className="text-[10px] bg-white/20 text-white border border-white/30 font-bold">
            ⚡ Pengecekan Format Terpercaya
          </Badge>
          <h2 className="text-xl sm:text-3xl font-black tracking-tight">
            Jangan Biarkan Riset Berbulan-bulan Terhambat Urusan Margin
          </h2>
          <p className="text-xs sm:text-sm text-white/90 max-w-lg leading-relaxed">
            Masuk dengan Google SSO ke Format Kilat. Unggah naskah dan template jurnal tujuanmu untuk memeriksa kepatuhan format serta mendapatkan sertifikat kesiapannya.
          </p>
        </div>
        <Button
          size="lg"
          onClick={openGoogleModal}
          className="bg-surface-container-low hover:bg-surface-container-high text-on-primary-container font-bold text-xs sm:text-sm px-8 rounded-full shrink-0 shadow-xl gap-2.5 h-12 active:scale-[0.98] transition-all relative z-10"
        >
          <GoogleLogo className="w-4 h-4" />
          <span>Mulai dengan Google SSO</span>
        </Button>
      </section>
    </div>
  );
}
