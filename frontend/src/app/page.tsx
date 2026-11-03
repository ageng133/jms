"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  ShieldAlert,
  Sparkles,
  Layers,
  ShieldCheck,
  Cpu,
  Download,
  AlertTriangle,
  UserCheck,
  Settings,
  LogIn,
  LogOut,
  ExternalLink,
  ChevronRight,
  Zap,
  Lock,
  BarChart3,
  Check,
  Plus,
} from "lucide-react";
import { getCurrentUser, loginWithGoogle, logout } from "@/lib/api";

export default function HomePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [googleModalOpen, setGoogleModalOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    setCurrentUser(getCurrentUser());
  }, []);

  async function handleGoogleSignIn(role: "AUTHOR" | "ADMIN" | "EDITOR") {
    setAuthLoading(true);
    try {
      const email =
        role === "ADMIN" || role === "EDITOR"
          ? "editor.google@uts.edu.au"
          : "author.google@uts.edu.au";
      const fullName =
        role === "ADMIN" || role === "EDITOR"
          ? "Prof. Dr. Sarah Connor"
          : "Dr. Alexander Wright";

      const res = await loginWithGoogle({
        email,
        full_name: fullName,
        role: role === "ADMIN" ? "ADMIN" : role === "EDITOR" ? "EDITOR" : "AUTHOR",
        affiliation: "UTS Institute of Technology & Advanced Systems",
      });

      setCurrentUser(res.user);
      setGoogleModalOpen(false);

      // Direct to admin panel as requested for managing and submitting journal & template
      router.push("/admin");
    } catch (err: any) {
      alert("Google sign-in error: " + err.message);
    } finally {
      setAuthLoading(false);
    }
  }

  function handleSignOut() {
    logout();
    setCurrentUser(null);
  }

  return (
    <div className="space-y-20 pb-16">
      {/* Hero Section - Apple & High-Velocity AI Startup Aesthetic */}
      <section className="relative overflow-hidden rounded-3xl bg-[#090d16] text-white p-8 sm:p-16 lg:p-20 border border-slate-800/80 shadow-[0_30px_90px_-20px_rgba(0,0,0,0.6)]">
        {/* Subtle Ambient Radial Lighting */}
        <div className="absolute -top-32 -right-32 w-[550px] h-[550px] bg-gradient-to-br from-blue-600/25 via-indigo-600/15 to-transparent rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-[550px] h-[550px] bg-gradient-to-tr from-indigo-500/20 via-purple-600/15 to-transparent rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-40" />

        <div className="relative max-w-4xl space-y-8">
          {/* Apple Pill Badge */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.12] text-slate-300 text-xs font-medium backdrop-blur-md shadow-inner">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-white">JMS Singularity 2.0</span>
            <span className="text-slate-500">&bull;</span>
            <span className="text-slate-300">Automated Dual-File Pre-Submission Engine</span>
          </div>

          {/* Scaled Hero Typography */}
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08] text-white">
              The intelligent control plane for{" "}
              <span className="bg-gradient-to-r from-blue-400 via-indigo-200 to-white bg-clip-text text-transparent">
                scholarly publishing.
              </span>
            </h1>

            <p className="text-slate-300 text-base sm:text-lg lg:text-xl font-normal leading-relaxed max-w-2xl">
              Eliminate desk-review friction. Authors upload their <strong>Journal Reference Template</strong> alongside their <strong>Manuscript Draft</strong>. The engine extracts geometry rules, enforces double-blind anonymity via spaCy NER, and delivers visual red-box PDF proofs in under 15 seconds.
            </p>
          </div>

          {/* User Sign-In Banner / Action Bar */}
          <div className="pt-2 flex flex-wrap items-center gap-4">
            {currentUser ? (
              <div className="flex flex-wrap items-center gap-4 bg-white/[0.07] border border-white/[0.12] p-2.5 sm:px-5 sm:py-3 rounded-2xl backdrop-blur-xl shadow-lg">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-sm font-bold text-white shadow-md">
                  {currentUser.full_name?.charAt(0) || "U"}
                </div>
                <div className="text-xs">
                  <p className="font-bold text-white flex items-center gap-2">
                    {currentUser.full_name}
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-500/20 text-blue-300 border border-blue-400/30 uppercase font-bold">
                      {currentUser.role}
                    </span>
                  </p>
                  <p className="text-slate-400 font-mono text-[11px]">{currentUser.email}</p>
                </div>

                <div className="flex items-center gap-2.5 pl-2">
                  <Link
                    href="/admin"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition shadow-md shadow-blue-600/30 active:scale-95"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Open Admin Panel</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  <Link
                    href="/submissions/new"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-slate-200 border border-white/10 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Submission</span>
                  </Link>

                  <button
                    onClick={handleSignOut}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                {/* Primary Google Auth CTA */}
                <button
                  type="button"
                  onClick={() => setGoogleModalOpen(true)}
                  className="inline-flex items-center gap-3 px-6 py-3.5 rounded-full bg-white hover:bg-slate-100 font-semibold text-slate-900 shadow-[0_8px_30px_rgb(255,255,255,0.18)] transition-all transform hover:scale-[1.02] active:scale-95 text-sm"
                >
                  {/* Google G Logo SVG */}
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>

                {/* Secondary Direct Action */}
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-2 px-5 py-3.5 rounded-full bg-white/[0.08] hover:bg-white/[0.14] text-white font-medium text-sm border border-white/10 backdrop-blur-md transition"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span>Go to Admin Panel</span>
                </Link>

                <Link
                  href="/submissions/new"
                  className="inline-flex items-center gap-2 px-5 py-3.5 rounded-full text-slate-300 hover:text-white font-medium text-sm transition"
                >
                  <span>Submit Manuscript</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Apple-style Interactive Product Showcase Window */}
        <div className="mt-14 pt-8 border-t border-white/10">
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-2xl shadow-2xl p-5 sm:p-7 space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/80" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="text-xs font-mono text-slate-400 ml-2">
                  jms-precheck &bull; dual-stream live verification
                </span>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                AI Engine Active
              </span>
            </div>

            {/* 3-Column Visual Audit Preview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* Card 1: Template Spec Extraction */}
              <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-indigo-300 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" /> Template Extraction
                  </span>
                  <span className="text-[10px] bg-indigo-500/30 text-indigo-200 px-1.5 py-0.5 rounded font-mono">
                    A4 &bull; 2-Column
                  </span>
                </div>
                <div className="space-y-1 font-mono text-[11px] text-slate-300">
                  <p>Margins: 20.1mm Top / 20.1mm Bottom</p>
                  <p>Column Gutter: 25.0mm Pitch</p>
                  <p className="text-emerald-400">Status: Template Specs Parsed</p>
                </div>
              </div>

              {/* Card 2: Red Box Visual Proof */}
              <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-rose-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> Geometry & Anonymization
                  </span>
                  <span className="text-[10px] bg-rose-500/30 text-rose-200 px-1.5 py-0.5 rounded font-mono">
                    Red BBox Alert
                  </span>
                </div>
                <div className="space-y-1 font-mono text-[11px] text-slate-300">
                  <p className="text-rose-400">Violation: Top Margin (5.3mm vs 20.1mm)</p>
                  <p className="text-amber-300">NER Leak: Author email redacted</p>
                  <p className="text-slate-400">BBox: [51, 15, 239, 46]</p>
                </div>
              </div>

              {/* Card 3: Deterministic Score */}
              <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Pre-Check Scorecard
                  </span>
                  <span className="text-[10px] bg-emerald-500/30 text-emerald-200 px-1.5 py-0.5 rounded font-mono font-bold">
                    Score: 94/100
                  </span>
                </div>
                <div className="space-y-1 font-mono text-[11px] text-slate-300">
                  <p className="text-emerald-400">Decision: Ready for Desk Review</p>
                  <p>Citation Graph: 18/18 Verified</p>
                  <p className="text-slate-400">Turnaround: 1.1s Total Latency</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Google Sign-in Selector Modal (Apple Style Sheet) */}
      {googleModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto shadow-sm">
                <svg className="w-7 h-7" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Sign in with Google</h2>
              <p className="text-xs text-slate-500">
                Authenticate with Google to enter the Admin Panel & submit your journal and template:
              </p>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                disabled={authLoading}
                onClick={() => handleGoogleSignIn("ADMIN")}
                className="w-full p-4 rounded-2xl border-2 border-indigo-200 bg-indigo-50/40 hover:border-indigo-500 hover:bg-indigo-50 flex items-center justify-between text-left transition group"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-indigo-950 group-hover:text-indigo-700">
                      Managing Editor & Admin
                    </p>
                    <span className="text-[10px] bg-indigo-200 text-indigo-900 px-2 py-0.5 rounded-full font-bold">
                      Full Admin Access
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">editor.google@uts.edu.au &bull; Triage, review & submit</p>
                </div>
                <ArrowRight className="w-4 h-4 text-indigo-400 group-hover:text-indigo-600 transition" />
              </button>

              <button
                type="button"
                disabled={authLoading}
                onClick={() => handleGoogleSignIn("AUTHOR")}
                className="w-full p-4 rounded-2xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 flex items-center justify-between text-left transition group"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-slate-900 group-hover:text-blue-700">
                      Author & Contributor
                    </p>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
                      Author Portal
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">author.google@uts.edu.au &bull; Upload draft & templates</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition" />
              </button>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100 text-xs">
              <span className="text-slate-400">Institutional SSO simulation</span>
              <button
                type="button"
                onClick={() => setGoogleModalOpen(false)}
                className="font-semibold text-slate-500 hover:text-slate-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bento Grid: 4 Core Pillars of the Engine (Apple HIG Minimalism) */}
      <section className="space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-blue-600">
            Precision Architecture
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Designed for uncompromising academic rigor.
          </h2>
          <p className="text-sm sm:text-base text-slate-500 leading-relaxed">
            Every manuscript undergoes asynchronous multi-module audits against formal journal publishing standards.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Bento Item 1 */}
          <div className="bg-white p-7 rounded-3xl border border-slate-200/80 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-xl hover:border-indigo-400/80 transition-all duration-300 flex flex-col justify-between space-y-5 group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">1. Dynamic Template Alignment</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Extracts page bounds (A4/Letter), margins, and multi-column grid pitch dynamically from reference PDFs, auditing draft margins with sub-millimeter precision.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600">
              <span>Dynamic Geometry Extractor</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Bento Item 2 */}
          <div className="bg-white p-7 rounded-3xl border border-slate-200/80 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-xl hover:border-amber-400/80 transition-all duration-300 flex flex-col justify-between space-y-5 group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">2. Double-Blind Privacy Shield</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                spaCy Named Entity Recognition sweeps the title block for leaked author names and institutions, while deterministic regex filters purge email addresses, ORCIDs, and PDF metadata.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-semibold text-amber-600">
              <span>spaCy NER & Metadata Scrubber</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Bento Item 3 */}
          <div className="bg-white p-7 rounded-3xl border border-slate-200/80 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-xl hover:border-emerald-400/80 transition-all duration-300 flex flex-col justify-between space-y-5 group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">3. Citation Graph Crosscheck</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Bidirectional mapping parses inline citation ranges (including en-dash notations like [1–3]) and verifies them against references/daftar pustaka sections.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600">
              <span>Bidirectional Verification</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Bento Item 4 */}
          <div className="bg-white p-7 rounded-3xl border border-slate-200/80 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-xl hover:border-blue-400/80 transition-all duration-300 flex flex-col justify-between space-y-5 group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Download className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">4. Visual PDF Annotation</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                PyMuPDF draws high-contrast red bounding boxes and sticky notes over every violation coordinate, compiling an annotated proof PDF previewable directly in the browser.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-semibold text-blue-600">
              <span>In-Browser Interactive Viewer</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </section>

      {/* Systems Engineering Benchmarks Strip (Apple High-Performance Hardware/Software Style) */}
      <section className="rounded-3xl bg-[#090d16] text-white p-8 sm:p-12 border border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-8 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />
        <div className="relative space-y-1">
          <p className="text-3xl sm:text-4xl font-black text-blue-400 tracking-tight">&lt; 15s</p>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-300">Total Audit Latency</p>
          <p className="text-[11px] text-slate-400">Zero-copy PyMuPDF async pipeline</p>
        </div>
        <div className="relative space-y-1">
          <p className="text-3xl sm:text-4xl font-black text-emerald-400 tracking-tight">Zero</p>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-300">Gateway Buffering</p>
          <p className="text-[11px] text-slate-400">Direct browser-to-S3 binary streams</p>
        </div>
        <div className="relative space-y-1">
          <p className="text-3xl sm:text-4xl font-black text-amber-400 tracking-tight">100%</p>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-300">Double-Blind Redaction</p>
          <p className="text-[11px] text-slate-400">spaCy NER, ORCID & email scrub</p>
        </div>
        <div className="relative space-y-1">
          <p className="text-3xl sm:text-4xl font-black text-indigo-400 tracking-tight">0–100</p>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-300">Deterministic Score</p>
          <p className="text-[11px] text-slate-400">Automated desk-review triage</p>
        </div>
      </section>

      {/* Bottom Sticky CTA Strip */}
      <section className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-8 sm:p-12 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-1 max-w-xl text-center sm:text-left">
          <h3 className="text-2xl font-black tracking-tight">Ready to audit your manuscript?</h3>
          <p className="text-sm text-blue-100">
            Sign in with Google to access the editorial Admin Panel or submit your draft and template side-by-side.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setGoogleModalOpen(true)}
            className="px-6 py-3 rounded-full bg-white text-slate-900 font-bold text-xs hover:bg-slate-100 shadow-lg transition active:scale-95 flex items-center gap-2"
          >
            <span>Sign in with Google</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <Link
            href="/admin"
            className="px-5 py-3 rounded-full bg-blue-700/60 hover:bg-blue-700 text-white font-semibold text-xs border border-white/20 transition"
          >
            Open Admin Panel
          </Link>
        </div>
      </section>
    </div>
  );
}

