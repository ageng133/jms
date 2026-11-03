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

      if (role === "ADMIN" || role === "EDITOR") {
        router.push("/admin");
      } else {
        router.push("/submissions/new");
      }
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
    <div className="space-y-16 pb-12">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white p-8 sm:p-14 border border-slate-800 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-300 text-xs font-semibold backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
            <span>AI Pre-Submission Engine &bull; Dual-File Journal Comparison</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.15]">
            Automated Scholarly Manuscript Auditing & Editorial Control Plane
          </h1>

          <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-2xl">
            Eliminate desk-review drag. Authors upload both the <strong>Journal Reference Template</strong> and their <strong>Manuscript Draft</strong>. The engine compares geometry against template guidelines, enforces double-blind anonymization via spaCy NER, and renders visual red-box PDF proofs in under 15 seconds.
          </p>

          {/* User Sign-In Banner / Action Buttons */}
          <div className="pt-4 flex flex-wrap items-center gap-4">
            {currentUser ? (
              <div className="flex flex-wrap items-center gap-3 bg-white/10 border border-white/15 px-4 py-2.5 rounded-2xl backdrop-blur-md">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-black text-white shadow-sm">
                  {currentUser.full_name?.charAt(0) || "U"}
                </div>
                <div className="text-xs">
                  <p className="font-bold text-white flex items-center gap-1.5">
                    {currentUser.full_name}
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-500/30 text-blue-200 uppercase font-black">
                      {currentUser.role}
                    </span>
                  </p>
                  <p className="text-slate-400">{currentUser.email}</p>
                </div>

                <div className="flex items-center gap-2 pl-2">
                  {currentUser.role === "ADMIN" || currentUser.role === "EDITOR" ? (
                    <Link
                      href="/admin"
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition shadow"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      Open Admin Panel
                    </Link>
                  ) : (
                    <Link
                      href="/submissions/new"
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition shadow"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Submit Manuscript
                    </Link>
                  )}
                  <button
                    onClick={handleSignOut}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition"
                    title="Sign Out"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setGoogleModalOpen(true)}
                  className="inline-flex items-center gap-3 px-5 py-3 rounded-xl bg-white hover:bg-slate-100 font-bold text-slate-900 shadow-xl transition transform active:scale-95 text-sm"
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
                  <span>Sign in with Google</span>
                </button>

                <Link
                  href="/submissions/new"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-white shadow-lg transition text-sm"
                >
                  <span>Start New Submission</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  href="/admin"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 font-semibold text-slate-200 border border-slate-700 transition text-sm"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span>Admin / Editor Portal</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Google Sign-in Selector Modal */}
      {googleModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-200 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto shadow-sm">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
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
              <h2 className="text-xl font-bold text-slate-900">Sign in with Google</h2>
              <p className="text-xs text-slate-500">
                Select your intended persona to authenticate via Google OAuth simulation:
              </p>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                disabled={authLoading}
                onClick={() => handleGoogleSignIn("AUTHOR")}
                className="w-full p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 flex items-center justify-between text-left transition group"
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-slate-900 group-hover:text-blue-700">
                    Sign in as Author
                  </p>
                  <p className="text-xs text-slate-500">author.google@uts.edu.au (Submit & track papers)</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition" />
              </button>

              <button
                type="button"
                disabled={authLoading}
                onClick={() => handleGoogleSignIn("ADMIN")}
                className="w-full p-4 rounded-xl border border-indigo-200 bg-indigo-50/30 hover:border-indigo-500 hover:bg-indigo-50 flex items-center justify-between text-left transition group"
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-indigo-950 group-hover:text-indigo-700 flex items-center gap-1.5">
                    Sign in as Managing Editor / Admin
                    <span className="text-[10px] bg-indigo-200 text-indigo-900 px-1.5 py-0.2 rounded font-bold">
                      Admin Access
                    </span>
                  </p>
                  <p className="text-xs text-slate-500">editor.google@uts.edu.au (Access full editorial dashboard)</p>
                </div>
                <ArrowRight className="w-4 h-4 text-indigo-400 group-hover:text-indigo-600 transition" />
              </button>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setGoogleModalOpen(false)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SOTA Pillars Grid */}
      <div className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Comprehensive Multi-Stage Pre-Submission Inspection
          </h2>
          <p className="text-sm text-slate-500">
            Engineered with high-velocity async verification to eliminate administrative review fatigue.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3 hover:border-blue-400 transition">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">1. Dynamic Template Alignment</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Extracts target page dimensions (A4/Letter), margins, and column layouts from the uploaded journal template, auditing draft compliance dynamically.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3 hover:border-amber-400 transition">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">2. Double-Blind Anonymization</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              spaCy NER sweeps for leaked author names and affiliations, while regex filters eliminate email addresses, ORCID IDs, and PDF metadata strings.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3 hover:border-emerald-400 transition">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">3. Citation Graph Crosscheck</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Bidirectional mapping between in-text citations and bibliography entries. Automatically identifies uncited references and missing citations.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3 hover:border-indigo-400 transition">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Download className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">4. Visual PDF Annotation</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              PyMuPDF draws red bounding boxes and sticky notes directly over violating coordinates, generating a proof PDF downloadable from S3.
            </p>
          </div>
        </div>
      </div>

      {/* SOTA Benchmarks & Metrics Strip */}
      <div className="bg-slate-900 text-white rounded-2xl p-8 border border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
        <div className="space-y-1">
          <p className="text-3xl font-black text-blue-400">&lt; 15s</p>
          <p className="text-xs font-semibold text-slate-300">Total Turnaround</p>
          <p className="text-[11px] text-slate-500">Multi-module async processing</p>
        </div>
        <div className="space-y-1">
          <p className="text-3xl font-black text-emerald-400">Zero</p>
          <p className="text-xs font-semibold text-slate-300">Gateway Buffering</p>
          <p className="text-[11px] text-slate-500">Direct browser-to-S3 stream</p>
        </div>
        <div className="space-y-1">
          <p className="text-3xl font-black text-amber-400">100%</p>
          <p className="text-xs font-semibold text-slate-300">Double-Blind Shield</p>
          <p className="text-[11px] text-slate-500">NER person, org & email filter</p>
        </div>
        <div className="space-y-1">
          <p className="text-3xl font-black text-indigo-400">0–100</p>
          <p className="text-xs font-semibold text-slate-300">Deterministic Score</p>
          <p className="text-[11px] text-slate-500">Instant desk-review triage</p>
        </div>
      </div>
    </div>
  );
}
