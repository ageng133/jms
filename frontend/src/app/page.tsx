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
      <section className="relative overflow-hidden rounded-3xl bg-white p-6 sm:p-10 lg:p-12 border border-indigo-100 shadow-2xl text-slate-900">
        {/* Ambient Mesh Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-500/15 via-purple-500/10 to-pink-500/5 blur-3xl pointer-events-none rounded-full" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-emerald-500/10 via-cyan-500/10 to-transparent blur-3xl pointer-events-none rounded-full" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
          {/* Left Column: Headline & Action Buttons */}
          <div className="lg:col-span-7 space-y-6">
            {/* Status Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs animate-pulse" />
              <span>☕ Format Kilat — Asisten Pengecek Format Naskah Tanpa Drama</span>
            </div>

            {/* Headline */}
            <div className="space-y-3">
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.08] text-slate-900">
                Reviewer 2 Boleh Galak, <br />
                <span className="gradient-text-aurora">Tapi Urusan Margin Jangan Sampai Ditolak.</span>
              </h1>
              <p className="text-sm sm:text-base lg:text-lg text-slate-600 leading-relaxed max-w-xl">
                Bantu rapikan format skripsi, tesis, dan naskah jurnal sesuai template sasaran. Nggak perlu begadang cuma gara-gara margin meleset 2 milimeter atau kelupaan hapus nama di double-blind review.
              </p>
            </div>

            {/* Academic Level Fast Switcher on Hero */}
            <div className="p-2 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-2">
                Realita Lapangan per Jenjang:
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedTier("S1")}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    selectedTier === "S1"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  <span>🎓 Pejuang Skripsi S1</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedTier("S2")}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    selectedTier === "S2"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  <span>🚀 Tesis &amp; Konferensi S2</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedTier("S3")}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    selectedTier === "S3"
                      ? "bg-purple-600 text-white shadow-sm"
                      : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  <span>🔬 Disertasi &amp; Scopus S3</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedTier("LECTURER")}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    selectedTier === "LECTURER"
                      ? "bg-amber-600 text-white shadow-sm"
                      : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  <span>⚡ Dosen Muda &amp; BKD</span>
                </button>
              </div>

              {/* Dynamic Callout based on Tier */}
              <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 flex items-center justify-between">
                <span className="font-medium">
                  {selectedTier === "S1" && "📌 Target S1: Margin 4-4-3-3 cm pas, font TNR 12 konsisten, dan ga panik waktu ditanya penguji soal asal-usul daftar pustaka."}
                  {selectedTier === "S2" && "📌 Target S2: Format 2 kolom IEEE / ACM rapi, formula matematika aman, dan nama pembimbing nggak bocor di blind review."}
                  {selectedTier === "S3" && "📌 Target S3: Standar Scopus Q1–Q4, sitasi nyambung dari teks ke daftar pustaka, dan gambar nggak blur saat di-zoom 300%."}
                  {selectedTier === "LECTURER" && "📌 Target Dosen: Pusing urusan BKD dan target SINTA selesai lebih cepat, biar bisa fokus mengajar tanpa pusing ngutak-ngatik spasi."}
                </span>
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md shrink-0 ml-2">
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
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-full gap-2 shadow-lg shadow-indigo-600/25 text-xs sm:text-sm h-11 px-6 active:scale-[0.98] transition-all"
                >
                  <span>Buka Submission Studio</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  size="lg"
                  onClick={openGoogleModal}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-full gap-2.5 shadow-lg shadow-indigo-600/25 text-xs sm:text-sm h-11 px-6 active:scale-[0.98] transition-all"
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
                className="gap-2 text-xs sm:text-sm rounded-full border-indigo-200 hover:bg-indigo-50 text-indigo-900 h-11 px-6 active:scale-[0.98] transition-all"
              >
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>Coba Format Kilat AI Copilot</span>
              </Button>
            </div>

            {/* Quick Realistic Metrics */}
            <div className="pt-6 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-slate-500">
              <div>
                <div className="text-base font-extrabold text-slate-900">Hitungan Detik</div>
                <div>Pengecekan Cepat</div>
              </div>
              <div>
                <div className="text-base font-extrabold text-slate-900">Template Asli</div>
                <div>Ekstraksi Geometri PDF</div>
              </div>
              <div>
                <div className="text-base font-extrabold text-slate-900">Double-Blind</div>
                <div>Sensor Identitas Otomatis</div>
              </div>
              <div>
                <div className="text-base font-extrabold text-slate-900">IEEE &amp; SINTA</div>
                <div>Dukungan Format Umum</div>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Infographic Showcase */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-3xl border border-indigo-200/60 bg-gradient-to-b from-indigo-50/50 to-purple-50/50 p-2 shadow-xl overflow-hidden group">
              <div className="relative rounded-2xl overflow-hidden bg-white aspect-[4/3] flex items-center justify-center">
                <img
                  src="/illustrations/hero-infographic.jpg"
                  alt="Format Kilat AI Academic Paper Scanner Infographic"
                  className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                />

                {/* Floating Apple HIG Micro-Badges */}
                <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full border border-indigo-200 shadow-md flex items-center gap-1.5 text-[11px] font-bold text-indigo-900">
                  <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                  <span>Pemeriksaan Koordinat Presisi</span>
                </div>

                <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full border border-emerald-200 shadow-md flex items-center gap-1.5 text-[11px] font-bold text-emerald-600">
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
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-pink-500/10 border border-purple-500/20 text-xs font-bold text-purple-700 shadow-xs">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span>Format Kilat AI Academic Copilot &bull; Multi-Tier Engine</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-900 leading-tight">
            Bukan Dukun Skripsi, Bukan Pula Tukang Review Gaib. <br />
            <span className="gradient-text-aurora">Asisten Cek Format yang Kasih Solusi, Bukan Sekadar Marah-Marah.</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed">
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
          <Badge variant="default" className="text-xs bg-indigo-600 text-white hover:bg-indigo-700">
            Alur Kerja Terarah
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Cara Kerja Format Kilat (Tanpa Ribet)
          </h2>
          <p className="text-slate-600 text-xs sm:text-sm">
            Dari draf mentah sampai siap kirim ke meja redaksi dalam 3 langkah terarah.
          </p>
        </div>

        {/* Infographic Pipeline Visual Card */}
        <div className="rounded-3xl border border-indigo-100 bg-white p-4 sm:p-6 shadow-xl overflow-hidden space-y-6">
          <div className="rounded-2xl overflow-hidden border border-indigo-100 bg-slate-50">
            <img
              src="/illustrations/how-it-works-pipeline.jpg"
              alt="Format Kilat 3-Stage Pipeline Infographic: Ingest, Analyze, Report"
              className="w-full h-auto object-cover max-h-[480px] mx-auto"
            />
          </div>

          {/* 3 Interactive Pipeline Explanation Nodes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50/70 to-white border border-indigo-100 space-y-2 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-md shadow-indigo-600/20">
                  01
                </span>
                <Badge variant="secondary" className="text-[10px] bg-indigo-100 text-indigo-700 font-bold border-indigo-200">
                  Input Naskah &amp; Aturan
                </Badge>
              </div>
              <h3 className="font-bold text-sm text-slate-900">1. Unggah Naskah &amp; Template Jurnal</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Upload draf PDF naskahmu dan template jurnal yang dituju. Sistem membaca batas margin, struktur kolom, dan gaya selingkung langsung dari berkas aslinya.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-50/70 to-white border border-purple-100 space-y-2 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center text-xs font-bold shadow-md shadow-purple-600/20">
                  02
                </span>
                <Badge variant="default" className="text-[10px] bg-purple-100 text-purple-700 font-bold border-purple-200 hover:bg-purple-200">
                  Analisis Geometri &amp; Sitasi
                </Badge>
              </div>
              <h3 className="font-bold text-sm text-slate-900">2. Pemindaian Komparatif Otomatis</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                PyMuPDF memvalidasi ukuran margin milimeter demi milimeter. Detektor entitas mencari nama penulis yang masih terselip. Mesin sitasi mencocokkan kutipan di teks langsung ke daftar pustaka.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50/70 to-white border border-emerald-100 space-y-2 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shadow-md shadow-emerald-600/20">
                  03
                </span>
                <Badge variant="outline" className="text-[10px] bg-emerald-100 text-emerald-700 font-bold border-emerald-200">
                  Laporan Visual
                </Badge>
              </div>
              <h3 className="font-bold text-sm text-slate-900">3. Laporan Visual &amp; Sertifikat Kesiapan</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
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
          <Badge variant="secondary" className="text-xs bg-indigo-50 text-indigo-700 font-bold border-indigo-200">
            Simulasi Kasus Nyata
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Hal-Hal Sepele yang Sering Bikin Naskah Mental di Meja Editor
          </h2>
          <p className="text-slate-600 text-xs sm:text-sm">
            Coba centang kesalahan klasik di bawah ini dan lihat bagaimana skor kepatuhan format naskahmu berubah secara otomatis:
          </p>
        </div>

        <div className="rounded-3xl border border-indigo-100 bg-white p-6 sm:p-8 shadow-xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Controls */}
          <div className="lg:col-span-7 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Kondisi Format yang Sering Terjadi:
            </h3>

            <div className="space-y-3 text-xs">
              <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-rose-50/40 hover:border-rose-200 transition">
                <input
                  type="checkbox"
                  checked={simEmailLeak}
                  onChange={(e) => setSimEmailLeak(e.target.checked)}
                  className="mt-0.5 rounded text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                />
                <div className="space-y-0.5">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <span>Nama atau Email Penulis Masih Muncul di Header</span>
                    <span className="text-[10px] text-rose-600 font-mono font-bold">(-15 poin)</span>
                  </div>
                  <p className="text-slate-500">
                    Bikin naskah langsung dikembalikan karena melanggar aturan double-blind peer review.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-amber-50/40 hover:border-amber-200 transition">
                <input
                  type="checkbox"
                  checked={simSingleColumn}
                  onChange={(e) => setSimSingleColumn(e.target.checked)}
                  className="mt-0.5 rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                />
                <div className="space-y-0.5">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <span>Masih 1 Kolom padahal Template Minta 2 Kolom</span>
                    <span className="text-[10px] text-amber-600 font-mono font-bold">(-12 poin)</span>
                  </div>
                  <p className="text-slate-500">
                    Kesalahan klasik konversi draf Word mentah ke template prosiding IEEE atau Elsevier.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-indigo-50/40 hover:border-indigo-200 transition">
                <input
                  type="checkbox"
                  checked={simMissingRef}
                  onChange={(e) => setSimMissingRef(e.target.checked)}
                  className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                />
                <div className="space-y-0.5">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <span>Daftar Pustaka Berisi Rujukan yang Ga Pernah Disebut di Teks</span>
                    <span className="text-[10px] text-indigo-600 font-mono font-bold">(-8 poin)</span>
                  </div>
                  <p className="text-slate-500">
                    Referensi &quot;hantu&quot; sisa copy-paste proposal lama yang lupa dibersihkan.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Real-time Dynamic Gauge Output */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 rounded-2xl bg-gradient-to-b from-slate-50 to-indigo-50/30 border border-indigo-100 text-center space-y-4 shadow-inner">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Skor Format Simulasi
              </span>
              <div
                className={`text-5xl font-black tracking-tight transition-colors duration-300 ${
                  simScore >= 90
                    ? "text-emerald-600"
                    : simScore >= 75
                    ? "text-amber-500"
                    : "text-rose-500"
                }`}
              >
                {simScore} <span className="text-2xl text-slate-400 font-bold">/ 100</span>
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

            <p className="text-xs text-slate-600 max-w-xs leading-relaxed">
              {simScore === 100
                ? "Geometri dokumen rapi! Seluruh margin, kolom, dan rujukan sudah sesuai panduan."
                : `Ditemukan ${
                    (simEmailLeak ? 1 : 0) + (simSingleColumn ? 1 : 0) + (simMissingRef ? 1 : 0)
                  } kendala format yang berpotensi bikin editor mengembalikan naskah.`}
            </p>

            <Button
              size="sm"
              onClick={openGoogleModal}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-full text-xs shadow-md shadow-indigo-600/20 px-5 h-9"
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
          <Badge variant="default" className="text-xs bg-indigo-600 text-white hover:bg-indigo-700">
            Perbandingan Proses
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Review Manual vs Pengecekan Format Kilat
          </h2>
          <p className="text-slate-600 text-xs sm:text-sm">
            Kenapa memeriksa format sebelum kirim menghemat waktu dan kesehatan mentalmu:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* Traditional Card */}
          <div className="rounded-3xl border border-rose-200/80 bg-gradient-to-br from-rose-50/40 via-white to-rose-50/20 p-6 sm:p-8 space-y-4 shadow-lg shadow-rose-500/5">
            <div className="flex items-center justify-between border-b border-rose-100 pb-3">
              <span className="font-bold text-sm text-rose-600 flex items-center gap-1.5">
                <XCircle className="w-4 h-4 text-rose-600" />
                Cara Manual yang Bikin Waswas
              </span>
              <Badge variant="destructive" className="text-[10px] bg-rose-100 text-rose-700 font-bold border-rose-200">
                Lambat &amp; Berisiko
              </Badge>
            </div>

            <ul className="space-y-3 text-xs text-slate-600">
              <li className="flex items-start gap-2.5">
                <span className="text-rose-600 font-bold text-sm leading-none">&times;</span>
                <span><strong>Menghabiskan berjam-jam</strong> mengukur margin penggaris manual di Word atau LaTeX.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-rose-600 font-bold text-sm leading-none">&times;</span>
                <span><strong>Naskah dikembalikan</strong> setelah nunggu berminggu-minggu cuma karena margin atau font beda tipis.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-rose-600 font-bold text-sm leading-none">&times;</span>
                <span><strong>Identitas penulis tidak sengaja tertinggal</strong>, merusak integritas double-blind review.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-rose-600 font-bold text-sm leading-none">&times;</span>
                <span><strong>Catatan editor singkat dan bikin bingung</strong>: &quot;Please conform to our journal style guidelines&quot;.</span>
              </li>
            </ul>
          </div>

          {/* Format Kilat Card */}
          <div className="rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50/60 via-purple-50/30 to-emerald-50/40 p-6 sm:p-8 space-y-4 shadow-xl shadow-indigo-500/10">
            <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
              <span className="font-bold text-sm text-indigo-700 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-indigo-600 animate-pulse" />
                Format Kilat Pre-Submission Check
              </span>
              <Badge variant="default" className="text-[10px] bg-emerald-100 text-emerald-700 font-bold border-emerald-200 hover:bg-emerald-200">
                Praktis &amp; Terarah
              </Badge>
            </div>

            <ul className="space-y-3 text-xs text-slate-800 font-medium">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Pengecekan tuntas dalam hitungan detik</strong>, hemat waktu sebelum berkas resmi diserahkan.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Validasi presisi milimeter</strong> langsung terhadap berkas template jurnal sasaran.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Sensor identitas otomatis</strong> membantu menandai nama dan email yang masih tercecer di teks.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
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
          <Badge variant="default" className="text-xs bg-indigo-600 text-white hover:bg-indigo-700">
            Pratinjau Laporan Nyata
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Transparan, Tanpa Istilah Teknis yang Membingungkan
          </h2>
          <p className="text-slate-600 text-xs sm:text-sm">
            Begini tampilan laporan audit saat memeriksa kepatuhan naskah terhadap template IEEE:
          </p>
        </div>

        {/* 3-Column macOS Window */}
        <div className="rounded-3xl border border-indigo-100 bg-white shadow-2xl overflow-hidden text-slate-900">
          {/* macOS Traffic Lights Header Bar */}
          <div className="h-11 bg-slate-100/80 px-4 flex items-center justify-between border-b border-indigo-100 text-xs text-slate-500">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-rose-500 border border-rose-600 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-400 border border-amber-500 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500 border border-emerald-600 inline-block" />
              <span className="ml-3 font-semibold text-slate-800 hidden sm:inline">
                Sample Report: Evaluasi Template IEEE Transactions
              </span>
            </div>
            <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1.5 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Audit Selesai
            </span>
          </div>

          {/* 3 Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-indigo-100 text-xs">
            {/* Column A: Template */}
            <div className="lg:col-span-3 p-5 sm:p-6 space-y-3 bg-slate-50/60">
              <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                Panduan Template Jurnal
              </div>
              <p className="text-[11px] text-slate-500">
                Aturan yang dibaca dari template rujukan IEEE:
              </p>
              <div className="space-y-2">
                <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-xs">
                  <div className="text-slate-400 text-[10px] font-semibold">Struktur Kolom</div>
                  <div className="font-bold text-slate-900">2 Kolom (Double Column)</div>
                </div>
                <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-xs">
                  <div className="text-slate-400 text-[10px] font-semibold">Ukuran Font Isi</div>
                  <div className="font-bold text-slate-900">Times New Roman &bull; 10pt</div>
                </div>
                <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-xs">
                  <div className="text-slate-400 text-[10px] font-semibold">Batas Margin</div>
                  <div className="font-bold text-slate-900">Atas 19mm &bull; Samping 14.3mm</div>
                </div>
                <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-xs">
                  <div className="text-slate-400 text-[10px] font-semibold">Gaya Sitasi</div>
                  <div className="font-bold text-slate-900">Format Numerik [1], [2]</div>
                </div>
              </div>
            </div>

            {/* Column B: Author Draft with Visual Overlays */}
            <div className="lg:col-span-5 p-5 sm:p-6 space-y-3 bg-white">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  Draf Naskah Penulis
                </span>
                <span className="text-[11px] text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                  2 Catatan Perbaikan
                </span>
              </div>

              {/* Sample Paper Canvas */}
              <div className="bg-slate-50 rounded-2xl p-4 h-64 overflow-hidden border border-slate-200 text-[10px] space-y-2.5 select-none shadow-inner">
                <div className="text-center font-bold text-xs text-slate-900">
                  Penyimpanan Data Berkecepatan Tinggi pada Sistem Terdistribusi
                </div>

                {/* Highlight 1: Email Leak */}
                <div className="p-2 border-2 border-dashed border-rose-500 bg-rose-50 rounded-xl text-center">
                  <div className="font-bold text-slate-900">
                    Dr. Alexander Wright &bull; wright@kampus.ac.id
                  </div>
                  <div className="text-[9px] text-rose-600 font-bold">
                    Catatan: Hapus nama &amp; email untuk tahap double-blind review
                  </div>
                </div>

                <div className="italic text-slate-500 text-[9px] leading-tight">
                  <strong>Abstrak</strong>—Penelitian ini mengkaji efisiensi penyimpanan berkas pada basis data penelitian berskala besar...
                </div>

                {/* Highlight 2: Single Column Layout Issue */}
                <div className="p-2 border-2 border-dashed border-amber-500 bg-amber-50 rounded-xl text-[9px] text-slate-900">
                  <strong>1. Pendahuluan</strong>: Dalam arsitektur komputasi modern, pemisahan berkas sering kali memperlambat pertukaran data...
                  <div className="mt-1 font-bold text-amber-600">
                    Catatan: Draf masih 1 kolom, template mewajibkan format 2 kolom.
                  </div>
                </div>
              </div>
            </div>

            {/* Column C: Scorecard */}
            <div className="lg:col-span-4 p-5 sm:p-6 space-y-3 bg-slate-50/60">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Skor Kepatuhan Format
                </span>
                <span className="font-black text-amber-600 text-sm">78 / 100</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-2 text-slate-800">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-rose-700">Identitas Penulis Terdeteksi</span>: Bersihkan nama dan email sebelum submit double-blind.
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-2 text-slate-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-700">Format Kolom Berbeda</span>: Sesuaikan draf menjadi 2 kolom sesuai template.
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-2 text-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-emerald-700">Sitasi Terverifikasi</span>: Seluruh 24 rujukan di teks sesuai dengan daftar pustaka.
                  </div>
                </div>
              </div>

              <Button
                size="sm"
                onClick={openGoogleModal}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold rounded-full mt-2 h-9 shadow-md shadow-indigo-600/20"
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
          <Badge variant="default" className="text-xs bg-emerald-600 text-white hover:bg-emerald-700">
            Pilihan Paket Praktis &bull; Transparan &amp; Adil
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Pilih Paket Pengecekan Sesuai Kebutuhanmu
          </h2>
          <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
            Dari mahasiswa yang mengejar deadline sidang hingga laboratorium riset kampus. Bebaskan pikiran dari urusan margin dan fokus pada substansi riset.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {/* Tier 1: Mahasiswa S1 */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-apple-card hover:shadow-xl transition-all">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mahasiswa S1</span>
                <Badge variant="outline" className="text-[10px] text-slate-600">Free Tier</Badge>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-black text-slate-900">Rp 0</div>
                <p className="text-xs text-slate-400">Gratis untuk 1 naskah per hari sebelum sidang skripsi</p>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Cek margin standar A4 &amp; 4-4-3-3 cm</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Pemeriksaan 1 vs 2 kolom IEEE</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Peringatan kebocoran nama penulis di berkas</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Cross-check sitasi numerik di badan teks</span>
                </li>
              </ul>
            </div>
            <Button
              variant="outline"
              onClick={openGoogleModal}
              className="w-full rounded-full text-xs font-bold h-10 border-slate-300 hover:bg-slate-50"
            >
              Mulai Cek Gratis
            </Button>
          </div>

          {/* Tier 2: Peneliti Mandiri S2/S3 (BEST VALUE) */}
          <div className="rounded-3xl border-2 border-indigo-600 bg-gradient-to-b from-indigo-50/50 via-white to-white p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-bold px-4 py-1 rounded-bl-2xl">
              PILIHAN POPULER
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Peneliti Pro (S2 / S3 / Dosen)</span>
              </div>
              <div className="space-y-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-900">Rp 49.000</span>
                  <span className="text-xs text-slate-500">/ naskah</span>
                </div>
                <p className="text-xs text-indigo-700 font-semibold">Untuk naskah tesis, prosiding, atau jurnal yang butuh ketelitian tinggi</p>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-700 pt-2 border-t border-indigo-100 font-medium">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span><strong>Semua fitur Mahasiswa S1</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span><strong>Ekstraksi geometri dari berkas template asli jurnal sasaran</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span><strong>Rekomendasi perataan tata letak otomatis (&amp; pratinjau PDF)</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span><strong>Sertifikat Kepatuhan Format Resmi (dengan QR verifikasi)</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Pemeriksaan menyeluruh font, gutter spasi, dan daftar pustaka</span>
                </li>
              </ul>
            </div>
            <Button
              onClick={openGoogleModal}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-xs font-bold h-11 shadow-lg shadow-indigo-600/30"
            >
              Pilih Paket Peneliti Pro &rarr;
            </Button>
          </div>

          {/* Tier 3: Kampus & Lab Riset Enterprise */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-apple-card hover:shadow-xl transition-all">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Laboratorium &amp; Kampus</span>
                <Badge variant="outline" className="text-[10px] text-purple-700 border-purple-200 bg-purple-50">Institusi</Badge>
              </div>
              <div className="space-y-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-900">Rp 499.000</span>
                  <span className="text-xs text-slate-500">/ bulan</span>
                </div>
                <p className="text-xs text-slate-400">Audit berkala untuk laboratorium, tim riset, atau dewan jurnal</p>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-purple-600 shrink-0" />
                  <span>Pengecekan naskah untuk seluruh anggota tim riset/lab</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-purple-600 shrink-0" />
                  <span>Laporan terintegrasi untuk verifikasi berkas ujian/sidang</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-purple-600 shrink-0" />
                  <span>Kustomisasi panduan format internal fakultas/kampus</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-purple-600 shrink-0" />
                  <span>Akses API terpadu &amp; prioritas antrean rendering</span>
                </li>
              </ul>
            </div>
            <Button
              variant="outline"
              onClick={openGoogleModal}
              className="w-full rounded-full text-xs font-bold h-10 border-purple-300 text-purple-800 hover:bg-purple-50"
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
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-white/15 blur-2xl rounded-full pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-yellow-300/15 blur-2xl rounded-full pointer-events-none" />

        <div className="space-y-2 text-center sm:text-left relative z-10">
          <Badge variant="secondary" className="text-[10px] bg-white/20 text-white border-white/30 font-bold">
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
          className="bg-white hover:bg-slate-100 text-indigo-700 font-bold text-xs sm:text-sm px-8 rounded-full shrink-0 shadow-xl gap-2.5 h-12 active:scale-[0.98] transition-all relative z-10"
        >
          <GoogleLogo className="w-4 h-4" />
          <span>Mulai dengan Google SSO</span>
        </Button>
      </section>
    </div>
  );
}
