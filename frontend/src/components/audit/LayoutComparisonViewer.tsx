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
    <div className="bg-white rounded-3xl border border-black/[0.06] shadow-apple-card overflow-hidden space-y-0 transition-all duration-300">
      {/* Top Controller Bar */}
      <div className="p-4 sm:p-5 border-b border-black/[0.06] bg-[#fbfbfd] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#0071e3] text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-[#1d1d1f] tracking-tight">
                Visual Layout Comparison Engine
              </h2>
              <Badge className="bg-[#0071e3] text-white text-[10px] font-semibold">
                Interactive Audit
              </Badge>
            </div>
            <p className="text-xs text-[#86868b] mt-0.5">
              Compare Original Draft with detected violations against the Autonomously Reshaped Camera-Ready PDF.
            </p>
          </div>
        </div>

        {/* Apple HIG Segmented Mode Selector */}
        <div className="flex items-center gap-2">
          <div className="inline-flex p-1 bg-black/[0.04] rounded-full border border-black/[0.04]">
            <button
              type="button"
              onClick={() => setViewMode("split")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition flex items-center gap-1.5 ${
                viewMode === "split"
                  ? "bg-white text-[#1d1d1f] shadow-xs font-semibold"
                  : "text-[#86868b] hover:text-[#1d1d1f]"
              }`}
            >
              <SplitSquareVertical className="w-3.5 h-3.5" />
              <span>Side-by-Side</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("before")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition flex items-center gap-1.5 ${
                viewMode === "before"
                  ? "bg-white text-[#1d1d1f] shadow-xs font-semibold"
                  : "text-[#86868b] hover:text-[#1d1d1f]"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Original Draft</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("after")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition flex items-center gap-1.5 ${
                viewMode === "after"
                  ? "bg-white text-[#1d1d1f] shadow-xs font-semibold"
                  : "text-[#86868b] hover:text-[#1d1d1f]"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#0071e3]" />
              <span>⚡ Reshaped</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="p-2 rounded-full border border-black/[0.08] hover:bg-black/[0.04] text-[#86868b] hover:text-[#1d1d1f] transition"
            title={expanded ? "Standard Height" : "Expand Height"}
          >
            {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Transformation Spec Delta Bar */}
      <div className="px-5 py-3.5 bg-gradient-to-r from-[#f5f5f7] via-white to-[#f5f5f7] border-b border-black/[0.06] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#ff9500] shrink-0" />
          <span className="text-[#86868b] font-medium">Layout Grid:</span>
          <span className="text-[#1d1d1f] font-semibold flex items-center gap-1">
            {layoutViolationsCount > 0 ? "Single-Col Violation" : "Standard"}
            <ArrowRight className="w-3 h-3 text-[#86868b]" />
            <span className="text-[#0071e3] font-bold">
              {report.template_specs?.column_count || 2}-Column Reflow
            </span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#34c759] shrink-0" />
          <span className="text-[#86868b] font-medium">Template Margins:</span>
          <span className="text-[#1d1d1f] font-semibold flex items-center gap-1">
            Calibrated to {report.template_specs?.margin_top_mm ?? 20}mm / {report.template_specs?.margin_left_mm ?? 18}mm
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#0071e3] shrink-0" />
          <span className="text-[#86868b] font-medium">Double-Blind NER:</span>
          <span className="text-[#1d1d1f] font-semibold flex items-center gap-1">
            {anonymizationLeaksCount > 0 ? (
              <span className="text-[#ff3b30]">{anonymizationLeaksCount} Leaks Sanitized</span>
            ) : (
              <span className="text-[#34c759]">Protected &amp; Clean</span>
            )}
          </span>
        </div>
      </div>

      {/* Main Comparison Canvas */}
      <div
        className={`grid transition-all duration-300 ${
          viewMode === "split"
            ? "grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-black/[0.06]"
            : "grid-cols-1"
        }`}
      >
        {/* Panel 1: Original Draft (Before) */}
        {(viewMode === "split" || viewMode === "before") && (
          <div className="flex flex-col bg-white">
            {/* Window Chrome Header */}
            <div className="h-10 bg-[#f5f5f7] px-4 flex items-center justify-between border-b border-black/[0.06] text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57] border border-[#e0443e] inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e] border border-[#d89e24] inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#28c840] border border-[#1aab29] inline-block" />
                <span className="ml-2 font-medium text-[#1d1d1f]">
                  Original Submitted Draft
                </span>
              </div>
              <div className="flex items-center gap-2">
                {layoutViolationsCount > 0 ? (
                  <Badge variant="destructive" className="text-[10px] gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span>{layoutViolationsCount} Format Violations</span>
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px]">
                    Raw Upload
                  </Badge>
                )}
                {originalKey && (
                  <a
                    href={downloadUrl(originalKey)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#86868b] hover:text-[#0071e3] transition"
                    title="Open Original in New Tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>

            {/* Document Frame */}
            <div
              className={`w-full bg-[#fbfbfd] transition-all duration-300 ${
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
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center text-[#86868b] space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-black/[0.04] flex items-center justify-center text-[#86868b]">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-[#1d1d1f]">Original Draft Stored in Gateway Box Storage</p>
                    <p className="text-[11px] text-[#86868b] max-w-xs">
                      Key: {originalKey || report.manuscript_id || "submission_draft.pdf"}
                    </p>
                  </div>
                  {originalKey && (
                    <a
                      href={downloadUrl(originalKey)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Button variant="outline" size="sm" className="rounded-full text-xs gap-1.5 border-black/[0.12]">
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Raw Draft</span>
                      </Button>
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Panel Footer */}
            <div className="p-3 bg-[#fbfbfd] border-t border-black/[0.06] flex items-center justify-between text-[11px] text-[#86868b]">
              <span>Geometry: Unstandardized single/hybrid column</span>
              <span>Anonymity: Leaked contacts checked</span>
            </div>
          </div>
        )}

        {/* Panel 2: Reshaped Camera-Ready (After) */}
        {(viewMode === "split" || viewMode === "after") && (
          <div className="flex flex-col bg-white">
            {/* Window Chrome Header */}
            <div className="h-10 bg-[#f5f5f7] px-4 flex items-center justify-between border-b border-black/[0.06] text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57] border border-[#e0443e] inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e] border border-[#d89e24] inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#28c840] border border-[#1aab29] inline-block" />
                <span className="ml-2 font-medium text-[#1d1d1f] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#0071e3]" />
                  ⚡ Format Kilat Camera-Ready Output
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-[#34c759] text-white text-[10px] gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Conforming Layout</span>
                </Badge>
                {reshapedKey && (
                  <a
                    href={downloadUrl(reshapedKey)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#86868b] hover:text-[#0071e3] transition"
                    title="Open Camera-Ready in New Tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>

            {/* Document Frame */}
            <div
              className={`w-full bg-[#fbfbfd] transition-all duration-300 ${
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
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center text-[#86868b] space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#0071e3]/10 flex items-center justify-center text-[#0071e3]">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-[#1d1d1f]">Camera-Ready Layout Generation In Progress</p>
                    <p className="text-[11px] text-[#86868b] max-w-xs">
                      The automated remediation engine is reflowing columns and applying margin alignments.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Panel Footer */}
            <div className="p-3 bg-[#fbfbfd] border-t border-black/[0.06] flex items-center justify-between text-[11px] text-[#86868b]">
              <span className="text-[#34c759] font-medium flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Double-blind anonymized &amp; verified
              </span>
              {reshapedKey && (
                <a
                  href={downloadUrl(reshapedKey)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button
                    size="sm"
                    className="h-6 px-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white text-[11px] font-medium rounded-full shadow-xs gap-1"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download Reshaped PDF</span>
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

