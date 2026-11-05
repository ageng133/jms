"use client";

import { useCallback, useEffect, useRef, useState, use } from "react";
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
import { getAuditReport, getFileDownloadUrl, getLatestAuditIdForManuscript } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { AuthGateCard } from "@/components/AuthGateCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LayoutComparisonViewer } from "@/components/audit/LayoutComparisonViewer";
import { AICopilotWidget } from "@/components/audit/AICopilotWidget";
import { TemplateComparisonMatrix } from "@/components/audit/TemplateComparisonMatrix";
import { ComplianceCertificateCard } from "@/components/audit/ComplianceCertificateCard";

function humanizeLeakType(type: string): string {
  const map: Record<string, string> = {
    NER_PERSON: "Author Name",
    NER_ORG: "University / Institution",
    EMAIL: "Author Email",
    ORCID: "ORCID Identifier",
    PDF_METADATA_AUTHOR: "Document Metadata Author",
    FUNDING_LEAK: "Grant / Funding Mention",
    "Author Name": "Author Name",
    "University / Affiliation": "University / Institution",
    "Author / Person Name": "Author Name",
    "University / Institution": "University / Institution",
    "Author Email": "Author Email",
    "ORCID Identifier": "ORCID Identifier",
    "Research Grant / Funding": "Grant / Funding Mention",
  };
  return map[type] || type.replace(/^NER_/, "").replace(/_/g, " ");
}

