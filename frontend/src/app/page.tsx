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
          1. HERO SECTION WITH VECTOR INFOGRAPHIC
         ===================================================================== */}
      <section className="relative overflow-hidden rounded-3xl bg-white p-6 sm:p-10 lg:p-14 border border-black/[0.06] shadow-apple-card text-[#1d1d1f]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Headline & Action Buttons */}
          <div className="lg:col-span-7 space-y-6">
            {/* Status Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/[0.04] text-[#1d1d1f] text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-[#34c759] shadow-xs animate-pulse" />
              <span>⚡ Format Kilat — AI Pre-Submission Compliance Engine</span>
            </div>

            {/* Headline */}
            <div className="space-y-3">
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.08] text-[#1d1d1f]">
                Zero Desk Rejections. <br />
                <span className="text-[#0071e3]">Format check in ~0.8s.</span>
              </h1>
              <p className="text-sm sm:text-base lg:text-lg text-[#86868b] leading-relaxed max-w-xl">
                Eliminate formatting desk rejections before you submit. Format Kilat compares your draft PDF against IEEE, ACM, or institutional journal style guides in seconds—highlighting margin mismatches, author identity leaks, and orphaned citations with visual red bounding boxes.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {user ? (
                <Button
                  size="lg"
                  onClick={() => router.push("/admin")}
                  className="bg-[#0071e3] hover:bg-[#0077ed] text-white font-medium rounded-full gap-2 shadow-xs text-xs sm:text-sm h-11 px-6 active:scale-[0.98] transition-all"
                >
                  <span>Open Submission Studio</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  size="lg"
                  onClick={openGoogleModal}
                  className="bg-[#0071e3] hover:bg-[#0077ed] text-white font-medium rounded-full gap-2.5 shadow-xs text-xs sm:text-sm h-11 px-6 active:scale-[0.98] transition-all"
                >
                  <GoogleLogo className="w-4 h-4" />
                  <span>Sign in with Google to Submit</span>
                </Button>
              )}

              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  const el = document.getElementById("how-it-works");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
                className="gap-2 text-xs sm:text-sm rounded-full border-black/[0.12] hover:bg-black/[0.04] text-[#1d1d1f] h-11 px-6 active:scale-[0.98] transition-all"
              >
                <span>Explore Infographic Pipeline</span>
                <ChevronRight className="w-4 h-4 text-[#86868b]" />
              </Button>
            </div>

            {/* Quick Metrics */}
            <div className="pt-6 border-t border-black/[0.06] grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-[#86868b]">
              <div>
                <div className="text-base font-bold text-[#1d1d1f]">~0.8 Second</div>
                <div>Laser Audit Latency</div>
              </div>
              <div>
                <div className="text-base font-bold text-[#1d1d1f]">Box Cloud</div>
                <div>Direct S3 Ingestion</div>
              </div>
              <div>
                <div className="text-base font-bold text-[#1d1d1f]">Double-Blind</div>
                <div>spaCy NER Sanitization</div>
              </div>
              <div>
                <div className="text-base font-bold text-[#1d1d1f]">IEEE &amp; ACM</div>
                <div>Built-in SOTA Templates</div>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Infographic Showcase */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-3xl border border-black/[0.06] bg-[#f5f5f7] p-2 shadow-apple-card overflow-hidden group">
              <div className="relative rounded-2xl overflow-hidden bg-white aspect-[4/3] flex items-center justify-center">
                <img
                  src="/illustrations/hero-infographic.jpg"
                  alt="Format Kilat AI Academic Paper Scanner Infographic"
                  className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                />

                {/* Floating Apple HIG Micro-Badges */}
                <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-black/[0.06] shadow-apple-card flex items-center gap-1.5 text-[11px] font-semibold text-[#1d1d1f]">
                  <span className="w-2 h-2 rounded-full bg-[#0071e3] animate-ping" />
                  <span>Real-Time Laser Beam</span>
                </div>

                <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-black/[0.06] shadow-apple-card flex items-center gap-1.5 text-[11px] font-semibold text-[#34c759]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Compliance: 98 / 100 PASS</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          2. HOW IT WORKS — 3-STEP PIPELINE INFOGRAPHIC
         ===================================================================== */}
      <section id="how-it-works" className="space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <Badge variant="default" className="text-xs">
            Interactive Infographic
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-[#1d1d1f]">
            How Format Kilat Works
          </h2>
          <p className="text-[#86868b] text-xs sm:text-sm">
            From raw draft manuscript to camera-ready verification in three streamlined stages.
          </p>
        </div>

        {/* Infographic Pipeline Visual Card */}
        <div className="rounded-3xl border border-black/[0.06] bg-white p-4 sm:p-6 shadow-apple-card overflow-hidden space-y-6">
          <div className="rounded-2xl overflow-hidden border border-black/[0.04] bg-[#f5f5f7]">
            <img
              src="/illustrations/how-it-works-pipeline.jpg"
              alt="Format Kilat 3-Stage Pipeline Infographic: Ingest, Analyze, Report"
              className="w-full h-auto object-cover max-h-[480px] mx-auto"
            />
          </div>

          {/* 3 Interactive Pipeline Explanation Nodes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            <div className="p-5 rounded-2xl bg-[#f5f5f7] border border-black/[0.04] space-y-2">
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-full bg-[#0071e3] text-white flex items-center justify-center text-xs font-bold shadow-xs">
                  01
                </span>
                <Badge variant="secondary" className="text-[10px]">
                  Cloud Box / S3
                </Badge>
              </div>
              <h3 className="font-bold text-sm text-[#1d1d1f]">1. Ingest &amp; Style Extraction</h3>
              <p className="text-xs text-[#86868b] leading-relaxed">
                Upload your draft manuscript PDF alongside the journal&apos;s styling template. The ingestion engine parses page bounding coordinates and column structures.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#f5f5f7] border border-black/[0.04] space-y-2">
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-full bg-[#0071e3] text-white flex items-center justify-center text-xs font-bold shadow-xs">
                  02
                </span>
                <Badge variant="default" className="text-[10px]">
                  PyMuPDF &amp; NLP
                </Badge>
              </div>
              <h3 className="font-bold text-sm text-[#1d1d1f]">2. Comparative Multi-Engine Sweep</h3>
              <p className="text-xs text-[#86868b] leading-relaxed">
                PyMuPDF checks millimeter margin geometry. spaCy scans for author affiliation leaks. The citation engine maps text citations directly to bibliography entries.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#f5f5f7] border border-black/[0.04] space-y-2">
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-full bg-[#34c759] text-white flex items-center justify-center text-xs font-bold shadow-xs">
                  03
                </span>
                <Badge variant="success" className="text-[10px]">
                  Visual Proof PDF
                </Badge>
              </div>
              <h3 className="font-bold text-sm text-[#1d1d1f]">3. Report &amp; Bounding Box Proof</h3>
              <p className="text-xs text-[#86868b] leading-relaxed">
                Receive an immediate compliance score (0–100) and download an annotated PDF with high-contrast red bounding boxes identifying exact fixes needed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          3. INTERACTIVE SIMULATOR: TRY THE FORMAT KILAT AUDITOR
         ===================================================================== */}
      <section className="space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <Badge variant="secondary" className="text-xs">
            Interactive Simulator
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1d1d1f]">
            Test the Compliance Calculation
          </h2>
          <p className="text-[#86868b] text-xs sm:text-sm">
            Toggle common layout violations below to see how Format Kilat calculates your paper&apos;s camera-ready status in real-time:
          </p>
        </div>

        <div className="rounded-3xl border border-black/[0.06] bg-white p-6 sm:p-8 shadow-apple-card grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Controls */}
          <div className="lg:col-span-7 space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#86868b]">
              Simulate Layout Conditions:
            </h3>

            <div className="space-y-3 text-xs">
              <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#f5f5f7] border border-black/[0.04] cursor-pointer hover:bg-black/[0.03] transition">
                <input
                  type="checkbox"
                  checked={simEmailLeak}
                  onChange={(e) => setSimEmailLeak(e.target.checked)}
                  className="mt-0.5 rounded text-[#0071e3] focus:ring-[#0071e3] w-4 h-4 cursor-pointer"
                />
                <div className="space-y-0.5">
                  <div className="font-semibold text-[#1d1d1f] flex items-center gap-1.5">
                    <span>Double-Blind Violation: Author Email Detected</span>
                    <span className="text-[10px] text-[#ff3b30] font-mono">(-15 pts)</span>
                  </div>
                  <p className="text-[#86868b]">
                    Author names and university emails leaked in the header, invalidating blind review.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#f5f5f7] border border-black/[0.04] cursor-pointer hover:bg-black/[0.03] transition">
                <input
                  type="checkbox"
                  checked={simSingleColumn}
                  onChange={(e) => setSimSingleColumn(e.target.checked)}
                  className="mt-0.5 rounded text-[#0071e3] focus:ring-[#0071e3] w-4 h-4 cursor-pointer"
                />
                <div className="space-y-0.5">
                  <div className="font-semibold text-[#1d1d1f] flex items-center gap-1.5">
                    <span>Column Violation: Single Column on IEEE Template</span>
                    <span className="text-[10px] text-[#ff9500] font-mono">(-12 pts)</span>
                  </div>
                  <p className="text-[#86868b]">
                    Manuscript text is single-column, but target IEEE template requires standard 2 columns.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#f5f5f7] border border-black/[0.04] cursor-pointer hover:bg-black/[0.03] transition">
                <input
                  type="checkbox"
                  checked={simMissingRef}
                  onChange={(e) => setSimMissingRef(e.target.checked)}
                  className="mt-0.5 rounded text-[#0071e3] focus:ring-[#0071e3] w-4 h-4 cursor-pointer"
                />
                <div className="space-y-0.5">
                  <div className="font-semibold text-[#1d1d1f] flex items-center gap-1.5">
                    <span>Citation Discrepancy: Uncited Bibliography Items</span>
                    <span className="text-[10px] text-[#86868b] font-mono">(-8 pts)</span>
                  </div>
                  <p className="text-[#86868b]">
                    Bibliography contains reference entries never cited in the body text.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Real-time Dynamic Gauge Output */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 rounded-2xl bg-[#f5f5f7] border border-black/[0.06] text-center space-y-4">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-[#86868b] uppercase tracking-wider">
                Simulated Format Score
              </span>
              <div
                className={`text-5xl font-extrabold tracking-tight transition-colors duration-300 ${
                  simScore >= 90
                    ? "text-[#34c759]"
                    : simScore >= 75
                    ? "text-[#ff9500]"
                    : "text-[#ff3b30]"
                }`}
              >
                {simScore} <span className="text-2xl text-[#86868b]">/ 100</span>
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
                className="text-xs px-3 py-1 font-semibold transition-all"
              >
                {simStatus === "PASS"
                  ? "✓ Camera Ready (Pass)"
                  : simStatus === "WARNING"
                  ? "⚠️ Advisory Warnings Detected"
                  : "✗ Revisions Required Before Review"}
              </Badge>
            </div>

            <p className="text-xs text-[#86868b] max-w-xs leading-relaxed">
              {simScore === 100
                ? "Perfect paper geometry! All double-blind, column, and reference checks passed."
                : `Format Kilat detected ${
                    (simEmailLeak ? 1 : 0) + (simSingleColumn ? 1 : 0) + (simMissingRef ? 1 : 0)
                  } issue(s) that would trigger desk rejection.`}
            </p>

            <Button
              size="sm"
              onClick={openGoogleModal}
              className="bg-[#0071e3] hover:bg-[#0077ed] text-white font-medium rounded-full text-xs shadow-xs px-5 h-9"
            >
              Audit Your Real Manuscript &rarr;
            </Button>
          </div>
        </div>
      </section>

      {/* =====================================================================
          4. COMPARISON INFOGRAPHIC: TRADITIONAL VS FORMAT KILAT
         ===================================================================== */}
      <section className="space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <Badge variant="default" className="text-xs">
            Comparison Infographic
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1d1d1f]">
            Traditional Review vs. Format Kilat
          </h2>
          <p className="text-[#86868b] text-xs sm:text-sm">
            Why leading research labs and universities adopt automated pre-screening:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* Traditional Card */}
          <div className="rounded-3xl border border-black/[0.06] bg-white p-6 sm:p-8 space-y-4 shadow-apple-card">
            <div className="flex items-center justify-between border-b border-black/[0.06] pb-3">
              <span className="font-bold text-sm text-[#ff3b30] flex items-center gap-1.5">
                <XCircle className="w-4 h-4 text-[#ff3b30]" />
                Traditional Journal Process
              </span>
              <Badge variant="destructive" className="text-[10px]">
                Slow &amp; Manual
              </Badge>
            </div>

            <ul className="space-y-3 text-xs text-[#86868b]">
              <li className="flex items-start gap-2.5">
                <span className="text-[#ff3b30] font-bold">&times;</span>
                <span><strong>3–6 Weeks Waiting Period</strong> for initial editorial triage and format approval.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-[#ff3b30] font-bold">&times;</span>
                <span><strong>Instant Desk Rejection</strong> for minor margin, column, or font specification slips.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-[#ff3b30] font-bold">&times;</span>
                <span><strong>Accidental Identity Leaks</strong> compromise double-blind peer review integrity.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-[#ff3b30] font-bold">&times;</span>
                <span><strong>Vague Editorial Feedback</strong> without bounding coordinates or actionable PDF markers.</span>
              </li>
            </ul>
          </div>

          {/* Format Kilat Card */}
          <div className="rounded-3xl border border-[#0071e3]/20 bg-[#0071e3]/5 p-6 sm:p-8 space-y-4 shadow-apple-card">
            <div className="flex items-center justify-between border-b border-[#0071e3]/20 pb-3">
              <span className="font-bold text-sm text-[#0071e3] flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-[#0071e3]" />
                Format Kilat Automated Pipeline
              </span>
              <Badge variant="default" className="text-[10px]">
                Instant Verification
              </Badge>
            </div>

            <ul className="space-y-3 text-xs text-[#1d1d1f]">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#34c759] shrink-0 mt-0.5" />
                <span><strong>~0.8 Second Turnaround</strong> with high-performance zero-copy deserialization.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#34c759] shrink-0 mt-0.5" />
                <span><strong>Precise Millimeter Validation</strong> against IEEE, ACM, or custom uploaded templates.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#34c759] shrink-0 mt-0.5" />
                <span><strong>NLP Double-Blind Shield</strong> detects leaked author names, affiliations, and ORCID tags.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#34c759] shrink-0 mt-0.5" />
                <span><strong>Red Bounding Box Proof</strong> downloaded directly with visual coordinate markers.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* =====================================================================
          5. SAMPLE AUDIT REPORT (macOS WINDOW CHROME CARD)
         ===================================================================== */}
      <section id="demo-preview" className="space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <Badge variant="default">Live Sample Audit</Badge>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1d1d1f]">
            Inside the Automated Report
          </h2>
          <p className="text-[#86868b] text-xs sm:text-sm">
            Here is what the system outputs when evaluating an IEEE Transactions paper:
          </p>
        </div>

        {/* 3-Column macOS Window */}
        <div className="rounded-3xl border border-black/[0.06] bg-white shadow-apple-card overflow-hidden text-[#1d1d1f]">
          {/* macOS Traffic Lights Header Bar */}
          <div className="h-11 bg-[#f5f5f7] px-4 flex items-center justify-between border-b border-black/[0.06] text-xs text-[#86868b]">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-[#ff5f57] border border-[#e0443e] inline-block" />
              <span className="w-3 h-3 rounded-full bg-[#febc2e] border border-[#d89e24] inline-block" />
              <span className="w-3 h-3 rounded-full bg-[#28c840] border border-[#1aab29] inline-block" />
              <span className="ml-3 font-medium text-[#1d1d1f] hidden sm:inline">
                Sample Report: IEEE Transactions Format Check
              </span>
            </div>
            <span className="text-[11px] font-medium text-[#34c759] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#34c759]" />
              Audit Complete (~0.8s)
            </span>
          </div>

          {/* 3 Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-black/[0.06] text-xs">
            {/* Column A: Template */}
            <div className="lg:col-span-3 p-5 sm:p-6 space-y-3 bg-[#f5f5f7]/50">
              <div className="font-semibold text-[#1d1d1f] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#0071e3]" />
                Journal Guidelines
              </div>
              <p className="text-[11px] text-[#86868b]">
                Requirements extracted from IEEE reference template:
              </p>
              <div className="space-y-2">
                <div className="p-3 rounded-2xl bg-white border border-black/[0.06]">
                  <div className="text-[#86868b] text-[10px]">Columns</div>
                  <div className="font-semibold text-[#1d1d1f]">2 Columns (Double Column)</div>
                </div>
                <div className="p-3 rounded-2xl bg-white border border-black/[0.06]">
                  <div className="text-[#86868b] text-[10px]">Body Font</div>
                  <div className="font-semibold text-[#1d1d1f]">Times New Roman &bull; 10pt</div>
                </div>
                <div className="p-3 rounded-2xl bg-white border border-black/[0.06]">
                  <div className="text-[#86868b] text-[10px]">Margins</div>
                  <div className="font-semibold text-[#1d1d1f]">19mm Top &bull; 14.3mm Side</div>
                </div>
                <div className="p-3 rounded-2xl bg-white border border-black/[0.06]">
                  <div className="text-[#86868b] text-[10px]">Reference Style</div>
                  <div className="font-semibold text-[#1d1d1f]">Bracketed Numeric [1], [2]</div>
                </div>
              </div>
            </div>

            {/* Column B: Author Draft with Visual Overlays */}
            <div className="lg:col-span-5 p-5 sm:p-6 space-y-3 bg-white">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#1d1d1f] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#0071e3]" />
                  Your Manuscript Draft
                </span>
                <span className="text-[11px] text-[#ff3b30] font-semibold">
                  2 Issues Spotted
                </span>
              </div>

              {/* Sample Paper Canvas */}
              <div className="bg-[#f5f5f7] rounded-2xl p-4 h-64 overflow-hidden border border-black/[0.06] text-[10px] space-y-2.5 select-none shadow-xs">
                <div className="text-center font-bold text-xs text-[#1d1d1f]">
                  High-Performance Data Storage for Distributed Systems
                </div>

                {/* Highlight 1: Email Leak */}
                <div className="p-2 border-2 border-dashed border-[#ff3b30] bg-[#ff3b30]/10 rounded-xl text-center">
                  <div className="font-semibold text-[#1d1d1f]">
                    Dr. Alexander Wright &bull; wright@uts.edu.au
                  </div>
                  <div className="text-[9px] text-[#ff3b30] font-medium">
                    Warning: Remove author email for double-blind review
                  </div>
                </div>

                <div className="italic text-[#86868b] text-[9px] leading-tight">
                  <strong>Abstract</strong>—This research explores efficient file storage techniques for research databases...
                </div>

                {/* Highlight 2: Single Column Layout Issue */}
                <div className="p-2 border-2 border-dashed border-[#ff9500] bg-[#ff9500]/10 rounded-xl text-[9px] text-[#1d1d1f]">
                  <strong>1. Introduction</strong>: In modern distributed architectures, file storage boundaries can slow down data sharing...
                  <div className="mt-1 font-medium text-[#ff9500]">
                    Warning: Draft is single-column, but template requires double-column.
                  </div>
                </div>
              </div>
            </div>

            {/* Column C: Scorecard */}
            <div className="lg:col-span-4 p-5 sm:p-6 space-y-3 bg-[#f5f5f7]/50">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#1d1d1f] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#ff9500]" />
                  Compliance Score
                </span>
                <span className="font-bold text-[#ff9500] text-sm">78 / 100</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-2xl bg-[#ff3b30]/10 border border-[#ff3b30]/20 flex items-start gap-2 text-[#1d1d1f]">
                  <AlertTriangle className="w-4 h-4 text-[#ff3b30] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-[#ff3b30]">Author Info Detected</span>: Remove author names and email before submitting.
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-[#ff9500]/10 border border-[#ff9500]/20 flex items-start gap-2 text-[#1d1d1f]">
                  <AlertTriangle className="w-4 h-4 text-[#ff9500] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-[#ff9500]">Column Format</span>: Format paper into 2 columns.
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-[#34c759]/10 border border-[#34c759]/20 flex items-start gap-2 text-[#1d1d1f]">
                  <CheckCircle2 className="w-4 h-4 text-[#34c759] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-[#34c759]">Citations Valid</span>: All 24 references match bibliography entries.
                  </div>
                </div>
              </div>

              <Button
                size="sm"
                onClick={openGoogleModal}
                className="w-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-medium rounded-full mt-2 h-9 shadow-xs"
              >
                Sign in to check your manuscript &rarr;
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          6. 3D ISOMETRIC VIRTUAL OFFICE: THE AUTONOMOUS AI LAB
         ===================================================================== */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <Badge variant="default" className="text-xs">
            3D Digital Twin Architecture
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1d1d1f]">
            Inside the Format Kilat Autonomous AI Lab
          </h2>
          <p className="text-[#86868b] text-xs sm:text-sm">
            Experience our 4-station virtual organism that automates manuscript ingestion, Gemini vision audit, camera-ready remediation, and cloud deployment:
          </p>
        </div>

        {/* 3D Isometric Virtual Office Display */}
        <div className="rounded-3xl border border-black/[0.06] bg-white shadow-apple-card overflow-hidden">
          <div className="h-11 bg-[#f5f5f7] px-4 flex items-center justify-between border-b border-black/[0.06] text-xs text-[#86868b]">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-[#ff5f57] border border-[#e0443e] inline-block" />
              <span className="w-3 h-3 rounded-full bg-[#febc2e] border border-[#d89e24] inline-block" />
              <span className="w-3 h-3 rounded-full bg-[#28c840] border border-[#1aab29] inline-block" />
              <span className="ml-3 font-medium text-[#1d1d1f]">
                Format Kilat 3D Autonomous AI Virtual Office Cutaway
              </span>
            </div>
            <span className="text-[11px] font-medium text-[#0071e3] flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#34c759] animate-pulse" />
              Live Autonomous Pipeline Active
            </span>
          </div>

          <div className="relative bg-[#f5f5f7] border-b border-black/[0.06]">
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
            <div className="p-4 rounded-2xl bg-[#f5f5f7] border border-black/[0.04] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-xl bg-[#0071e3] text-white flex items-center justify-center text-xs font-bold shadow-xs">
                  01
                </span>
                <span className="text-[10px] text-[#0071e3] font-bold uppercase">Ingestion</span>
              </div>
              <h4 className="text-xs font-bold text-[#1d1d1f]">Conveyor &amp; Storage Vault</h4>
              <p className="text-[11px] text-[#86868b] leading-relaxed">
                Direct streaming with Box Cloud synchronizer, presigned S3 tokens, and zero SerDe deserialization.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#f5f5f7] border border-black/[0.04] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-xl bg-[#af52de] text-white flex items-center justify-center text-xs font-bold shadow-xs">
                  02
                </span>
                <span className="text-[10px] text-[#af52de] font-bold uppercase">Vision Pod</span>
              </div>
              <h4 className="text-xs font-bold text-[#1d1d1f]">Gemini Multimodal Auditor</h4>
              <p className="text-[11px] text-[#86868b] leading-relaxed">
                Holographic layout scanner verifying millimeter margins, IEEE column grids, and citation graphs.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#f5f5f7] border border-black/[0.04] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-xl bg-[#34c759] text-white flex items-center justify-center text-xs font-bold shadow-xs">
                  03
                </span>
                <span className="text-[10px] text-[#34c759] font-bold uppercase">Auto-Fix</span>
              </div>
              <h4 className="text-xs font-bold text-[#1d1d1f]">Remediation &amp; Layout Desk</h4>
              <p className="text-[11px] text-[#86868b] leading-relaxed">
                PyMuPDF engine stamping redactions on leaked emails and generating camera-ready fixed layout PDFs.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#f5f5f7] border border-black/[0.04] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-xl bg-[#ff9500] text-white flex items-center justify-center text-xs font-bold shadow-xs">
                  04
                </span>
                <span className="text-[10px] text-[#ff9500] font-bold uppercase">Deploy</span>
              </div>
              <h4 className="text-xs font-bold text-[#1d1d1f]">Telemetry &amp; Release Wall</h4>
              <p className="text-[11px] text-[#86868b] leading-relaxed">
                Turnkey Docker Compose orchestration with live status indicators and instant author notification.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          6. BOTTOM CTA BANNER
         ===================================================================== */}
      <section className="rounded-3xl bg-[#0071e3] p-8 sm:p-14 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-apple-card">
        <div className="space-y-2 text-center sm:text-left">
          <Badge variant="secondary" className="text-[10px] bg-white/20 text-white border-white/30">
            Instant Camera-Ready Verification
          </Badge>
          <h2 className="text-xl sm:text-3xl font-bold">
            Ready to format check your manuscript?
          </h2>
          <p className="text-xs sm:text-sm text-white/85 max-w-lg">
            Sign in with Google to enter Format Kilat. Upload your paper and template to receive your automated compliance audit in seconds.
          </p>
        </div>
        <Button
          size="lg"
          onClick={openGoogleModal}
          className="bg-white hover:bg-white/95 text-[#0071e3] font-semibold text-xs sm:text-sm px-7 rounded-full shrink-0 shadow-md gap-2.5 h-12 active:scale-[0.98] transition-all"
        >
          <GoogleLogo className="w-4 h-4" />
          <span>Get Started with Google</span>
        </Button>
      </section>
    </div>
  );
}
