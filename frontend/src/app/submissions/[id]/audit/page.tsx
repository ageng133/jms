"use client";

import { useEffect, useState, use } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  FileText,
  Shield,
  BookOpen,
  ArrowLeft,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { PreSubmissionAuditReport } from "@/types/jms";
import { getAuditReport } from "@/lib/api";

export default function AuditReportPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const searchParams = useSearchParams();
  const auditId = searchParams.get("audit_id");

  const [report, setReport] = useState<PreSubmissionAuditReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchReport() {
    if (!auditId) {
      setError("Missing audit_id parameter in URL");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getAuditReport(auditId);
      setReport(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch audit report");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReport();
    const interval = setInterval(() => {
      // Poll if report status is not completed yet
      if (!report || (report as any).status === "QUEUED" || (report as any).status === "PROCESSING") {
        fetchReport();
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [auditId]);

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div className="space-y-1">
          <Link
            href="/submissions"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-2 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Submissions
          </Link>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">AI Pre-Submission Audit Report</h1>
          <p className="text-xs text-slate-500 font-mono">
            Manuscript: {resolvedParams.id} &bull; Audit: {auditId || "N/A"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchReport}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          {report?.annotated_pdf_s3_key && (
            <a
              href={`${process.env.NEXT_PUBLIC_S3_PUBLIC_URL || "http://localhost:9000"}/jms-manuscripts/${report.annotated_pdf_s3_key}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition"
            >
              <Download className="w-3.5 h-3.5" />
              Download Annotated PDF
            </a>
          )}
        </div>
      </div>

      {loading && !report && (
        <div className="p-16 text-center bg-white rounded-2xl border border-slate-200 space-y-4">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-700">Executing Multi-Module AI Audit...</p>
          <p className="text-xs text-slate-400">Inspecting geometry coordinates, double-blind NER, and citation graphs.</p>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          {error}
        </div>
      )}

      {report && (
        <div className="space-y-8">
          {/* Executive Summary Card */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
            <div className="flex items-center gap-4 md:border-r md:border-slate-200 pr-6">
              <div
                className={`w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-black shrink-0 ${
                  report.overall_score >= 80
                    ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                    : "bg-rose-50 text-rose-600 border border-rose-200"
                }`}
              >
                {report.overall_score}
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Compliance Score</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      report.summary.status === "PASS"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {report.summary.status === "PASS" ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : (
                      <XCircle className="w-3 h-3" />
                    )}
                    {report.summary.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Critical Errors</p>
              <p className="text-2xl font-black text-rose-600">{report.summary.critical_errors}</p>
              <p className="text-xs text-slate-500">Requires author remediation</p>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Warnings</p>
              <p className="text-2xl font-black text-amber-500">{report.summary.warnings}</p>
              <p className="text-xs text-slate-500">Non-fatal compliance advisories</p>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Desk Review Status</p>
              <p className="text-sm font-bold text-slate-800">
                {report.summary.status === "PASS" ? "Ready for Desk Review" : "Revision Required Before Review"}
              </p>
            </div>
          </div>

          {/* Module 1: Geometry & Layout */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Module 1: Geometry & Layout Inspection</h2>
                  <p className="text-xs text-slate-500">PyMuPDF margin measurement & bounding box coordinate capture</p>
                </div>
              </div>
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  report.modules.geometry_and_layout.pass
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-rose-100 text-rose-800"
                }`}
              >
                {report.modules.geometry_and_layout.pass ? "PASSED" : "FAILED"}
              </span>
            </div>

            {report.modules.geometry_and_layout.checks.length === 0 ? (
              <div className="p-6 text-xs text-emerald-700 bg-emerald-50/50 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                All margin and layout dimensions conform with journal specifications (25.4mm standard).
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-3">Rule</th>
                      <th className="px-6 py-3">Page</th>
                      <th className="px-6 py-3">Expected</th>
                      <th className="px-6 py-3">Actual</th>
                      <th className="px-6 py-3">Bounding Box [x0, y0, x1, y1]</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.modules.geometry_and_layout.checks.map((c, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="px-6 py-3.5 font-bold text-rose-600 flex items-center gap-1.5">
                          <XCircle className="w-3.5 h-3.5 shrink-0" />
                          {c.rule}
                        </td>
                        <td className="px-6 py-3.5 font-medium text-slate-700">{c.page}</td>
                        <td className="px-6 py-3.5 text-slate-600 font-mono">{c.expected}</td>
                        <td className="px-6 py-3.5 text-rose-700 font-mono font-bold">{c.actual}</td>
                        <td className="px-6 py-3.5 text-slate-500 font-mono">
                          [{c.bbox.join(", ")}]
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Module 2: Anonymization */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Module 2: Double-Blind Anonymization</h2>
                  <p className="text-xs text-slate-500">spaCy Named Entity Recognition & regex identifier sweep</p>
                </div>
              </div>
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  report.modules.anonymization.pass
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {report.modules.anonymization.pass ? "PASSED" : "LEAKS DETECTED"}
              </span>
            </div>

            {report.modules.anonymization.leaks_found.length === 0 ? (
              <div className="p-6 text-xs text-emerald-700 bg-emerald-50/50 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                No author names, affiliations, emails, ORCID numbers, or metadata tags detected.
              </div>
            ) : (
              <div className="p-6 space-y-3">
                {report.modules.anonymization.leaks_found.map((l, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-amber-50/70 border border-amber-200 text-xs">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span className="font-bold text-amber-900">[{l.type}]</span>
                      <span className="text-slate-800 font-mono font-medium">{l.leak}</span>
                    </div>
                    <span className="text-slate-500 font-semibold">Page {l.page}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Module 3: Citation Crosscheck */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Module 3: Citation Graph Crosscheck</h2>
                  <p className="text-xs text-slate-500">
                    Bidirectional mapping between body citations and bibliography items ({report.modules.citation_crosscheck.total_cited} cited)
                  </p>
                </div>
              </div>
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  report.modules.citation_crosscheck.pass
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {report.modules.citation_crosscheck.pass ? "PASSED" : "DISCREPANCIES"}
              </span>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Uncited references */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Uncited References in Bibliography ({report.modules.citation_crosscheck.uncited_references.length})
                </h3>
                {report.modules.citation_crosscheck.uncited_references.length === 0 ? (
                  <p className="text-xs text-emerald-600 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> All bibliography entries are cited.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {report.modules.citation_crosscheck.uncited_references.map((ref, idx) => (
                      <li key={idx} className="text-xs p-2 rounded bg-slate-50 border border-slate-200 text-slate-700 font-mono">
                        {ref}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Missing citations */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Missing in Bibliography ({report.modules.citation_crosscheck.missing_citations.length})
                </h3>
                {report.modules.citation_crosscheck.missing_citations.length === 0 ? (
                  <p className="text-xs text-emerald-600 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> All inline citations exist in bibliography.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {report.modules.citation_crosscheck.missing_citations.map((c, idx) => (
                      <li key={idx} className="text-xs p-2 rounded bg-rose-50 border border-rose-200 text-rose-800 font-mono">
                        {c}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
