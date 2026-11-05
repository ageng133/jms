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
  Layers,
  Sparkles,
  Eye,
  EyeOff,
} from "lucide-react";
import { PreSubmissionAuditReport } from "@/types/jms";
import { getAuditReport } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { AuthGateCard } from "@/components/AuthGateCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LayoutComparisonViewer } from "@/components/audit/LayoutComparisonViewer";

export default function AuditReportPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const searchParams = useSearchParams();
  const auditId = searchParams.get("audit_id");
  const { user, loading: authLoading } = useAuth();

  const [report, setReport] = useState<PreSubmissionAuditReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPdfPreview, setShowPdfPreview] = useState(true);

  async function fetchReport() {
    if (!user) {
      setLoading(false);
      return;
    }

    // Resolve via query parameter audit_id or automatically via manuscript ID in route
    const targetIdentifier = auditId || resolvedParams.id;
    if (!targetIdentifier) {
      setError("Missing submission identifier");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getAuditReport(targetIdentifier);
      setReport(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch audit report");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    fetchReport();
    const interval = setInterval(() => {
      // Poll if report status is not completed yet
      if (!report || (report as any).status === "QUEUED" || (report as any).status === "PROCESSING") {
        fetchReport();
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [auditId, resolvedParams.id, user]);

  if (authLoading) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0071e3] mx-auto mb-3" />
        <p className="text-xs text-[#86868b]">Checking authorization status...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthGateCard
        title="Authentication Required to View Audit Report"
        description="This pre-submission compliance audit contains confidential manuscript formatting insights, layout annotations, and double-blind checks. Please sign in with your Google account to view this report."
        actionText="Sign In with Google to Inspect Audit"
      />
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/[0.06] pb-6">
        <div className="space-y-1">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#86868b] hover:text-[#1d1d1f] mb-2 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Admin Portal
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-[#1d1d1f] tracking-tight">AI Pre-Submission Audit Report</h1>
            <Badge variant="default" className="text-[10px]">
              Template-Driven Audit
            </Badge>
            {report?.ai_engine && (
              <Badge
                variant="outline"
                className={`text-[10px] ${
                  report.ai_mode === "LIVE_GEMINI_AI"
                    ? "border-[#34c759]/30 text-[#34c759] bg-[#34c759]/5"
                    : "border-[#ff9500]/30 text-[#ff9500] bg-[#ff9500]/5"
                }`}
              >
                {report.ai_engine}
              </Badge>
            )}
          </div>
          <p className="text-xs text-[#86868b] font-mono">
            Manuscript: {resolvedParams.id} &bull; Audit: {report?.audit_id || auditId || "Latest Audit"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchReport}
            className="rounded-full text-xs gap-1.5 border-black/[0.12] hover:bg-black/[0.04]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          {report?.annotated_pdf_s3_key && (
            <>
              <Button
                variant={showPdfPreview ? "secondary" : "outline"}
                size="sm"
                onClick={() => setShowPdfPreview(!showPdfPreview)}
                className="rounded-full text-xs gap-1.5 border-black/[0.12]"
              >
                {showPdfPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showPdfPreview ? "Hide Layout Comparison" : "Show Layout Comparison"}</span>
              </Button>
              <a
                href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1"}/files/download?key=${encodeURIComponent(report.annotated_pdf_s3_key)}`}
                target="_blank"
                rel="noreferrer"
              >
                <Button size="sm" className="bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-medium rounded-full shadow-xs gap-1.5">
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Reshaped PDF</span>
                </Button>
              </a>
            </>
          )}
        </div>
      </div>

      {loading && !report && (
        <div className="p-16 text-center bg-white rounded-3xl border border-black/[0.06] shadow-apple-card space-y-3">
          <Loader2 className="w-8 h-8 text-[#0071e3] animate-spin mx-auto" />
          <p className="text-sm font-semibold text-[#1d1d1f]">Executing Comparative Multi-Module AI Audit...</p>
          <p className="text-xs text-[#86868b]">Comparing draft geometry against template guidelines, double-blind NER &amp; citation graphs.</p>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-[#ff3b30]/10 border border-[#ff3b30]/20 text-[#ff3b30] text-xs">
          {error}
        </div>
      )}

      {report && (
        <div className="space-y-8">
          {/* Interactive Before-vs-After Visual Layout Comparison Engine */}
          {showPdfPreview && (
            <LayoutComparisonViewer report={report} />
          )}

          {/* Executive Summary Card */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-black/[0.06] shadow-apple-card grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-center">
            <div className="flex items-center gap-4 sm:border-r sm:border-black/[0.06] pr-4">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold shrink-0 ${
                  report.overall_score >= 80
                    ? "bg-[#34c759]/10 text-[#34c759] border border-[#34c759]/20"
                    : "bg-[#ff3b30]/10 text-[#ff3b30] border border-[#ff3b30]/20"
                }`}
              >
                {report.overall_score}
              </div>
              <div>
                <p className="text-xs font-semibold text-[#86868b]">Compliance Score</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge
                    variant={report.summary.status === "PASS" ? "success" : "destructive"}
                    className="text-[11px] gap-1"
                  >
                    {report.summary.status === "PASS" ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : (
                      <XCircle className="w-3 h-3" />
                    )}
                    <span>{report.summary.status}</span>
                  </Badge>
                </div>
              </div>
            </div>

            <div className="space-y-0.5 sm:border-r sm:border-black/[0.06] pr-4">
              <p className="text-xs font-semibold text-[#86868b]">Critical Errors</p>
              <p className="text-2xl font-bold text-[#ff3b30]">{report.summary.critical_errors}</p>
              <p className="text-xs text-[#86868b]">Requires author remediation</p>
            </div>

            <div className="space-y-0.5 lg:border-r lg:border-black/[0.06] pr-4">
              <p className="text-xs font-semibold text-[#86868b]">Warnings</p>
              <p className="text-2xl font-bold text-[#ff9500]">{report.summary.warnings}</p>
              <p className="text-xs text-[#86868b]">Non-fatal advisories</p>
            </div>

            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-[#86868b]">Desk Review Status</p>
              <p className="text-sm font-semibold text-[#1d1d1f]">
                {report.summary.status === "PASS" ? "Ready for Desk Review" : "Revision Required Before Review"}
              </p>
            </div>
          </div>

          {/* Format Kilat: Fixed Layout & Remediation Blueprint */}
          {report.fixed_layout && (
            <div className="bg-gradient-to-br from-white via-white to-[#0071e3]/[0.03] rounded-3xl p-6 sm:p-8 border border-[#0071e3]/20 shadow-apple-card space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/[0.06] pb-5">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-[#0071e3] text-white flex items-center justify-center shadow-xs">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base sm:text-lg font-bold text-[#1d1d1f] tracking-tight">
                        ⚡ Autonomous Layout Reshape &amp; Remediation Blueprint
                      </h2>
                      <Badge className="bg-[#34c759] text-white text-[10px] font-semibold">
                        {report.fixed_layout.camera_ready_status || "RESHAPED_PASS"}
                      </Badge>
                      {report.template_specs?.is_custom_template && (
                        <Badge variant="outline" className="text-[10px] border-[#0071e3]/30 text-[#0071e3] bg-[#0071e3]/5">
                          Uploaded Template Match
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-[#86868b] mt-0.5">
                      Draft layout audited and autonomously reshaped to conform with {report.fixed_layout.target_format}
                    </p>
                  </div>
                </div>

                {report.annotated_pdf_s3_key && (
                  <a
                    href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1"}/files/download?key=${encodeURIComponent(report.annotated_pdf_s3_key)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Button size="sm" className="bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-semibold rounded-full px-4 shadow-xs gap-2">
                      <Download className="w-4 h-4" />
                      <span>Download Reshaped PDF (⚡)</span>
                    </Button>
                  </a>
                )}
              </div>

              {/* Target Geometry Specs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-white border border-black/[0.06] shadow-xs space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[#86868b] tracking-wider">Target Format</span>
                  <p className="text-sm font-bold text-[#1d1d1f]">
                    {report.template_specs?.page_format || "A4"}
                  </p>
                  <p className="text-[11px] text-[#86868b]">
                    {report.template_specs?.page_width_mm || 210} &times; {report.template_specs?.page_height_mm || 297} mm
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-black/[0.06] shadow-xs space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[#86868b] tracking-wider">Reshaped Margins</span>
                  <p className="text-sm font-bold text-[#1d1d1f]">
                    {report.template_specs?.margin_top_mm ?? 20}mm / {report.template_specs?.margin_bottom_mm ?? 20}mm
                  </p>
                  <p className="text-[11px] text-[#86868b]">Top &amp; Bottom bounds</p>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-black/[0.06] shadow-xs space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[#86868b] tracking-wider">Side Margins</span>
                  <p className="text-sm font-bold text-[#1d1d1f]">
                    {report.template_specs?.margin_left_mm ?? 18}mm / {report.template_specs?.margin_right_mm ?? 18}mm
                  </p>
                  <p className="text-[11px] text-[#86868b]">Left &amp; Right borders</p>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-black/[0.06] shadow-xs space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[#86868b] tracking-wider">Column Alignment</span>
                  <p className="text-sm font-bold text-[#1d1d1f] text-[#0071e3]">
                    {report.template_specs?.column_count || 2} Columns ({report.template_specs?.column_gap_mm || 6.35}mm gap)
                  </p>
                  <p className="text-[11px] text-[#86868b]">Template column grid</p>
                </div>
              </div>

              {/* Remediation Action Steps Applied */}
              {report.fixed_layout.remediation_actions && report.fixed_layout.remediation_actions.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#86868b]">
                    Automated Corrective Actions Applied Today ({report.fixed_layout.remediation_actions.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {report.fixed_layout.remediation_actions.map((act, i) => (
                      <div key={i} className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-white border border-black/[0.06] text-xs">
                        <CheckCircle2 className="w-4 h-4 text-[#34c759] shrink-0 mt-0.5" />
                        <span className="text-[#1d1d1f] font-medium leading-relaxed">{act}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reference Journal Template Specifications Card */}
          {report.template_specs && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-black/[0.06] shadow-apple-card space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/[0.06] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-[#0071e3]/10 flex items-center justify-center text-[#0071e3]">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#1d1d1f] flex items-center gap-2">
                      Reference Journal Template Specifications
                      <Sparkles className="w-4 h-4 text-[#ff9500]" />
                    </h2>
                    <p className="text-xs text-[#86868b]">
                      {report.template_specs.is_custom_template
                        ? "Extracted dynamically from uploaded Journal Template PDF"
                        : "Using Standard Baseline Academic Template"}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs self-start sm:self-auto">
                  Format: {report.template_specs.page_format} ({report.template_specs.page_width_mm} &times; {report.template_specs.page_height_mm} mm)
                </Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-1">
                <div className="bg-[#f5f5f7] rounded-2xl p-3.5 space-y-1 border border-black/[0.04]">
                  <span className="text-[#86868b] font-medium text-[10px] uppercase">Top Margin</span>
                  <p className="text-base font-bold text-[#1d1d1f]">{report.template_specs.margin_top_mm} mm</p>
                </div>
                <div className="bg-[#f5f5f7] rounded-2xl p-3.5 space-y-1 border border-black/[0.04]">
                  <span className="text-[#86868b] font-medium text-[10px] uppercase">Bottom Margin</span>
                  <p className="text-base font-bold text-[#1d1d1f]">{report.template_specs.margin_bottom_mm} mm</p>
                </div>
                <div className="bg-[#f5f5f7] rounded-2xl p-3.5 space-y-1 border border-black/[0.04]">
                  <span className="text-[#86868b] font-medium text-[10px] uppercase">Left &amp; Right Margins</span>
                  <p className="text-base font-bold text-[#1d1d1f]">
                    {report.template_specs.margin_left_mm} / {report.template_specs.margin_right_mm} mm
                  </p>
                </div>
                <div className="bg-[#f5f5f7] rounded-2xl p-3.5 space-y-1 border border-black/[0.04]">
                  <span className="text-[#86868b] font-medium text-[10px] uppercase">Column Grid</span>
                  <p className="text-base font-bold text-[#1d1d1f]">
                    {report.template_specs.column_count === 2 ? "2 Columns" : "1 Column"}
                    {report.template_specs.column_gap_mm ? ` (${report.template_specs.column_gap_mm}mm gap)` : ""}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Module 1: Geometry & Layout */}
          <div className="bg-white rounded-3xl border border-black/[0.06] shadow-apple-card overflow-hidden">
            <div className="p-6 border-b border-black/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#0071e3]/10 text-[#0071e3] flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-[#1d1d1f]">Module 1: Geometry &amp; Layout Inspection</h2>
                  <p className="text-xs text-[#86868b]">
                    Draft layout compared against {report.template_specs ? "uploaded template specifications" : "standard margins"}
                  </p>
                </div>
              </div>
              <Badge
                variant={report.modules.geometry_and_layout.pass ? "success" : "destructive"}
                className="text-[10px]"
              >
                {report.modules.geometry_and_layout.pass ? "PASSED" : "FAILED"}
              </Badge>
            </div>

            {report.modules.geometry_and_layout.checks.length === 0 ? (
              <div className="p-6 text-xs text-[#34c759] bg-[#34c759]/5 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>All margins, page dimensions, and column grids strictly conform to the target Journal Template.</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f5f5f7] text-[#86868b] font-semibold border-b border-black/[0.06]">
                    <tr>
                      <th className="px-6 py-3">Rule / Constraint</th>
                      <th className="px-6 py-3">Page</th>
                      <th className="px-6 py-3">Template Expected</th>
                      <th className="px-6 py-3">Draft Actual</th>
                      <th className="px-6 py-3">Violation Box</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.06]">
                    {report.modules.geometry_and_layout.checks.map((c, idx) => (
                      <tr key={idx} className="hover:bg-black/[0.02]">
                        <td className="px-6 py-3.5 font-semibold text-[#ff3b30] flex items-center gap-1.5">
                          <XCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{c.rule}</span>
                        </td>
                        <td className="px-6 py-3.5 font-medium text-[#1d1d1f]">{c.page}</td>
                        <td className="px-6 py-3.5 text-[#86868b] font-mono">{c.expected}</td>
                        <td className="px-6 py-3.5 text-[#ff3b30] font-mono font-bold">{c.actual}</td>
                        <td className="px-6 py-3.5 text-[#86868b] font-mono">
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
          <div className="bg-white rounded-3xl border border-black/[0.06] shadow-apple-card overflow-hidden">
            <div className="p-6 border-b border-black/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#af52de]/10 text-[#af52de] flex items-center justify-center">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-[#1d1d1f]">Module 2: Double-Blind Anonymization</h2>
                  <p className="text-xs text-[#86868b]">spaCy Named Entity Recognition &amp; regex identifier sweep</p>
                </div>
              </div>
              <Badge
                variant={report.modules.anonymization.pass ? "success" : "warning"}
                className="text-[10px]"
              >
                {report.modules.anonymization.pass ? "PASSED" : "LEAKS DETECTED"}
              </Badge>
            </div>

            {report.modules.anonymization.leaks_found.length === 0 ? (
              <div className="p-6 text-xs text-[#34c759] bg-[#34c759]/5 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>No author names, affiliations, emails, ORCID numbers, or metadata tags detected.</span>
              </div>
            ) : (
              <div className="p-6 space-y-3">
                {report.modules.anonymization.leaks_found.map((l, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3.5 rounded-2xl bg-[#ff9500]/10 border border-[#ff9500]/20 text-xs">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-[#ff9500] shrink-0" />
                      <span className="font-semibold text-[#1d1d1f]">[{l.type}]</span>
                      <span className="text-[#1d1d1f] font-mono font-medium">{l.leak}</span>
                    </div>
                    <span className="text-[#86868b] font-medium">Page {l.page}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Module 3: Citation Crosscheck */}
          <div className="bg-white rounded-3xl border border-black/[0.06] shadow-apple-card overflow-hidden">
            <div className="p-6 border-b border-black/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#34c759]/10 text-[#34c759] flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-[#1d1d1f]">Module 3: Citation Graph Crosscheck</h2>
                  <p className="text-xs text-[#86868b]">
                    Bidirectional mapping between body citations and bibliography items ({report.modules.citation_crosscheck.total_cited} cited)
                  </p>
                </div>
              </div>
              <Badge
                variant={report.modules.citation_crosscheck.pass ? "success" : "warning"}
                className="text-[10px]"
              >
                {report.modules.citation_crosscheck.pass ? "PASSED" : "DISCREPANCIES"}
              </Badge>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Uncited references */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#86868b]">
                  Uncited References in Bibliography ({report.modules.citation_crosscheck.uncited_references.length})
                </h3>
                {report.modules.citation_crosscheck.uncited_references.length === 0 ? (
                  <p className="text-xs text-[#34c759] flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> All bibliography entries are cited.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {report.modules.citation_crosscheck.uncited_references.map((ref, idx) => (
                      <li key={idx} className="text-xs p-2.5 rounded-xl bg-[#f5f5f7] border border-black/[0.04] text-[#1d1d1f] font-mono">
                        {ref}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Missing citations */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#86868b]">
                  Missing in Bibliography ({report.modules.citation_crosscheck.missing_citations.length})
                </h3>
                {report.modules.citation_crosscheck.missing_citations.length === 0 ? (
                  <p className="text-xs text-[#34c759] flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> All inline citations exist in bibliography.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {report.modules.citation_crosscheck.missing_citations.map((c, idx) => (
                      <li key={idx} className="text-xs p-2.5 rounded-xl bg-[#ff3b30]/10 border border-[#ff3b30]/20 text-[#ff3b30] font-mono">
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
