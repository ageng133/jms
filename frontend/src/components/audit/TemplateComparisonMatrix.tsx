"use client";

import React from "react";
import {
  FileText,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  BookOpen,
  Layers,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { TemplateSpecs } from "@/types/jms";
import { Badge } from "@/components/ui/badge";

interface TemplateComparisonMatrixProps {
  templateSpecs?: TemplateSpecs;
  originalTemplateName?: string;
}

export function TemplateComparisonMatrix({
  templateSpecs,
  originalTemplateName,
}: TemplateComparisonMatrixProps) {
  if (!templateSpecs) return null;

  const isGuideline = templateSpecs.template_type === "AUTHOR_GUIDELINES";
  const matrix = templateSpecs.comparison_matrix || [];

  return (
    <div className="bg-surface-container-low rounded-3xl border border-outline-variant shadow-elevation-1 overflow-hidden space-y-0 transition-all">
      {/* Header Banner */}
      <div className="p-6 bg-primary-container text-on-primary-container relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-surface/40 text-on-primary-container border border-on-primary-container/15">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                Pemeriksaan Format Jurnal
              </span>
              <Badge
                className={`text-xs font-semibold px-2.5 py-0.5 ${
                  isGuideline
                    ? "bg-warning-container text-on-warning-container"
                    : "bg-success-container text-on-success-container"
                }`}
              >
                {templateSpecs.template_type_label || (isGuideline ? "Pedoman Penulisan" : "Contoh Artikel Jurnal")}
              </Badge>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-on-primary-container flex items-center gap-2">
              Perbandingan Naskah vs Template Jurnal
            </h2>
            <p className="text-xs text-on-primary-container/70">
              Hasil pengecekan naskah Anda terhadap template jurnal yang diunggah{" "}
              {originalTemplateName && <span className="font-semibold text-on-primary-container">({originalTemplateName})</span>}.
            </p>
          </div>

          <div className="bg-surface/30 backdrop-blur-md rounded-2xl p-3.5 border border-on-primary-container/15 text-xs text-right shrink-0">
            <span className="text-on-primary-container/70 text-[10px] uppercase font-bold tracking-wider block">Sumber Acuan</span>
            <span className="font-bold text-on-primary-container text-sm">
              {templateSpecs.extraction_mode === "TEXTUAL_GUIDELINE_PARSER"
                ? "Pedoman Penulisan (Teks)"
                : "Contoh Artikel (Layout)"}
            </span>
          </div>
        </div>

        {/* Extracted Rules Summary Chips */}
        {templateSpecs.extracted_rules_summary && templateSpecs.extracted_rules_summary.length > 0 && (
          <div className="mt-4 pt-4 border-t border-on-primary-container/10 flex flex-wrap gap-2">
            <span className="text-[11px] font-semibold text-on-primary-container/80 py-1 mr-1">
              Aturan Template:
            </span>
            {templateSpecs.extracted_rules_summary.map((rule, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] bg-surface/30 text-on-primary-container/70 border border-on-primary-container/10"
              >
                <CheckCircle2 className="w-3 h-3 text-success shrink-0" />
                {rule}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Comparison Matrix Table */}
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-on-surface">
              Perbandingan Format Dokumen
            </h3>
          </div>
          <span className="text-xs text-on-surface-variant font-medium">
            {matrix.length} Poin Pengecekan
          </span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-outline-variant shadow-2xs">
          <table className="w-full text-xs text-left">
            <thead className="bg-surface-container border-b border-outline-variant text-on-surface-variant font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Format</th>
                <th className="py-3 px-4">Standar Jurnal</th>
                <th className="py-3 px-4">Naskah Anda</th>
                <th className="py-3 px-4">Status &amp; Saran Perbaikan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant font-normal">
              {matrix.length > 0 ? (
                matrix.map((row, idx) => {
                  const isMatch = row.status === "MATCH";
                  const isBreach = row.status === "BREACH";
                  const isWarning = row.status === "WARNING";

                  return (
                    <tr
                      key={idx}
                      className={`hover:bg-surface-container/70 transition ${
                        isBreach ? "bg-error-container/30" : isWarning ? "bg-warning-container/20" : ""
                      }`}
                    >
                      <td className="py-3.5 px-4 font-semibold text-on-surface">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                          <span>{row.rule_name}</span>
                        </div>
                        <span className="text-[10px] text-outline font-normal ml-4 block">
                          Kategori: {row.category}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-medium text-on-surface">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-surface-container-high border border-outline-variant text-on-surface">
                          {row.target_spec}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-medium">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md border ${
                            isMatch
                              ? "bg-success-container/60 text-on-success-container border-success/30"
                              : isBreach
                              ? "bg-error-container/60 text-on-error-container border-error/30 font-bold"
                              : "bg-surface-container-high text-on-surface border-outline-variant"
                          }`}
                        >
                          {row.draft_actual}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <Badge
                            className={`text-[10px] font-bold shrink-0 ${
                              isMatch
                                ? "bg-success-container/60 text-on-success-container border-success/30"
                                : isBreach
                                ? "bg-error-container/60 text-on-error-container border-error/50"
                                : isWarning
                                ? "bg-warning-container/60 text-on-warning-container border-warning/50"
                                : "bg-surface-container-high text-on-surface-variant border-outline-variant"
                            }`}
                          >
                            {isMatch ? (
                              <CheckCircle2 className="w-3 h-3 mr-1 text-success" />
                            ) : isBreach ? (
                              <XCircle className="w-3 h-3 mr-1 text-error" />
                            ) : isWarning ? (
                              <AlertTriangle className="w-3 h-3 mr-1 text-warning" />
                            ) : (
                              <Info className="w-3 h-3 mr-1 text-primary" />
                            )}
                            {isMatch
                              ? "Sesuai"
                              : isBreach
                              ? "Perlu Diperbaiki"
                              : isWarning
                              ? "Periksa"
                              : "Info"}
                          </Badge>

                          <span className="text-on-surface-variant text-[11px] leading-tight">
                            {row.delta_note || (isMatch ? "Sesuai standar template" : "Perlu perbaikan")}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-outline text-xs">
                    Memuat hasil perbandingan template...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Helpful Tips Footer */}
        <div className="p-3.5 bg-primary-container/70 border border-primary/20 rounded-2xl flex items-center justify-between text-xs text-on-primary-container">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
            <span>
              <strong>Tips:</strong> Perbaiki poin yang bertanda merah agar naskah siap dikirim ke editor jurnal.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

