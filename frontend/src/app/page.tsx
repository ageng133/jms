"use client";

import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Sparkles,
  Layers,
  ShieldCheck,
  AlertTriangle,
  LogIn,
  ChevronRight,
  Box,
  Compass,
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
} from "@/components/ui/card";

export default function HomePage() {
  const router = useRouter();
  const { user, openGoogleModal } = useAuth();

  return (
    <div className="space-y-20 pb-16">
      {/* 1. HERO SECTION (PURE LIGHT MODE) */}
      <section className="relative overflow-hidden rounded-2xl bg-white p-8 sm:p-14 border border-slate-200 shadow-sm text-slate-900">
        <div className="max-w-3xl space-y-6">
          {/* Status pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Academic Paper Pre-Submission Review System</span>
          </div>

          {/* Headline */}
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight text-slate-900">
              Check your journal paper format{" "}
              <span className="text-indigo-600">before you submit.</span>
            </h1>
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
              Eliminate desk rejections caused by small layout errors. Upload your draft PDF alongside the journal template to automatically verify margins, columns, double-blind anonymization, and references.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {user ? (
              <Button
                size="lg"
                onClick={() => router.push("/admin")}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold gap-2 shadow-sm text-sm"
              >
                <span>Open Submission Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                size="lg"
                onClick={openGoogleModal}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold gap-2.5 shadow-sm text-sm"
              >
                <GoogleLogo className="w-4 h-4" />
                <span>Sign in with Google to Submit</span>
              </Button>
            )}

            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                const el = document.getElementById("demo-preview");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className="gap-2 text-sm"
            >
              <span>See Sample Review</span>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </Button>
          </div>

          {/* Highlights */}
          <div className="pt-6 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-slate-600 text-xs">
            <div>
              <div className="text-base font-bold text-slate-900">~1 Second</div>
              <div>Fast Format Check</div>
            </div>
            <div>
              <div className="text-base font-bold text-slate-900">Box Cloud</div>
              <div>Secure Cloud Storage</div>
            </div>
            <div>
              <div className="text-base font-bold text-slate-900">Google Gemini</div>
              <div>Visual Layout AI</div>
            </div>
            <div>
              <div className="text-base font-bold text-slate-900">Double-Blind</div>
              <div>Author Info Leak Check</div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. DEMO PREVIEW (CLEAN LIGHT CARD) */}
      <section id="demo-preview" className="space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-1.5">
          <Badge variant="default">Sample Audit Report</Badge>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            How the automated review works
          </h2>
          <p className="text-slate-600 text-xs sm:text-sm">
            Here is what the system detects when checking a manuscript against an IEEE template:
          </p>
        </div>

        {/* 3-Column Light Window */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden text-slate-900">
          {/* Header Bar */}
          <div className="h-10 bg-slate-50 px-4 flex items-center justify-between border-b border-slate-200 text-xs text-slate-500">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
              <span className="ml-2 font-medium text-slate-700">
                Sample Report: IEEE Transactions Format Check
              </span>
            </div>
            <span className="text-[11px] font-semibold text-emerald-600">Review Completed</span>
          </div>

          {/* 3 Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 text-xs">
            {/* Column A: Template */}
            <div className="lg:col-span-3 p-5 space-y-3 bg-slate-50/50">
              <div className="font-semibold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                Journal Guidelines
              </div>
              <p className="text-[11px] text-slate-500">
                Requirements extracted from the reference template:
              </p>
              <div className="space-y-2">
                <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                  <div className="text-slate-500 text-[10px]">Columns</div>
                  <div className="font-bold text-slate-800">2 Columns (Double Column)</div>
                </div>
                <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                  <div className="text-slate-500 text-[10px]">Body Font</div>
                  <div className="font-bold text-slate-800">Times New Roman &bull; 10pt</div>
                </div>
                <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                  <div className="text-slate-500 text-[10px]">Margins</div>
                  <div className="font-bold text-slate-800">19mm Top &bull; 14.3mm Side</div>
                </div>
                <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                  <div className="text-slate-500 text-[10px]">Reference Style</div>
                  <div className="font-bold text-slate-800">Bracketed Numeric [1], [2]</div>
                </div>
              </div>
            </div>

            {/* Column B: Author Draft with Visual Overlays */}
            <div className="lg:col-span-5 p-5 space-y-3 bg-white">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  Your Manuscript Draft
                </span>
                <span className="text-[11px] text-rose-600 font-semibold">
                  2 Issues Spotted
                </span>
              </div>

              {/* Sample Paper Canvas */}
              <div className="bg-slate-50 rounded-lg p-4 h-64 overflow-hidden border border-slate-300 text-[10px] space-y-2.5 select-none shadow-xs">
                <div className="text-center font-bold text-xs text-slate-950">
                  High-Performance Data Storage for Distributed Systems
                </div>

                {/* Highlight 1: Email Leak */}
                <div className="p-2 border-2 border-dashed border-rose-500 bg-rose-50 rounded text-center">
                  <div className="font-semibold text-rose-950">
                    Dr. Alexander Wright &bull; wright@uts.edu.au
                  </div>
                  <div className="text-[9px] text-rose-700 font-bold">
                    Warning: Remove author email for double-blind review
                  </div>
                </div>

                <div className="italic text-slate-600 text-[9px] leading-tight">
                  <strong>Abstract</strong>—This research explores efficient file storage techniques for research databases...
                </div>

                {/* Highlight 2: Single Column Layout Issue */}
                <div className="p-2 border-2 border-dashed border-amber-500 bg-amber-50 rounded text-[9px] text-slate-800">
                  <strong>1. Introduction</strong>: In modern distributed architectures, file storage boundaries can slow down data sharing...
                  <div className="mt-1 font-bold text-amber-800">
                    Warning: Draft is single-column, but template requires double-column.
                  </div>
                </div>
              </div>
            </div>

            {/* Column C: Scorecard */}
            <div className="lg:col-span-4 p-5 space-y-3 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Compliance Score
                </span>
                <span className="font-bold text-amber-600 text-sm">78 / 100</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2 text-rose-900">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Author Info Detected</span>: Remove author names and email before submitting.
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2 text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Column Format</span>: Format paper into 2 columns.
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start gap-2 text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Citations Valid</span>: All 24 references match bibliography entries.
                  </div>
                </div>
              </div>

              <Button
                size="sm"
                onClick={openGoogleModal}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold mt-2"
              >
                Sign in to check your manuscript &rarr;
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. CORE FEATURES */}
      <section className="space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-1.5">
          <Badge variant="default">Features</Badge>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Built for authors and journal editors
          </h2>
          <p className="text-slate-600 text-xs sm:text-sm">
            Everything you need to verify paper compliance in one place.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="space-y-2">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
                <Box className="w-5 h-5" />
              </div>
              <CardTitle>Box Cloud Storage</CardTitle>
              <CardDescription>
                Direct file streaming to Box cloud storage, keeping documents secure and organized.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="space-y-2">
              <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100">
                <Sparkles className="w-5 h-5" />
              </div>
              <CardTitle>Google Gemini AI</CardTitle>
              <CardDescription>
                Fast layout comparison that checks margins, columns, and fonts in about 1 second.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="space-y-2">
              <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 border border-purple-100">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <CardTitle>Double-Blind Privacy</CardTitle>
              <CardDescription>
                Detects accidental author names, university affiliations, or email leaks before review.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="space-y-2">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                <Compass className="w-5 h-5" />
              </div>
              <CardTitle>Citation Validation</CardTitle>
              <CardDescription>
                Ensures every citation in the text connects to a valid entry in the references.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* 4. HOW IT WORKS (3 SIMPLE STEPS) */}
      <section id="how-it-works" className="rounded-xl border border-slate-200 bg-white p-8 sm:p-10 space-y-6 shadow-sm">
        <div className="text-center max-w-lg mx-auto space-y-1">
          <Badge variant="secondary">Step-by-Step</Badge>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            How It Works
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="p-4 space-y-2">
            <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center mx-auto text-sm border border-indigo-200">
              1
            </div>
            <h3 className="font-semibold text-slate-900 text-sm">Sign in with Google</h3>
            <p className="text-xs text-slate-500">
              Log in with your university account to open the submission workspace.
            </p>
          </div>

          <div className="p-4 space-y-2">
            <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center mx-auto text-sm border border-indigo-200">
              2
            </div>
            <h3 className="font-semibold text-slate-900 text-sm">Upload Draft & Template</h3>
            <p className="text-xs text-slate-500">
              Attach your manuscript draft and the journal's official styling template.
            </p>
          </div>

          <div className="p-4 space-y-2">
            <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center mx-auto text-sm border border-indigo-200">
              3
            </div>
            <h3 className="font-semibold text-slate-900 text-sm">Instant Review Report</h3>
            <p className="text-xs text-slate-500">
              Get an instant visual scorecard highlighting any formatting issues before submission.
            </p>
          </div>
        </div>
      </section>

      {/* 5. BOTTOM CTA */}
      <section className="rounded-xl bg-indigo-600 p-8 sm:p-12 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
        <div className="space-y-1.5 text-center sm:text-left">
          <h2 className="text-xl sm:text-2xl font-bold">
            Ready to check your research paper?
          </h2>
          <p className="text-xs sm:text-sm text-indigo-100">
            Sign in with Google to enter the submission dashboard and run your format check.
          </p>
        </div>
        <Button
          size="lg"
          onClick={openGoogleModal}
          className="bg-white hover:bg-slate-100 text-indigo-600 font-bold text-xs px-6 shrink-0 shadow-sm gap-2"
        >
          <GoogleLogo className="w-4 h-4" />
          <span>Sign In with Google</span>
        </Button>
      </section>
    </div>
  );
}
