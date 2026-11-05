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
    <div className="bg-white rounded-3xl border border-black/[0.08] shadow-apple-card overflow-hidden space-y-0 transition-all">
      {/* Header Banner */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Template-Driven AI Audit
              </span>
              <Badge
                className={`text-xs font-semibold px-2.5 py-0.5 ${
                  isGuideline
                    ? "bg-amber-500/20 text-amber-300 border-amber-400/30"
                    : "bg-emerald-500/20 text-emerald-300 border-emerald-400/30"
                }`}
              >
                {templateSpecs.template_type_label || (isGuideline ? "Pedoman / Aturan Penulisan" : "Contoh Dokumen Jurnal")}
              </Badge>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Komparasi Draft vs Template Jurnal Tujuan
            </h2>
            <p className="text-xs text-slate-300">
              Audit dianalisis langsung terhadap file template jurnal yang Anda unggah{" "}
              {originalTemplateName && <span className="font-semibold text-white">({originalTemplateName})</span>},
              bukan format predefined generik.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/15 text-xs text-right shrink-0">
            <span className="text-slate-300 text-[10px] uppercase font-bold tracking-wider block">Mode Ekstraksi</span>
            <span className="font-bold text-white text-sm">
              {templateSpecs.extraction_mode === "TEXTUAL_GUIDELINE_PARSER"
                ? "Aturan Teks Pedoman (NLP)"
                : "Geometri & Tipografi Dokumen"}
            </span>
          </div>
        </div>

        {/* Extracted Rules Summary Chips */}
        {templateSpecs.extracted_rules_summary && templateSpecs.extracted_rules_summary.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap gap-2">
            <span className="text-[11px] font-semibold text-indigo-300 py-1 mr-1">
              DNA Template Terdeteksi:
            </span>
            {templateSpecs.extracted_rules_summary.map((rule, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] bg-white/10 text-slate-200 border border-white/10"
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
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
            <Layers className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Matriks Audit Komparatif (Spesifikasi Jurnal vs Naskah Anda)
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Evaluasi Berpasangan ({matrix.length} Parameter)
          </span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Parameter Format</th>
                <th className="py-3 px-4">Target Template Jurnal Terunggah</th>
                <th className="py-3 px-4">Kondisi Draft Naskah Anda</th>
                <th className="py-3 px-4">Status &amp; Rekomendasi Deviasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal">
              {matrix.length > 0 ? (
                matrix.map((row, idx) => {
                  const isMatch = row.status === "MATCH";
                  const isBreach = row.status === "BREACH";
                  const isWarning = row.status === "WARNING";

                  return (
                    <tr
                      key={idx}
                      className={`hover:bg-slate-50/70 transition ${
                        isBreach ? "bg-rose-50/30" : isWarning ? "bg-amber-50/20" : ""
                      }`}
                    >
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                          <span>{row.rule_name}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-normal ml-4 block">
                          Kategori: {row.category}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-medium text-slate-800">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-800">
                          {row.target_spec}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-medium">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md border ${
                            isMatch
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : isBreach
                              ? "bg-rose-50 text-rose-800 border-rose-200 font-bold"
                              : "bg-slate-100 text-slate-800 border-slate-200"
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
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : isBreach
                                ? "bg-rose-50 text-rose-700 border-rose-300"
                                : isWarning
                                ? "bg-amber-50 text-amber-700 border-amber-300"
                                : "bg-slate-100 text-slate-700 border-slate-200"
                            }`}
                          >
                            {isMatch ? (
                              <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                            ) : isBreach ? (
                              <XCircle className="w-3 h-3 mr-1 text-rose-600" />
                            ) : isWarning ? (
                              <AlertTriangle className="w-3 h-3 mr-1 text-amber-600" />
                            ) : (
                              <Info className="w-3 h-3 mr-1 text-indigo-600" />
                            )}
                            {row.status}
                          </Badge>

                          <span className="text-slate-600 text-[11px] leading-tight">
                            {row.delta_note || (isMatch ? "Sesuai template tujuan" : "Perlu penyesuaian")}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400 text-xs">
                    Memuat matriks perbandingan template...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Unique Value Footer */}
        <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex items-center justify-between text-xs text-indigo-900">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              <strong>Keunggulan Format Kilat:</strong> Kami memeriksa naskah Anda terhadap aturan &amp; contoh nyata jurnal sasaran, memastikan kesesuaian sebelum submission ke dewan editor.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
