"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Sparkles,
  Layers,
  ShieldCheck,
  AlertTriangle,
  ChevronRight,
  Box,
  Compass,
  Zap,
  Clock,
  Scan,
  XCircle,
  HelpCircle,
  UploadCloud,
  FileCheck2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { GoogleLogo } from "@/components/GoogleAuthModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AICopilotWidget } from "@/components/audit/AICopilotWidget";
import { AcademicTier } from "@/types/jms";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

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
          1. HERO SECTION WITH VIBRANT AURORA GRADIENT & ZILENIAL PERSONAS
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
              <span>⚡ Format Kilat — Platform Review &amp; Format Otomatis Zilenial</span>
            </div>

            {/* Headline */}
            <div className="space-y-3">
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.08] text-slate-900">
                Zero Desk Rejections. <br />
                <span className="gradient-text-aurora">Lulus Format dalam ~0.8 Detik.</span>
              </h1>
              <p className="text-sm sm:text-base lg:text-lg text-slate-600 leading-relaxed max-w-xl">
                Dirancang untuk Zilenial pejuang <strong>S1 Skripsi</strong>, <strong>S2 Tesis</strong>, <strong>S3 Disertasi Scopus</strong>, dan <strong>Dosen Muda</strong>. Otomasi audit margin 4-4-3-3 cm, layout 2 kolom IEEE, kebocoran blind review, dan sitasi dengan panduan cerdas <strong>AI Copilot</strong>.
              </p>
            </div>

            {/* Academic Level Fast Switcher on Hero */}
            <div className="p-2 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-2">
                Pilih Target Jenjang Akademik Anda:
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
                  <span>🎓 S1 Skripsi</span>
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
                  <span>🚀 S2 Tesis</span>
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
                  <span>🔬 S3 Scopus</span>
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
                  <span>⚡ Dosen Muda</span>
                </button>
              </div>

              {/* Dynamic Callout based on Tier */}
              <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 flex items-center justify-between">
                <span className="font-medium">
                  {selectedTier === "S1" && "📌 Target S1: Margin 4-4-3-3 cm, font TNR 12, bebas plagiarisme, dan simulasi pertanyaan penguji sidang."}
                  {selectedTier === "S2" && "📌 Target S2: Format 2 kolom IEEE / ACM, kode Overleaf instan, dan anonymizer double-blind review."}
                  {selectedTier === "S3" && "📌 Target S3: Standar Scopus Q1/Q2, validasi sitasi Crossref, cek retraksi, dan grafik >= 300 DPI."}
                  {selectedTier === "LECTURER" && "📌 Target Dosen: Akreditasi SINTA 1–6, pemenuhan luaran BKD, dan koreksi batch naskah 1-klik."}
                </span>
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md shrink-0 ml-2">
                  100% Cocok
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

            {/* Quick Metrics */}
            <div className="pt-6 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-slate-500">
              <div>
                <div className="text-base font-extrabold text-slate-900">~0.8 Detik</div>
                <div>Laser Audit Latency</div>
              </div>
              <div>
                <div className="text-base font-extrabold text-slate-900">Box Cloud</div>
                <div>Direct S3 Ingestion</div>
              </div>
              <div>
                <div className="text-base font-extrabold text-slate-900">Double-Blind</div>
                <div>spaCy NER Sanitization</div>
              </div>
              <div>
                <div className="text-base font-extrabold text-slate-900">IEEE &amp; SINTA</div>
                <div>SOTA Template Support</div>
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
                  <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
                  <span>Real-Time Laser Beam</span>
                </div>

                <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full border border-emerald-200 shadow-md flex items-center gap-1.5 text-[11px] font-bold text-emerald-600">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Compliance: 98 / 100 PASS</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          2. FORMAT KILAT AI ACADEMIC COPILOT (LIVE INTERACTIVE SHOWCASE)
         ===================================================================== */}
      <section id="ai-copilot" className="space-y-8 scroll-mt-20">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-pink-500/10 border border-purple-500/20 text-xs font-bold text-purple-700 shadow-xs">
            <Sparkles className="w-4 h-4 text-purple-600 animate-spin" style={{ animationDuration: "6s" }} />
            <span>Format Kilat AI Academic Copilot &bull; Multi-Tier Engine</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-900 leading-tight">
            Bukan Sekadar List Error Merah. <br />
            <span className="gradient-text-aurora">Dampingi Skripsi, Tesis, Disertasi, &amp; BKD secara Proaktif.</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Ditenagai model multimodal cerdas dengan <strong>100% turnkey offline intelligence</strong> (dan live Gemini 1.5 saat API key aktif). Dapatkan prediksi pertanyaan dosen penguji, generator kode Overleaf/LaTeX instan, reparasi BibTeX/DOI otomatis, dan penjelasan ramah aturan margin 4-4-3-3 cm.
          </p>
        </div>

        {/* Live Interactive Copilot Widget */}
        <div className="max-w-4xl mx-auto">
          <AICopilotWidget initialTier={selectedTier} className="w-full shadow-2xl" />
        </div>
      </section>

      {/* =====================================================================
          3. HOW IT WORKS — 3-STEP PIPELINE INFOGRAPHIC
         ===================================================================== */}
      <section id="how-it-works" className="space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <Badge variant="default" className="text-xs bg-indigo-600 text-white hover:bg-indigo-700">
            Interactive Infographic
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            How Format Kilat Works
          </h2>
          <p className="text-slate-600 text-xs sm:text-sm">
            From raw draft manuscript to camera-ready verification in three streamlined stages.
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
                  Cloud Box / S3
                </Badge>
              </div>
              <h3 className="font-bold text-sm text-slate-900">1. Ingest &amp; Style Extraction</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Upload your draft manuscript PDF alongside the journal&apos;s styling template. The ingestion engine parses page bounding coordinates and column structures.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-50/70 to-white border border-purple-100 space-y-2 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center text-xs font-bold shadow-md shadow-purple-600/20">
                  02
                </span>
                <Badge variant="default" className="text-[10px] bg-purple-100 text-purple-700 font-bold border-purple-200 hover:bg-purple-200">
                  PyMuPDF &amp; NLP
                </Badge>
              </div>
              <h3 className="font-bold text-sm text-slate-900">2. Comparative Multi-Engine Sweep</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                PyMuPDF checks millimeter margin geometry. spaCy scans for author affiliation leaks. The citation engine maps text citations directly to bibliography entries.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50/70 to-white border border-emerald-100 space-y-2 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shadow-md shadow-emerald-600/20">
                  03
                </span>
                <Badge variant="success" className="text-[10px] bg-emerald-100 text-emerald-700 font-bold border-emerald-200">
                  Visual Proof PDF
                </Badge>
              </div>
              <h3 className="font-bold text-sm text-slate-900">3. Report &amp; Bounding Box Proof</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Receive an immediate compliance score (0–100) and download an annotated PDF with high-contrast red bounding boxes identifying exact fixes needed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          4. INTERACTIVE SIMULATOR: TRY THE FORMAT KILAT AUDITOR
         ===================================================================== */}
      <section className="space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <Badge variant="secondary" className="text-xs bg-indigo-50 text-indigo-700 font-bold border-indigo-200">
            Interactive Simulator
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Test the Compliance Calculation
          </h2>
          <p className="text-slate-600 text-xs sm:text-sm">
            Toggle common layout violations below to see how Format Kilat calculates your paper&apos;s camera-ready status in real-time:
          </p>
        </div>

        <div className="rounded-3xl border border-indigo-100 bg-white p-6 sm:p-8 shadow-xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Controls */}
          <div className="lg:col-span-7 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Simulate Layout Conditions:
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
                    <span>Double-Blind Violation: Author Email Detected</span>
                    <span className="text-[10px] text-rose-600 font-mono font-bold">(-15 pts)</span>
                  </div>
                  <p className="text-slate-500">
                    Author names and university emails leaked in the header, invalidating blind review.
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
                    <span>Column Violation: Single Column on IEEE Template</span>
                    <span className="text-[10px] text-amber-600 font-mono font-bold">(-12 pts)</span>
                  </div>
                  <p className="text-slate-500">
                    Manuscript text is single-column, but target IEEE template requires standard 2 columns.
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
                    <span>Citation Discrepancy: Uncited Bibliography Items</span>
                    <span className="text-[10px] text-indigo-600 font-mono font-bold">(-8 pts)</span>
                  </div>
                  <p className="text-slate-500">
                    Bibliography contains reference entries never cited in the body text.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Real-time Dynamic Gauge Output */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 rounded-2xl bg-gradient-to-b from-slate-50 to-indigo-50/30 border border-indigo-100 text-center space-y-4 shadow-inner">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Simulated Format Score
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
                  ? "✓ Camera Ready (Pass)"
                  : simStatus === "WARNING"
                  ? "⚠️ Advisory Warnings Detected"
                  : "✗ Revisions Required Before Review"}
              </Badge>
            </div>

            <p className="text-xs text-slate-600 max-w-xs leading-relaxed">
              {simScore === 100
                ? "Perfect paper geometry! All double-blind, column, and reference checks passed."
                : `Format Kilat detected ${
                    (simEmailLeak ? 1 : 0) + (simSingleColumn ? 1 : 0) + (simMissingRef ? 1 : 0)
                  } issue(s) that would trigger desk rejection.`}
            </p>

            <Button
              size="sm"
              onClick={openGoogleModal}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-full text-xs shadow-md shadow-indigo-600/20 px-5 h-9"
            >
              Audit Your Real Manuscript &rarr;
            </Button>
          </div>
        </div>
      </section>

      {/* =====================================================================
          5. COMPARISON INFOGRAPHIC: TRADITIONAL VS FORMAT KILAT
         ===================================================================== */}
      <section className="space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <Badge variant="default" className="text-xs bg-indigo-600 text-white hover:bg-indigo-700">
            Comparison Infographic
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Traditional Review vs. Format Kilat
          </h2>
          <p className="text-slate-600 text-xs sm:text-sm">
            Why leading research labs and universities adopt automated pre-screening:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* Traditional Card */}
          <div className="rounded-3xl border border-rose-200/80 bg-gradient-to-br from-rose-50/40 via-white to-rose-50/20 p-6 sm:p-8 space-y-4 shadow-lg shadow-rose-500/5">
            <div className="flex items-center justify-between border-b border-rose-100 pb-3">
              <span className="font-bold text-sm text-rose-600 flex items-center gap-1.5">
                <XCircle className="w-4 h-4 text-rose-600" />
                Traditional Journal Process
              </span>
              <Badge variant="destructive" className="text-[10px] bg-rose-100 text-rose-700 font-bold border-rose-200">
                Slow &amp; Manual
              </Badge>
            </div>

            <ul className="space-y-3 text-xs text-slate-600">
              <li className="flex items-start gap-2.5">
                <span className="text-rose-600 font-bold text-sm leading-none">&times;</span>
                <span><strong>3–6 Weeks Waiting Period</strong> for initial editorial triage and format approval.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-rose-600 font-bold text-sm leading-none">&times;</span>
                <span><strong>Instant Desk Rejection</strong> for minor margin, column, or font specification slips.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-rose-600 font-bold text-sm leading-none">&times;</span>
                <span><strong>Accidental Identity Leaks</strong> compromise double-blind peer review integrity.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-rose-600 font-bold text-sm leading-none">&times;</span>
                <span><strong>Vague Editorial Feedback</strong> without bounding coordinates or actionable PDF markers.</span>
              </li>
            </ul>
          </div>

          {/* Format Kilat Card */}
          <div className="rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50/60 via-purple-50/30 to-emerald-50/40 p-6 sm:p-8 space-y-4 shadow-xl shadow-indigo-500/10">
            <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
              <span className="font-bold text-sm text-indigo-700 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-indigo-600 animate-pulse" />
                Format Kilat Automated Pipeline
              </span>
              <Badge variant="default" className="text-[10px] bg-emerald-100 text-emerald-700 font-bold border-emerald-200 hover:bg-emerald-200">
                Instant Verification
              </Badge>
            </div>

            <ul className="space-y-3 text-xs text-slate-800 font-medium">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>~0.8 Second Turnaround</strong> with high-performance zero-copy deserialization.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Precise Millimeter Validation</strong> against IEEE, ACM, or custom uploaded templates.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>NLP Double-Blind Shield</strong> detects leaked author names, affiliations, and ORCID tags.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Red Bounding Box Proof</strong> downloaded directly with visual coordinate markers.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* =====================================================================
          6. SAMPLE AUDIT REPORT (macOS WINDOW CHROME CARD)
         ===================================================================== */}
      <section id="demo-preview" className="space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <Badge variant="default" className="text-xs bg-indigo-600 text-white hover:bg-indigo-700">
            Live Sample Audit
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Inside the Automated Report
          </h2>
          <p className="text-slate-600 text-xs sm:text-sm">
            Here is what the system outputs when evaluating an IEEE Transactions paper:
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
                Sample Report: IEEE Transactions Format Check
              </span>
            </div>
            <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1.5 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Audit Complete (~0.8s)
            </span>
          </div>

          {/* 3 Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-indigo-100 text-xs">
            {/* Column A: Template */}
            <div className="lg:col-span-3 p-5 sm:p-6 space-y-3 bg-slate-50/60">
              <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                Journal Guidelines
              </div>
              <p className="text-[11px] text-slate-500">
                Requirements extracted from IEEE reference template:
              </p>
              <div className="space-y-2">
                <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-xs">
                  <div className="text-slate-400 text-[10px] font-semibold">Columns</div>
                  <div className="font-bold text-slate-900">2 Columns (Double Column)</div>
                </div>
                <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-xs">
                  <div className="text-slate-400 text-[10px] font-semibold">Body Font</div>
                  <div className="font-bold text-slate-900">Times New Roman &bull; 10pt</div>
                </div>
                <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-xs">
                  <div className="text-slate-400 text-[10px] font-semibold">Margins</div>
                  <div className="font-bold text-slate-900">19mm Top &bull; 14.3mm Side</div>
                </div>
                <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-xs">
                  <div className="text-slate-400 text-[10px] font-semibold">Reference Style</div>
                  <div className="font-bold text-slate-900">Bracketed Numeric [1], [2]</div>
                </div>
              </div>
            </div>

            {/* Column B: Author Draft with Visual Overlays */}
            <div className="lg:col-span-5 p-5 sm:p-6 space-y-3 bg-white">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  Your Manuscript Draft
                </span>
                <span className="text-[11px] text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                  2 Issues Spotted
                </span>
              </div>

              {/* Sample Paper Canvas */}
              <div className="bg-slate-50 rounded-2xl p-4 h-64 overflow-hidden border border-slate-200 text-[10px] space-y-2.5 select-none shadow-inner">
                <div className="text-center font-bold text-xs text-slate-900">
                  High-Performance Data Storage for Distributed Systems
                </div>

                {/* Highlight 1: Email Leak */}
                <div className="p-2 border-2 border-dashed border-rose-500 bg-rose-50 rounded-xl text-center">
                  <div className="font-bold text-slate-900">
                    Dr. Alexander Wright &bull; wright@uts.edu.au
                  </div>
                  <div className="text-[9px] text-rose-600 font-bold">
                    Warning: Remove author email for double-blind review
                  </div>
                </div>

                <div className="italic text-slate-500 text-[9px] leading-tight">
                  <strong>Abstract</strong>—This research explores efficient file storage techniques for research databases...
                </div>

                {/* Highlight 2: Single Column Layout Issue */}
                <div className="p-2 border-2 border-dashed border-amber-500 bg-amber-50 rounded-xl text-[9px] text-slate-900">
                  <strong>1. Introduction</strong>: In modern distributed architectures, file storage boundaries can slow down data sharing...
                  <div className="mt-1 font-bold text-amber-600">
                    Warning: Draft is single-column, but template requires double-column.
                  </div>
                </div>
              </div>
            </div>

            {/* Column C: Scorecard */}
            <div className="lg:col-span-4 p-5 sm:p-6 space-y-3 bg-slate-50/60">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Compliance Score
                </span>
                <span className="font-black text-amber-600 text-sm">78 / 100</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-2 text-slate-800">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-rose-700">Author Info Detected</span>: Remove author names and email before submitting.
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-2 text-slate-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-700">Column Format</span>: Format paper into 2 columns.
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-2 text-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-emerald-700">Citations Valid</span>: All 24 references match bibliography entries.
                  </div>
                </div>
              </div>

              <Button
                size="sm"
                onClick={openGoogleModal}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold rounded-full mt-2 h-9 shadow-md shadow-indigo-600/20"
              >
                Sign in to check your manuscript &rarr;
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          7. 3D ISOMETRIC VIRTUAL OFFICE: PIPELINE MONITORING & OBSERVABILITY
         ===================================================================== */}
      <section id="virtual-office" className="space-y-6 scroll-mt-20">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <Badge variant="default" className="text-xs bg-slate-800 text-white font-bold border-slate-700 hover:bg-slate-700">
            Pipeline Observability &bull; Real-Time Telemetry Monitor
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            3D Autonomous Pipeline Telemetry &amp; System Monitor
          </h2>
          <p className="text-slate-600 text-xs sm:text-sm">
            Digital twin cutaway for operations monitoring and background telemetry — visualizes the active pipeline stations (Ingestion, Vision Pod, Auto-Fix, Deploy) without interfering with academic project submissions.
          </p>
        </div>

        {/* 3D Isometric Virtual Office Display */}
        <div className="rounded-3xl border border-indigo-100 bg-white shadow-2xl overflow-hidden">
          <div className="h-11 bg-slate-100/80 px-4 flex items-center justify-between border-b border-indigo-100 text-xs text-slate-500">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-rose-500 border border-rose-600 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-400 border border-amber-500 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500 border border-emerald-600 inline-block" />
              <span className="ml-3 font-semibold text-slate-800">
                Format Kilat 3D Pipeline Telemetry &amp; Background Station Monitor
              </span>
            </div>
            <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1.5 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Active System Telemetry
            </span>
          </div>

          <div className="relative bg-slate-100 border-b border-indigo-100">
            <Image
              src="/illustrations/isometric-virtual-office-3d.jpg"
              alt="Format Kilat 3D Isometric Virtual Office"
              width={1600}
              height={900}
              className="w-full h-auto object-cover"
              priority
            />
          </div>

          {/* 4 Station Breakdown Cards */}
          <div className="p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/70 to-white border border-indigo-100 space-y-1.5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-md shadow-indigo-600/20">
                  01
                </span>
                <span className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider">Ingestion</span>
              </div>
              <h4 className="text-xs font-bold text-slate-900">Conveyor &amp; Storage Vault</h4>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Direct streaming with Box Cloud synchronizer, presigned S3 tokens, and zero SerDe deserialization.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50/70 to-white border border-purple-100 space-y-1.5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-xl bg-purple-600 text-white flex items-center justify-center text-xs font-bold shadow-md shadow-purple-600/20">
                  02
                </span>
                <span className="text-[10px] text-purple-700 font-bold uppercase tracking-wider">Vision Pod</span>
              </div>
              <h4 className="text-xs font-bold text-slate-900">Gemini Multimodal Auditor</h4>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Holographic layout scanner verifying millimeter margins, IEEE column grids, and citation graphs.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/70 to-white border border-emerald-100 space-y-1.5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shadow-md shadow-emerald-600/20">
                  03
                </span>
                <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Auto-Fix</span>
              </div>
              <h4 className="text-xs font-bold text-slate-900">Remediation &amp; Layout Desk</h4>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                PyMuPDF engine stamping redactions on leaked emails and generating camera-ready fixed layout PDFs.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/70 to-white border border-amber-100 space-y-1.5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-xl bg-amber-600 text-white flex items-center justify-center text-xs font-bold shadow-md shadow-amber-600/20">
                  04
                </span>
                <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wider">Deploy</span>
              </div>
              <h4 className="text-xs font-bold text-slate-900">Telemetry &amp; Release Wall</h4>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Turnkey Docker Compose orchestration with live status indicators and instant author notification.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          8. BOTTOM CTA BANNER (VIBRANT AURORA GRADIENT)
         ===================================================================== */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-8 sm:p-14 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl">
        {/* Glow Spheres */}
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-white/15 blur-2xl rounded-full pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-yellow-300/15 blur-2xl rounded-full pointer-events-none" />

        <div className="space-y-2 text-center sm:text-left relative z-10">
          <Badge variant="secondary" className="text-[10px] bg-white/20 text-white border-white/30 font-bold">
            ⚡ Instant Camera-Ready Verification
          </Badge>
          <h2 className="text-xl sm:text-3xl font-black tracking-tight">
            Ready to format check your manuscript?
          </h2>
          <p className="text-xs sm:text-sm text-white/90 max-w-lg leading-relaxed">
            Masuk dengan Google SSO ke Format Kilat. Unggah naskah dan template jurnal untuk menerima audit kepatuhan &amp; asistensi AI Copilot dalam sekejap.
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
