"use client";

import { useState } from "react";
import {
  Columns,
  SplitSquareVertical,
  ArrowRight,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { PreSubmissionAuditReport } from "@/types/jms";
import { getFileDownloadUrl } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface LayoutComparisonViewerProps {
  report: PreSubmissionAuditReport;
}

export function LayoutComparisonViewer({ report }: LayoutComparisonViewerProps) {
  const [viewMode, setViewMode] = useState<"split" | "before" | "after">("split");
  const [expanded, setExpanded] = useState(false);

  const originalKey = report.original_pdf_s3_key || "";
  // "After" pane: the reshaped PDF when the reshape step ran, otherwise the annotated proof.
  const reshapedKey = report.fixed_layout?.fixed_pdf_s3_key || report.annotated_pdf_s3_key || "";

  // Downloads require auth: getFileDownloadUrl appends the session token.
  const downloadUrl = (key: string) => (key ? getFileDownloadUrl(key) : "");
  const originalUrl = originalKey ? `${downloadUrl(originalKey)}#toolbar=1&navpanes=0` : "";
  const reshapedUrl = reshapedKey ? `${downloadUrl(reshapedKey)}#toolbar=1&navpanes=0` : "";

  const layoutViolationsCount = report.modules.geometry_and_layout.checks.filter(
    (c) => !c.passed
  ).length;

  const anonymizationLeaksCount = report.modules.anonymization.leaks_found.length;

  return (
    <div className="bg-surface-container-low rounded-3xl border border-outline-variant shadow-elevation-1 overflow-hidden space-y-0 transition-all duration-300">
      {/* Top Controller Bar */}
      <div className="p-4 sm:p-5 border-b border-outline-variant bg-surface-container-low flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary text-on-primary flex items-center justify-center shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-on-surface tracking-tight">
                Perbandingan Layout Naskah
              </h2>
              <Badge className="bg-primary text-on-primary text-[10px] font-semibold">
                Tampilan Dokumen
              </Badge>
            </div>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Bandingkan naskah draft asli Anda dengan dokumen yang telah disesuaikan dengan template jurnal.
            </p>
          </div>
        </div>

        {/* Apple HIG Segmented Mode Selector */}
        <div className="flex items-center gap-2">
          <div className="inline-flex p-1 bg-on-surface/[0.04] rounded-full border border-outline-variant">
            <button
              type="button"
              onClick={() => setViewMode("split")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition flex items-center gap-1.5 ${
                viewMode === "split"
                  ? "bg-surface-container-low text-on-surface shadow-xs font-semibold"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <SplitSquareVertical className="w-3.5 h-3.5" />
              <span>Berdampingan</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("before")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition flex items-center gap-1.5 ${
                viewMode === "before"
                  ? "bg-surface-container-low text-on-surface shadow-xs font-semibold"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Naskah Asli</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("after")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition flex items-center gap-1.5 ${
                viewMode === "after"
                  ? "bg-surface-container-low text-on-surface shadow-xs font-semibold"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>⚡ Hasil Format</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="p-2 rounded-full border border-outline-variant hover:bg-on-surface/[0.04] text-on-surface-variant hover:text-on-surface transition"
            title={expanded ? "Tinggi Standar" : "Perbesar Tampilan"}
          >
            {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Transformation Spec Delta Bar */}
      <div className="px-5 py-3.5 bg-surface-container border-b border-outline-variant grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-warning shrink-0" />
          <span className="text-on-surface-variant font-medium">Format Kolom:</span>
          <span className="text-on-surface font-semibold flex items-center gap-1">
            {layoutViolationsCount > 0 ? "1 Kolom (Perlu disesuaikan)" : "Sesuai"}
            <ArrowRight className="w-3 h-3 text-on-surface-variant" />
            <span className="text-primary font-bold">
              {report.template_specs?.column_count === 2 ? "2 Kolom" : "1 Kolom"}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-success shrink-0" />
          <span className="text-on-surface-variant font-medium">Standar Margin:</span>
          <span className="text-on-surface font-semibold flex items-center gap-1">
            Atas {report.template_specs?.margin_top_mm ?? 20} mm / Kiri {report.template_specs?.margin_left_mm ?? 18} mm
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
          <span className="text-on-surface-variant font-medium">Identitas Penulis:</span>
          <span className="text-on-surface font-semibold flex items-center gap-1">
            {anonymizationLeaksCount > 0 ? (
              <span className="text-error">{anonymizationLeaksCount} Identitas Ditemukan</span>
            ) : (
              <span className="text-success">Sudah Anonim</span>
            )}
          </span>
        </div>
      </div>

      {/* Main Comparison Canvas */}
      <div
        className={`grid transition-all duration-300 ${
          viewMode === "split"
            ? "grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-outline-variant"
            : "grid-cols-1"
        }`}
      >
        {/* Panel 1: Original Draft (Before) */}
        {(viewMode === "split" || viewMode === "before") && (
          <div className="flex flex-col bg-surface-container-low">
            {/* Window Chrome Header */}
            <div className="h-10 bg-surface-container px-4 flex items-center justify-between border-b border-outline-variant text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-error border border-error inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-warning border border-warning inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-success border border-success inline-block" />
                <span className="ml-2 font-medium text-on-surface">
                  Naskah Asli (Draft)
                </span>
              </div>
              <div className="flex items-center gap-2">
                {layoutViolationsCount > 0 ? (
                  <Badge variant="destructive" className="text-[10px] gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span>{layoutViolationsCount} Perlu Disesuaikan</span>
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px]">
                    Naskah Awal
                  </Badge>
                )}
                {originalKey && (
                  <a
                    href={downloadUrl(originalKey)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-on-surface-variant hover:text-primary transition"
                    title="Buka Naskah Asli di Tab Baru"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>

            {/* Document Frame */}
            <div
              className={`w-full bg-surface-container-low transition-all duration-300 ${
                expanded ? "h-[850px]" : "h-[560px]"
              }`}
            >
              {originalUrl ? (
                <iframe
                  src={originalUrl}
                  className="w-full h-full border-0"
                  title="Original Manuscript Draft Preview"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center text-on-surface-variant space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-on-surface/[0.04] flex items-center justify-center text-on-surface-variant">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-on-surface">Naskah Draft Tersimpan di Penyimpanan Sistem</p>
                    <p className="text-[11px] text-on-surface-variant max-w-xs">
                      ID: {originalKey || report.manuscript_id || "submission_draft.pdf"}
                    </p>
                  </div>
                  {originalKey && (
                    <a
                      href={downloadUrl(originalKey)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Button variant="outline" size="sm" className="rounded-full text-xs gap-1.5 border-outline-variant">
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Naskah Asli</span>
                      </Button>
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Panel Footer */}
            <div className="p-3 bg-surface-container-low border-t border-outline-variant flex items-center justify-between text-[11px] text-on-surface-variant">
              <span>Layout: Naskah asli</span>
              <span>Anonimitas: Pengecekan selesai</span>
            </div>
          </div>
        )}

        {/* Panel 2: Reshaped Camera-Ready (After) */}
        {(viewMode === "split" || viewMode === "after") && (
          <div className="flex flex-col bg-surface-container-low">
            {/* Window Chrome Header */}
            <div className="h-10 bg-surface-container px-4 flex items-center justify-between border-b border-outline-variant text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-error border border-error inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-warning border border-warning inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-success border border-success inline-block" />
                <span className="ml-2 font-medium text-on-surface flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  ⚡ Format Kilat Siap Kirim
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-success text-on-success text-[10px] gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Format Sesuai</span>
                </Badge>
                {reshapedKey && (
                  <a
                    href={downloadUrl(reshapedKey)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-on-surface-variant hover:text-primary transition"
                    title="Buka Dokumen di Tab Baru"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>

            {/* Document Frame */}
            <div
              className={`w-full bg-surface-container-low transition-all duration-300 ${
                expanded ? "h-[850px]" : "h-[560px]"
              }`}
            >
              {reshapedUrl ? (
                <iframe
                  src={reshapedUrl}
                  className="w-full h-full border-0"
                  title="Reshaped Camera-Ready PDF Preview"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center text-on-surface-variant space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-on-surface">Sedang Menyesuaikan Layout...</p>
                    <p className="text-[11px] text-on-surface-variant max-w-xs">
                      Sistem sedang merapikan kolom dan margin sesuai standar template jurnal.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Panel Footer */}
            <div className="p-3 bg-surface-container-low border-t border-outline-variant flex items-center justify-between text-[11px] text-on-surface-variant">
              <span className="text-success font-medium flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Identitas penulis disamarkan
              </span>
              {reshapedKey && (
                <a
                  href={downloadUrl(reshapedKey)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button
                    size="sm"
                    className="h-6 px-2.5 bg-primary hover:bg-primary text-on-primary text-[11px] font-medium rounded-full shadow-xs gap-1"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download PDF Hasil Format</span>
                  </Button>
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

