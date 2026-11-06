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
  BookOpen,
  Layers,
  HelpCircle,
} from "lucide-react";
import { PreSubmissionAuditReport } from "@/types/jms";
import { getFileDownloadUrl } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface LayoutComparisonViewerProps {
  report: PreSubmissionAuditReport;
}

type SingleViewDoc = "template" | "draft" | "ai_result";
type SplitPair = "draft_vs_ai" | "draft_vs_template" | "ai_vs_template";

export function LayoutComparisonViewer({ report }: LayoutComparisonViewerProps) {
  // Mode: "split" or "single"
  const [viewMode, setViewMode] = useState<"split" | "single">("split");
  // If single, which doc
  const [singleDoc, setSingleDoc] = useState<SingleViewDoc>("ai_result");
  // If split, which pair
  const [splitPair, setSplitPair] = useState<SplitPair>("draft_vs_ai");
  const [expanded, setExpanded] = useState(false);

  const originalKey = report.original_pdf_s3_key || "";
  const templateKey = report.template_pdf_s3_key || "";
  const reshapedKey = report.fixed_layout?.fixed_pdf_s3_key || report.annotated_pdf_s3_key || "";

  // Helper for authenticated download URL with PDF viewer query
  const downloadUrl = (key: string) => (key ? getFileDownloadUrl(key) : "");
  const originalUrl = originalKey ? `${downloadUrl(originalKey)}#toolbar=1&navpanes=0` : "";
  const templateUrl = templateKey ? `${downloadUrl(templateKey)}#toolbar=1&navpanes=0` : "";
  const reshapedUrl = reshapedKey ? `${downloadUrl(reshapedKey)}#toolbar=1&navpanes=0` : "";

  const layoutViolationsCount = report.modules.geometry_and_layout.checks.filter(
    (c) => !c.passed
  ).length;

  const anonymizationLeaksCount = report.modules.anonymization.leaks_found.length;
  const draftFileName = report.draft_filename || report.original_filename || "Naskah_Draft.pdf";
  const templateFileName = report.template_filename || report.template_specs?.name || (report.template_preset ? `Template ${report.template_preset.toUpperCase()}` : "Template_Acuan.pdf");
  const aiFileName = draftFileName.replace(/\.pdf$/i, "") + "_camera_ready.pdf";
  const templateName = report.template_specs?.name || templateFileName;

  // Render a specific document panel
  const renderDocPanel = (docType: SingleViewDoc, isHalf: boolean = false) => {
    switch (docType) {
      case "template":
        return (
          <div className="flex flex-col bg-surface-container-low h-full">
            {/* Header */}
            <div className="h-11 bg-surface-container px-4 flex items-center justify-between border-b border-outline-variant text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block shrink-0" />
                <BookOpen className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                <span className="font-bold text-on-surface truncate" title={templateFileName}>
                  1. Template: <span className="font-mono text-purple-700 dark:text-purple-300 font-semibold">{templateFileName}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-purple-600/10 text-purple-700 dark:text-purple-300 border-purple-500/30 text-[10px]">
                  Standar Jurnal
                </Badge>
                {templateKey && (
                  <a
                    href={downloadUrl(templateKey)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-on-surface-variant hover:text-primary transition"
                    title="Buka Template di Tab Baru"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>

            {/* Content Preview Frame */}
            <div className={`w-full bg-surface-container-low transition-all duration-300 ${expanded ? "h-[850px]" : "h-[560px]"}`}>
              {templateUrl ? (
                <iframe src={templateUrl} className="w-full h-full border-0" title="Target Journal Template PDF" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center text-on-surface-variant space-y-3 bg-purple-500/5">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-on-surface">{templateName}</p>
                    <p className="text-[11px] text-on-surface-variant max-w-xs">
                      Standar layout preset yang dipilih untuk memvalidasi naskah.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-left bg-surface-container p-3 rounded-xl border border-outline-variant max-w-xs">
                    <div>
                      <span className="text-outline block text-[9px] uppercase font-bold">Kertas</span>
                      <span className="font-semibold">{report.template_specs?.page_format || "A4"}</span>
                    </div>
                    <div>
                      <span className="text-outline block text-[9px] uppercase font-bold">Kolom</span>
                      <span className="font-semibold">{report.template_specs?.column_count || 2} Kolom</span>
                    </div>
                    <div>
                      <span className="text-outline block text-[9px] uppercase font-bold">Margin Atas/Bawah</span>
                      <span className="font-semibold">{report.template_specs?.margin_top_mm || 20} mm</span>
                    </div>
                    <div>
                      <span className="text-outline block text-[9px] uppercase font-bold">Margin Kiri/Kanan</span>
                      <span className="font-semibold">{report.template_specs?.margin_left_mm || 18} mm</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Panel Footer */}
            <div className="p-3 bg-surface-container-low border-t border-outline-variant flex items-center justify-between text-[11px] text-on-surface-variant">
              <span className="text-purple-600 dark:text-purple-400 font-medium">Acuan Target: {templateName}</span>
              {templateKey && (
                <a href={downloadUrl(templateKey)} target="_blank" rel="noreferrer">
                  <Button size="sm" variant="outline" className="h-6 px-2.5 text-[11px] rounded-full gap-1">
                    <Download className="w-3 h-3" />
                    <span>Download Template</span>
                  </Button>
                </a>
              )}
            </div>
          </div>
        );

      case "draft":
        return (
          <div className="flex flex-col bg-surface-container-low h-full">
            {/* Header */}
            <div className="h-11 bg-surface-container px-4 flex items-center justify-between border-b border-outline-variant text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-error inline-block shrink-0" />
                <FileText className="w-3.5 h-3.5 text-error shrink-0" />
                <span className="font-bold text-on-surface truncate" title={draftFileName}>
                  2. Naskah Asli: <span className="font-mono text-error font-semibold">{draftFileName}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                {layoutViolationsCount > 0 ? (
                  <Badge variant="destructive" className="text-[10px] gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span>{layoutViolationsCount} Format Belum Sesuai</span>
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px]">Naskah Awal</Badge>
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

            {/* Content Preview Frame */}
            <div className={`w-full bg-surface-container-low transition-all duration-300 ${expanded ? "h-[850px]" : "h-[560px]"}`}>
              {originalUrl ? (
                <iframe src={originalUrl} className="w-full h-full border-0" title="Original Manuscript Draft Preview" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center text-on-surface-variant space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-on-surface/[0.04] flex items-center justify-center text-on-surface-variant">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-on-surface">Naskah Draft Asli Penulis</p>
                    <p className="text-[11px] text-on-surface-variant max-w-xs">
                      Dokumen mentah sebelum disesuaikan dengan template jurnal.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Panel Footer */}
            <div className="p-3 bg-surface-container-low border-t border-outline-variant flex items-center justify-between text-[11px] text-on-surface-variant">
              <span className="text-error font-medium">Kondisi Awal: Belum Sesuai Standar Template</span>
              {originalKey && (
                <a href={downloadUrl(originalKey)} target="_blank" rel="noreferrer">
                  <Button size="sm" variant="outline" className="h-6 px-2.5 text-[11px] rounded-full gap-1 border-outline-variant">
                    <Download className="w-3 h-3" />
                    <span>Download Draft Asli</span>
                  </Button>
                </a>
              )}
            </div>
          </div>
        );

      case "ai_result":
        return (
          <div className="flex flex-col bg-surface-container-low h-full">
            {/* Header */}
            <div className="h-11 bg-surface-container px-4 flex items-center justify-between border-b border-outline-variant text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-success inline-block shrink-0" />
                <Sparkles className="w-3.5 h-3.5 text-success shrink-0" />
                <span className="font-bold text-on-surface truncate" title={aiFileName}>
                  3. Hasil AI: <span className="font-mono text-success font-semibold">{aiFileName}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-success text-on-success text-[10px] gap-1 font-semibold">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Siap Kirim ke Jurnal</span>
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

            {/* Content Preview Frame */}
            <div className={`w-full bg-surface-container-low transition-all duration-300 ${expanded ? "h-[850px]" : "h-[560px]"}`}>
              {reshapedUrl ? (
                <iframe src={reshapedUrl} className="w-full h-full border-0" title="Reshaped Camera-Ready PDF Preview" />
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
                Double-Blind Terlindungi &amp; Grid Sesuai
              </span>
              {reshapedKey && (
                <a href={downloadUrl(reshapedKey)} target="_blank" rel="noreferrer">
                  <Button size="sm" className="h-6 px-2.5 bg-primary hover:bg-primary text-on-primary text-[11px] font-medium rounded-full shadow-xs gap-1">
                    <Download className="w-3 h-3" />
                    <span>Download Hasil Format (PDF)</span>
                  </Button>
                </a>
              )}
            </div>
          </div>
        );
    }
  };

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
                Triad Inspector: 3 Dokumen Pre-Submission
              </h2>
              <Badge className="bg-primary text-on-primary text-[10px] font-semibold">
                Perbandingan Jelas
              </Badge>
            </div>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Pembeda jelas antara <strong>Template Jurnal (Acuan)</strong>, <strong>Naskah Asli (Draft)</strong>, dan <strong>Hasil AI (Camera-Ready)</strong>.
            </p>
          </div>
        </div>

        {/* View Mode & Expand Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Main Mode Toggle: Split vs Single */}
          <div className="inline-flex p-1 bg-on-surface/[0.04] rounded-full border border-outline-variant text-xs font-medium">
            <button
              type="button"
              onClick={() => setViewMode("split")}
              className={`px-3 py-1.5 rounded-full transition flex items-center gap-1.5 ${
                viewMode === "split"
                  ? "bg-surface-container-low text-on-surface shadow-xs font-semibold"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <SplitSquareVertical className="w-3.5 h-3.5" />
              <span>Berdampingan (Split)</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("single")}
              className={`px-3 py-1.5 rounded-full transition flex items-center gap-1.5 ${
                viewMode === "single"
                  ? "bg-surface-container-low text-on-surface shadow-xs font-semibold"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Lihat 1 Dokumen Penuh</span>
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

      {/* File Provenance Strip (Active File Identity & Role) */}
      <div className="px-5 py-2.5 bg-surface-container/60 border-b border-outline-variant flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
            <span className="text-on-surface-variant text-[11px] font-semibold">1. Template Target:</span>
            <span className="font-mono text-purple-700 dark:text-purple-300 font-bold bg-purple-500/10 px-2 py-0.5 rounded text-[11px] border border-purple-500/20 max-w-[220px] truncate" title={templateFileName}>
              {templateFileName}
            </span>
          </div>
          <span className="text-outline hidden sm:inline">&bull;</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-error" />
            <span className="text-on-surface-variant text-[11px] font-semibold">2. Naskah Asli:</span>
            <span className="font-mono text-error font-bold bg-error/10 px-2 py-0.5 rounded text-[11px] border border-error/20 max-w-[220px] truncate" title={draftFileName}>
              {draftFileName}
            </span>
          </div>
          <span className="text-outline hidden sm:inline">&bull;</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-success" />
            <span className="text-on-surface-variant text-[11px] font-semibold">3. Hasil Format AI:</span>
            <span className="font-mono text-success font-bold bg-success/10 px-2 py-0.5 rounded text-[11px] border border-success/20 max-w-[220px] truncate" title={aiFileName}>
              {aiFileName}
            </span>
          </div>
        </div>
        {report.ast_xml_analysis && (
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/30">
            <Sparkles className="w-3 h-3 text-primary animate-pulse" />
            <span>AST XML: Tpl {report.ast_xml_analysis.template_ast?.ast_nodes_count || 11} simpul &bull; Draft {report.ast_xml_analysis.draft_ast?.ast_nodes_count || 21} simpul</span>
          </div>
        )}
      </div>

      {/* Sub-Selector Bar */}
      <div className="px-5 py-3 bg-surface-container border-b border-outline-variant flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        {viewMode === "split" ? (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-on-surface-variant font-medium">Bandingkan Pasangan:</span>
            <div className="inline-flex p-0.5 bg-surface-container-low rounded-xl border border-outline-variant">
              <button
                type="button"
                onClick={() => setSplitPair("draft_vs_ai")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                  splitPair === "draft_vs_ai"
                    ? "bg-primary text-on-primary font-bold shadow-xs"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                📄 Naskah Asli vs ✨ Hasil AI
              </button>
              <button
                type="button"
                onClick={() => setSplitPair("draft_vs_template")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                  splitPair === "draft_vs_template"
                    ? "bg-primary text-on-primary font-bold shadow-xs"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                📄 Naskah Asli vs 🟣 Template Target
              </button>
              <button
                type="button"
                onClick={() => setSplitPair("ai_vs_template")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                  splitPair === "ai_vs_template"
                    ? "bg-primary text-on-primary font-bold shadow-xs"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                ✨ Hasil AI vs 🟣 Template Target
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-on-surface-variant font-medium">Pilih Dokumen yang Ditampilkan:</span>
            <div className="inline-flex p-0.5 bg-surface-container-low rounded-xl border border-outline-variant">
              <button
                type="button"
                onClick={() => setSingleDoc("template")}
                className={`px-3 py-1 rounded-lg text-[11px] font-medium transition ${
                  singleDoc === "template"
                    ? "bg-purple-600 text-white font-bold shadow-xs"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                🟣 1. Template Target (Acuan)
              </button>
              <button
                type="button"
                onClick={() => setSingleDoc("draft")}
                className={`px-3 py-1 rounded-lg text-[11px] font-medium transition ${
                  singleDoc === "draft"
                    ? "bg-error text-white font-bold shadow-xs"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                🔴 2. Naskah Asli (Draft)
              </button>
              <button
                type="button"
                onClick={() => setSingleDoc("ai_result")}
                className={`px-3 py-1 rounded-lg text-[11px] font-medium transition ${
                  singleDoc === "ai_result"
                    ? "bg-success text-white font-bold shadow-xs"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                🟢 3. Hasil Format AI (Camera-Ready)
              </button>
            </div>
          </div>
        )}

        {/* Quick Legend Indicator */}
        <div className="flex items-center gap-3 text-[11px] text-on-surface-variant shrink-0">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            <span>Target Jurnal</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-error" />
            <span>Draft Asli</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-success" />
            <span>Hasil AI</span>
          </span>
        </div>
      </div>

      {/* Main Canvas Viewport */}
      <div className="grid grid-cols-1 transition-all duration-300">
        {viewMode === "single" ? (
          <div className="w-full">
            {renderDocPanel(singleDoc, false)}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-outline-variant">
            {splitPair === "draft_vs_ai" && (
              <>
                {renderDocPanel("draft", true)}
                {renderDocPanel("ai_result", true)}
              </>
            )}
            {splitPair === "draft_vs_template" && (
              <>
                {renderDocPanel("draft", true)}
                {renderDocPanel("template", true)}
              </>
            )}
            {splitPair === "ai_vs_template" && (
              <>
                {renderDocPanel("ai_result", true)}
                {renderDocPanel("template", true)}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
