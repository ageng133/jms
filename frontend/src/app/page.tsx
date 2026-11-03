import Link from "next/link";
import { ArrowRight, CheckCircle2, FileText, ShieldAlert, Sparkles, Cpu } from "lucide-react";

export default function HomePage() {
  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 text-white rounded-2xl p-8 sm:p-12 shadow-xl border border-slate-700/50">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            Decoupled Asynchronous Pre-Submission Pipeline
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Automated Manuscript Auditing & Peer-Review Control Plane
          </h1>
          <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
            Eliminate desk-review drag. Validate geometry margins, enforce strict double-blind anonymization,
            and cross-check bidirectional citation integrity with instant visual PDF overlays.
          </p>
          <div className="pt-4 flex flex-wrap gap-4">
            <Link
              href="/submissions/new"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-white shadow-lg transition"
            >
              Start New Submission
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/submissions"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 font-semibold text-slate-200 border border-slate-700 transition"
            >
              Browse Submissions
            </Link>
          </div>
        </div>
      </div>

      {/* 3 Core Verification Modules */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Layout & Geometry Check</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            PyMuPDF high-precision coordinate extraction measuring top, bottom, and side margins in points and millimeters.
            Flags boundary violations with exact bounding boxes.
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Double-Blind Anonymization</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            spaCy NER combined with regex pattern filters detects leaked author identities, affiliations, ORCID IDs,
            emails, and PDF document metadata.
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Citation Graph Integrity</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Bidirectional graph alignment verifying that every inline citation has a corresponding bibliography entry,
            and flagging uncited references automatically.
          </p>
        </div>
      </div>
    </div>
  );
}

