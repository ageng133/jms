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
    <div className="space-y-16 sm:space-y-24 pb-16">
      {/* 1. HERO SECTION (APPLE HIG LIGHT MODE) */}
      <section className="relative overflow-hidden rounded-3xl bg-white p-6 sm:p-12 lg:p-16 border border-black/[0.06] shadow-apple-card text-[#1d1d1f]">
        <div className="max-w-3xl space-y-6">
          {/* Status pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/[0.04] text-[#1d1d1f] text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-[#34c759] shadow-xs" />
            <span>Academic Paper Pre-Submission Review System</span>
          </div>

          {/* Headline */}
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] text-[#1d1d1f]">
              Check your journal paper format{" "}
              <span className="text-[#0071e3]">before you submit.</span>
            </h1>
            <p className="text-base sm:text-lg text-[#86868b] leading-relaxed max-w-2xl">
              Eliminate desk rejections caused by small layout errors. Upload your draft PDF alongside the journal template to automatically verify margins, columns, double-blind anonymization, and references.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {user ? (
              <Button
                size="lg"
                onClick={() => router.push("/admin")}
                className="bg-[#0071e3] hover:bg-[#0077ed] text-white font-medium rounded-full gap-2 shadow-xs text-sm h-11 px-6 active:scale-[0.98] transition-all"
              >
                <span>Open Submission Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                size="lg"
                onClick={openGoogleModal}
                className="bg-[#0071e3] hover:bg-[#0077ed] text-white font-medium rounded-full gap-2.5 shadow-xs text-sm h-11 px-6 active:scale-[0.98] transition-all"
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
              className="gap-2 text-sm rounded-full border-black/[0.12] hover:bg-black/[0.04] text-[#1d1d1f] h-11 px-6 active:scale-[0.98] transition-all"
            >
              <span>See Sample Review</span>
              <ChevronRight className="w-4 h-4 text-[#86868b]" />
            </Button>
          </div>

          {/* Highlights */}
          <div className="pt-6 border-t border-black/[0.06] grid grid-cols-2 sm:grid-cols-4 gap-4 text-[#86868b] text-xs">
            <div>
              <div className="text-base font-bold text-[#1d1d1f]">~1 Second</div>
              <div>Fast Format Check</div>
            </div>
            <div>
              <div className="text-base font-bold text-[#1d1d1f]">Box Cloud</div>
              <div>Secure Cloud Storage</div>
            </div>
            <div>
              <div className="text-base font-bold text-[#1d1d1f]">Google Gemini</div>
              <div>Visual Layout AI</div>
            </div>
            <div>
              <div className="text-base font-bold text-[#1d1d1f]">Double-Blind</div>
              <div>Author Info Leak Check</div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. DEMO PREVIEW (macOS WINDOW CHROME CARD) */}
      <section id="demo-preview" className="space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <Badge variant="default">Sample Audit Report</Badge>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1d1d1f]">
            How the automated review works
          </h2>
          <p className="text-[#86868b] text-xs sm:text-sm">
            Here is what the system detects when checking a manuscript against an IEEE template:
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
              Review Completed
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
                Requirements extracted from the reference template:
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

      {/* 3. CORE FEATURES */}
      <section className="space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <Badge variant="default">Features</Badge>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1d1d1f]">
            Built for authors and journal editors
          </h2>
          <p className="text-[#86868b] text-xs sm:text-sm">
            Everything you need to verify paper compliance in one place.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="rounded-3xl border border-black/[0.06] shadow-apple-card hover:shadow-apple-hover transition-all">
            <CardHeader className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-[#0071e3]/10 flex items-center justify-center text-[#0071e3]">
                <Box className="w-5 h-5" />
              </div>
              <CardTitle className="text-base text-[#1d1d1f]">Box Cloud Storage</CardTitle>
              <CardDescription className="text-xs text-[#86868b]">
                Direct file streaming to Box cloud storage, keeping documents secure and organized.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="rounded-3xl border border-black/[0.06] shadow-apple-card hover:shadow-apple-hover transition-all">
            <CardHeader className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-[#0071e3]/10 flex items-center justify-center text-[#0071e3]">
                <Sparkles className="w-5 h-5" />
              </div>
              <CardTitle className="text-base text-[#1d1d1f]">Google Gemini AI</CardTitle>
              <CardDescription className="text-xs text-[#86868b]">
                Fast layout comparison that checks margins, columns, and fonts in about 1 second.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="rounded-3xl border border-black/[0.06] shadow-apple-card hover:shadow-apple-hover transition-all">
            <CardHeader className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-[#af52de]/10 flex items-center justify-center text-[#af52de]">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <CardTitle className="text-base text-[#1d1d1f]">Double-Blind Privacy</CardTitle>
              <CardDescription className="text-xs text-[#86868b]">
                Detects accidental author names, university affiliations, or email leaks before review.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="rounded-3xl border border-black/[0.06] shadow-apple-card hover:shadow-apple-hover transition-all">
            <CardHeader className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-[#34c759]/10 flex items-center justify-center text-[#34c759]">
                <Compass className="w-5 h-5" />
              </div>
              <CardTitle className="text-base text-[#1d1d1f]">Citation Validation</CardTitle>
              <CardDescription className="text-xs text-[#86868b]">
                Ensures every citation in the text connects to a valid entry in the references.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* 4. HOW IT WORKS (3 SIMPLE STEPS) */}
      <section id="how-it-works" className="rounded-3xl border border-black/[0.06] bg-white p-8 sm:p-12 space-y-8 shadow-apple-card">
        <div className="text-center max-w-lg mx-auto space-y-2">
          <Badge variant="secondary">Step-by-Step</Badge>
          <h2 className="text-xl sm:text-2xl font-bold text-[#1d1d1f]">
            How It Works
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="p-4 space-y-2.5">
            <div className="w-10 h-10 rounded-full bg-[#0071e3]/10 text-[#0071e3] font-bold flex items-center justify-center mx-auto text-sm">
              1
            </div>
            <h3 className="font-semibold text-[#1d1d1f] text-sm">Sign in with Google</h3>
            <p className="text-xs text-[#86868b]">
              Log in with your university account to open the submission workspace.
            </p>
          </div>

          <div className="p-4 space-y-2.5">
            <div className="w-10 h-10 rounded-full bg-[#0071e3]/10 text-[#0071e3] font-bold flex items-center justify-center mx-auto text-sm">
              2
            </div>
            <h3 className="font-semibold text-[#1d1d1f] text-sm">Upload Draft &amp; Template</h3>
            <p className="text-xs text-[#86868b]">
              Attach your manuscript draft and the journal&apos;s official styling template.
            </p>
          </div>

          <div className="p-4 space-y-2.5">
            <div className="w-10 h-10 rounded-full bg-[#0071e3]/10 text-[#0071e3] font-bold flex items-center justify-center mx-auto text-sm">
              3
            </div>
            <h3 className="font-semibold text-[#1d1d1f] text-sm">Instant Review Report</h3>
            <p className="text-xs text-[#86868b]">
              Get an instant visual scorecard highlighting any formatting issues before submission.
            </p>
          </div>
        </div>
      </section>

      {/* 5. BOTTOM CTA */}
      <section className="rounded-3xl bg-[#0071e3] p-8 sm:p-12 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-apple-card">
        <div className="space-y-1.5 text-center sm:text-left">
          <h2 className="text-xl sm:text-2xl font-bold">
            Ready to check your research paper?
          </h2>
          <p className="text-xs sm:text-sm text-white/80">
            Sign in with Google to enter the submission dashboard and run your format check.
          </p>
        </div>
        <Button
          size="lg"
          onClick={openGoogleModal}
          className="bg-white hover:bg-white/95 text-[#0071e3] font-medium text-xs px-6 rounded-full shrink-0 shadow-xs gap-2 h-11 active:scale-[0.98] transition-all"
        >
          <GoogleLogo className="w-4 h-4" />
          <span>Sign In with Google</span>
        </Button>
      </section>
    </div>
  );
}