function humanizeRuleName(rule: string): string {
  const map: Record<string, string> = {
    PAGE_DIMENSIONS: "Page Format / Paper Size",
    MARGIN_TOP: "Top Margin",
    MARGIN_BOTTOM: "Bottom Margin",
    MARGIN_LEFT: "Left Margin",
    MARGIN_RIGHT: "Right Margin",
    COLUMN_LAYOUT: "Column Layout",
    page_size: "Page Format / Paper Size",
    margin_top: "Top Margin",
    margin_bottom: "Bottom Margin",
    margin_left: "Left Margin",
    margin_right: "Right Margin",
    column_count: "Column Count",
    column_gap: "Column Spacing",
  };
  return map[rule] || rule.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AuditReportPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const searchParams = useSearchParams();
  const auditIdParam = searchParams.get("audit_id");
  const { user, loading: authLoading } = useAuth();

  const [auditId, setAuditId] = useState<string | null>(auditIdParam);
  const [report, setReport] = useState<PreSubmissionAuditReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPdfPreview, setShowPdfPreview] = useState(true);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isPending = !!report && (report.status === "QUEUED" || report.status === "PROCESSING");
  const isFailed = report?.status === "FAILED";

  // Resolve the audit id: use ?audit_id= if present, otherwise fall back to the
  // manuscript's latest audit so links without the query param still work.
  useEffect(() => {
    if (!user) return;
    if (auditIdParam) {
      setAuditId(auditIdParam);
      return;
    }
    let cancelled = false;
    getLatestAuditIdForManuscript(resolvedParams.id)
      .then((id) => {
        if (cancelled) return;
        if (id) setAuditId(id);
        else {
          setError("No audit has been run for this manuscript yet. Upload a draft to start the pre-check.");
          setLoading(false);
        }
      })
      .catch((err: any) => {
        if (cancelled) return;
        setError(err.message || "Failed to load manuscript");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, auditIdParam, resolvedParams.id]);

  const fetchReport = useCallback(async () => {
    if (!user || !auditId) return null;
    try {
      setLoading(true);
      setError(null);
      const data = await getAuditReport(auditId);
      setReport(data);
      return data;
    } catch (err: any) {
      setError(err.message || "Failed to fetch audit report");
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, auditId]);

  // Poll every 3s while the audit is QUEUED/PROCESSING, stop once it is final.
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    if (!auditId) return;

    let cancelled = false;
    async function tick() {
      const data = await fetchReport();
      if (cancelled) return;
      if (data && (data.status === "QUEUED" || data.status === "PROCESSING")) {
        pollTimer.current = setTimeout(tick, 3000);
      }
    }
    tick();

    return () => {
      cancelled = true;
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, [user, auditId, fetchReport]);

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
            className="inline-flex items-center gap-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 px-3.5 py-1.5 rounded-full mb-3 transition shadow-xs w-fit"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>&larr; Kembali ke Editorial Portal (Admin Dashboard)</span>
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-[#1d1d1f] tracking-tight">AI Pre-Submission Audit Report</h1>
            <Badge variant="default" className="text-[10px]">
              Pemeriksaan Format Jurnal
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
                <span>{showPdfPreview ? "Tutup Perbandingan Visual" : "Buka Perbandingan Visual"}</span>
              </Button>
              <a
                href={getFileDownloadUrl(report.annotated_pdf_s3_key)}
                target="_blank"
                rel="noreferrer"
              >
                <Button size="sm" className="bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-medium rounded-full shadow-xs gap-1.5">
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Catatan Revisi (PDF)</span>
                </Button>
              </a>
            </>
          )}
        </div>
      </div>

      {isPending && (
        <div className="p-16 text-center bg-white rounded-3xl border border-black/[0.06] shadow-apple-card space-y-3">
          <Loader2 className="w-8 h-8 text-[#0071e3] animate-spin mx-auto" />
          <p className="text-sm font-semibold text-[#1d1d1f]">
            Pemeriksaan {report?.status === "QUEUED" ? "dalam antrean" : "sedang diproses"}...
          </p>
          <p className="text-xs text-[#86868b]">Halaman ini akan diperbarui otomatis saat hasil audit selesai.</p>
        </div>
      )}

      {isFailed && (
        <div className="p-4 rounded-2xl bg-[#ff3b30]/10 border border-[#ff3b30]/20 text-[#ff3b30] text-xs">
          Pemeriksaan belum dapat diselesaikan{report?.error_message ? `: ${report.error_message}` : "."} Silakan unggah
          kembali naskah atau hubungi redaksi jurnal.
        </div>
      )}

      {loading && !report && (
        <div className="p-16 text-center bg-white rounded-3xl border border-black/[0.06] shadow-apple-card space-y-3">
          <Loader2 className="w-8 h-8 text-[#0071e3] animate-spin mx-auto" />
          <p className="text-sm font-semibold text-[#1d1d1f]">Memeriksa format naskah terhadap template jurnal...</p>
          <p className="text-xs text-[#86868b]">Memeriksa ukuran kertas, margin, kolom, identitas penulis, dan sitasi.</p>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-[#ff3b30]/10 border border-[#ff3b30]/20 text-[#ff3b30] text-xs">
          {error}
        </div>
      )}

      {report && report.status === "COMPLETED" && (
        <div className="space-y-8">
          {/* Interactive Before-vs-After Visual Layout Comparison Engine */}
          {showPdfPreview && (
            <LayoutComparisonViewer report={report} />
          )}

          {/* Executive Summary Card with Vibrant Accents */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-indigo-100 shadow-xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
            <div className="flex items-center gap-4 sm:border-r sm:border-slate-100 pr-4">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shrink-0 shadow-md ${
                  report.overall_score >= 80
                    ? "bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-emerald-500/10"
                    : "bg-rose-50 text-rose-600 border border-rose-200 shadow-rose-500/10"
                }`}
              >
                {report.overall_score}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">Skor Kesesuaian</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge
                    className={`text-[11px] gap-1 font-bold ${
                      report.summary.status === "PASS"
                        ? "bg-emerald-500/10 text-emerald-700 border-emerald-300"
                        : "bg-rose-500/10 text-rose-700 border-rose-300"
                    }`}
                  >
                    {report.summary.status === "PASS" ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <XCircle className="w-3 h-3 text-rose-600" />
                    )}
                    <span>{report.summary.status === "PASS" ? "LULUS" : "REVISI"}</span>
                  </Badge>
                </div>
              </div>
            </div>

            <div className="space-y-0.5 sm:border-r sm:border-slate-100 pr-4">
              <p className="text-xs font-semibold text-slate-500">Perlu Diperbaiki</p>
              <p className="text-2xl font-black text-rose-600">{report.summary.critical_errors}</p>
              <p className="text-xs text-slate-400">Poin penting sebelum kirim</p>
            </div>

            <div className="space-y-0.5 lg:border-r lg:border-slate-100 pr-4">
              <p className="text-xs font-semibold text-slate-500">Perhatian</p>
              <p className="text-2xl font-black text-amber-500">{report.summary.warnings}</p>
              <p className="text-xs text-slate-400">Saran perbaikan format</p>
            </div>

            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-slate-500">Status Desk Review</p>
              <p className="text-xs sm:text-sm font-bold text-slate-800">
                {report.summary.status === "PASS" ? (
                  <span className="text-emerald-600 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Siap Masuk Review
                  </span>
                ) : (
                  <span className="text-rose-600 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> Perlu Perbaikan Format
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Official Format Kilat Compliance Certificate */}
          <ComplianceCertificateCard report={report} />

          {/* Interactive Format Kilat AI Academic Copilot */}
          <AICopilotWidget
            manuscriptId={resolvedParams.id}
            auditId={report.audit_id}
            initialTier="S1"
          />

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
                        ⚡ Penyesuaian Layout Otomatis (Format Kilat)
                      </h2>
                      <Badge className="bg-[#34c759] text-white text-[10px] font-semibold">
                        {report.fixed_layout.camera_ready_status || "SIAP_KIRIM"}
                      </Badge>
                      {report.template_specs?.is_custom_template && (
                        <Badge variant="outline" className="text-[10px] border-[#0071e3]/30 text-[#0071e3] bg-[#0071e3]/5">
                          Sesuai Template Jurnal
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-[#86868b] mt-0.5">
                      Layout naskah telah disesuaikan agar sesuai dengan standar {report.fixed_layout.target_format}
                    </p>
                  </div>
                </div>

                {report.fixed_layout.fixed_pdf_s3_key && (
                  <a
                    href={getFileDownloadUrl(report.fixed_layout.fixed_pdf_s3_key)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Button size="sm" className="bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-semibold rounded-full px-4 shadow-xs gap-2">
                      <Download className="w-4 h-4" />
                      <span>Download Hasil Format (PDF)</span>
                    </Button>
                  </a>
                )}
              </div>

              {/* Target Geometry Specs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-white border border-black/[0.06] shadow-xs space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[#86868b] tracking-wider">Ukuran Kertas</span>
                  <p className="text-sm font-bold text-[#1d1d1f]">
                    {report.template_specs?.page_format || "A4"}
                  </p>
                  <p className="text-[11px] text-[#86868b]">
                    {report.template_specs?.page_width_mm || 210} &times; {report.template_specs?.page_height_mm || 297} mm
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-black/[0.06] shadow-xs space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[#86868b] tracking-wider">Margin Atas &amp; Bawah</span>
                  <p className="text-sm font-bold text-[#1d1d1f]">
                    {report.template_specs?.margin_top_mm ?? 20} mm / {report.template_specs?.margin_bottom_mm ?? 20} mm
                  </p>
                  <p className="text-[11px] text-[#86868b]">Batas tepi vertikal</p>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-black/[0.06] shadow-xs space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[#86868b] tracking-wider">Margin Kiri &amp; Kanan</span>
                  <p className="text-sm font-bold text-[#1d1d1f]">
                    {report.template_specs?.margin_left_mm ?? 18} mm / {report.template_specs?.margin_right_mm ?? 18} mm
                  </p>
                  <p className="text-[11px] text-[#86868b]">Batas tepi horizontal</p>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-black/[0.06] shadow-xs space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[#86868b] tracking-wider">Jumlah Kolom</span>
                  <p className="text-sm font-bold text-[#1d1d1f] text-[#0071e3]">
                    {report.template_specs?.column_count === 2
                      ? `2 Kolom (${report.template_specs?.column_gap_mm || 6.35} mm spasi)`
                      : "1 Kolom"}
                  </p>
                  <p className="text-[11px] text-[#86868b]">Struktur kolom naskah</p>
                </div>
              </div>

              {/* Remediation Action Steps Applied */}
              {report.fixed_layout.remediation_actions && report.fixed_layout.remediation_actions.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#86868b]">
                    Penyesuaian Format Otomatis ({report.fixed_layout.remediation_actions.length})
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

          {/* Template-Driven Comparison Matrix (Target Journal Template vs Draft) */}
          <TemplateComparisonMatrix templateSpecs={report.template_specs} />

          {/* Module 1: Geometry & Layout */}
          <div className="bg-white rounded-3xl border border-black/[0.06] shadow-apple-card overflow-hidden">
            <div className="p-6 border-b border-black/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#0071e3]/10 text-[#0071e3] flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-[#1d1d1f]">1. Format Halaman &amp; Margin</h2>
                  <p className="text-xs text-[#86868b]">
                    Pengecekan ukuran kertas, margin batas tepi, dan jumlah kolom terhadap template jurnal.
                  </p>
                </div>
              </div>
              <Badge
                variant={report.modules.geometry_and_layout.pass ? "success" : "destructive"}
                className="text-[10px]"
              >
                {report.modules.geometry_and_layout.pass ? "SESUAI" : "PERLU DIPERBAIKI"}
              </Badge>
            </div>

            {report.modules.geometry_and_layout.checks.length === 0 ? (
              <div className="p-6 text-xs text-[#34c759] bg-[#34c759]/5 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Ukuran kertas, margin batas tepi, dan format kolom naskah sudah sesuai standar jurnal.</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f5f5f7] text-[#86868b] font-semibold border-b border-black/[0.06]">
                    <tr>
                      <th className="px-6 py-3">Aturan Format</th>
                      <th className="px-6 py-3">Halaman</th>
                      <th className="px-6 py-3">Standar Jurnal</th>
                      <th className="px-6 py-3">Naskah Anda</th>
                      <th className="px-6 py-3">Posisi [x, y, w, h]</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.06]">
                    {report.modules.geometry_and_layout.checks.map((c, idx) => (
                      <tr key={idx} className="hover:bg-black/[0.02]">
                        <td className="px-6 py-3.5 font-semibold text-[#ff3b30] flex items-center gap-1.5">
                          <XCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{humanizeRuleName(c.rule)}</span>
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
                  <h2 className="text-sm sm:text-base font-bold text-[#1d1d1f]">2. Pemeriksaan Anonimitas (Double-Blind)</h2>
                  <p className="text-xs text-[#86868b]">Memeriksa nama penulis, afiliasi kampus, email, dan info pendanaan agar tetap anonim saat ditinjau reviewer</p>
                </div>
              </div>
              <Badge
                variant={report.modules.anonymization.pass ? "success" : "warning"}
                className="text-[10px]"
              >
                {report.modules.anonymization.pass ? "SESUAI" : "IDENTITAS DITEMUKAN"}
              </Badge>
            </div>

            {report.modules.anonymization.leaks_found.length === 0 ? (
              <div className="p-6 text-xs text-[#34c759] bg-[#34c759]/5 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Naskah bersih. Tidak ditemukan nama penulis, afiliasi institusi, email, maupun ID peneliti.</span>
              </div>
            ) : (
              <div className="p-6 space-y-3">
                {report.modules.anonymization.leaks_found.map((l, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3.5 rounded-2xl bg-[#ff9500]/10 border border-[#ff9500]/20 text-xs">
                    <div className="flex items-center gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-[#ff9500] shrink-0" />
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white border border-[#ff9500]/30 text-[#1d1d1f] shadow-xs">
                        {humanizeLeakType(l.type)}
                      </span>
                      <span className="text-[#1d1d1f] font-mono font-medium">{l.leak}</span>
                    </div>
                    <span className="text-[#86868b] font-medium">Halaman {l.page}</span>
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
                  <h2 className="text-sm sm:text-base font-bold text-[#1d1d1f]">3. Sitasi &amp; Daftar Pustaka</h2>
                  <p className="text-xs text-[#86868b]">
                    Pengecekan kesesuaian sitasi dalam teks dengan daftar pustaka ({report.modules.citation_crosscheck.total_cited} rujukan ditemukan)
                  </p>
                </div>
              </div>
              <Badge
                variant={report.modules.citation_crosscheck.pass ? "success" : "warning"}
                className="text-[10px]"
              >
                {report.modules.citation_crosscheck.pass ? "SESUAI" : "PERLU DICEK"}
              </Badge>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Uncited references */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#86868b]">
                  Ada di Daftar Pustaka tapi Belum Dikutip ({report.modules.citation_crosscheck.uncited_references.length})
                </h3>
                {report.modules.citation_crosscheck.uncited_references.length === 0 ? (
                  <p className="text-xs text-[#34c759] flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Semua referensi di daftar pustaka telah dikutip dalam naskah.
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
                  Dikutip di Naskah tapi Belum Masuk Daftar Pustaka ({report.modules.citation_crosscheck.missing_citations.length})
                </h3>
                {report.modules.citation_crosscheck.missing_citations.length === 0 ? (
                  <p className="text-xs text-[#34c759] flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Semua sitasi dalam teks sudah tercantum di daftar pustaka.
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
