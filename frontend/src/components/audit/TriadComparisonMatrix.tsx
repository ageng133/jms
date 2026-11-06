"use client";

import React from "react";
import {
  FileText,
  Sparkles,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  ArrowRight,
  Layers,
} from "lucide-react";
import { PreSubmissionAuditReport } from "@/types/jms";
import { Badge } from "@/components/ui/badge";

interface TriadComparisonMatrixProps {
  report: PreSubmissionAuditReport;
}

export function TriadComparisonMatrix({ report }: TriadComparisonMatrixProps) {
  const specs = report.template_specs;
  const fixed = report.fixed_layout;
  const checks = report.modules.geometry_and_layout.checks;
  const leaks = report.modules.anonymization.leaks_found;
  const citations = report.modules.citation_crosscheck;

  // Extract actual draft measurements from checks
  const colCheck = checks.find((c) => c.rule === "COLUMN_LAYOUT");
  const topCheck = checks.find((c) => c.rule === "MARGIN_TOP");
  const leftCheck = checks.find((c) => c.rule === "MARGIN_LEFT");
  const dimCheck = checks.find((c) => c.rule === "PAGE_DIMENSIONS");
  const structCheck = checks.find((c) => c.rule === "SECTION_STRUCTURE");

  const draftCols = colCheck ? colCheck.actual : `${specs?.column_count || 1} Kolom`;
  const draftMarginTop = topCheck ? topCheck.actual : `${specs?.margin_top_mm || 20} mm`;
  const draftMarginLeft = leftCheck ? leftCheck.actual : `${specs?.margin_left_mm || 18} mm`;
  const draftPaper = dimCheck ? dimCheck.actual : (specs?.page_format || "A4");

  const targetCols = specs?.column_count === 2 ? `2 Kolom (${specs.column_gap_mm || 6.35} mm spasi)` : "1 Kolom";
  const targetMargin = `${specs?.margin_top_mm || 20} mm (T) / ${specs?.margin_left_mm || 18} mm (L)`;
  const targetPaper = `${specs?.page_format || "A4"} (${specs?.page_width_mm || 210}x${specs?.page_height_mm || 297} mm)`;

  const aiCols = fixed?.column_count ? `${fixed.column_count} Kolom` : targetCols;
  const aiMargin = fixed?.target_margins_mm
    ? `${fixed.target_margins_mm.top} mm (T) / ${fixed.target_margins_mm.left} mm (L)`
    : targetMargin;
  const aiPaper = fixed?.target_format || specs?.page_format || "A4";

  return (
    <div className="bg-surface-container-low rounded-3xl border border-primary/20 shadow-elevation-1 overflow-hidden space-y-0">
      {/* Header */}
      <div className="p-5 sm:p-6 bg-surface-container border-b border-outline-variant flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary text-on-primary flex items-center justify-center shadow-xs">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-on-surface tracking-tight">
                Matriks Triad: Perbandingan On-Point 3 Dokumen
              </h2>
              <Badge className="bg-primary text-on-primary text-[10px]">
                Ringkasan Langsung
              </Badge>
            </div>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Identifikasi langsung perbedaan antara <strong>Naskah Asli</strong>, <strong>Template Target</strong>, dan <strong>Hasil Penyesuaian AI</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 font-bold border border-purple-500/20">
            🟣 1. Template Acuan
          </span>
          <span className="px-3 py-1 rounded-full bg-error/10 text-error font-bold border border-error/20">
            🔴 2. Naskah Asli
          </span>
          <span className="px-3 py-1 rounded-full bg-success/10 text-success font-bold border border-success/20">
            🟢 3. Hasil AI
          </span>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-high border-b border-outline-variant text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
              <th className="py-3 px-4 w-1/5">Kriteria Format</th>
              <th className="py-3 px-4 w-1/4 bg-purple-500/5 text-purple-700 dark:text-purple-300">
                🟣 Template Target (Acuan)
              </th>
              <th className="py-3 px-4 w-1/4 bg-error/5 text-error">
                🔴 Naskah Asli (Draft)
              </th>
              <th className="py-3 px-4 w-1/4 bg-success/5 text-success">
                🟢 Hasil Penyesuaian AI
              </th>
              <th className="py-3 px-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {/* 1. Ukuran Kertas */}
            <tr className="hover:bg-surface-container/40 transition">
              <td className="py-3.5 px-4 font-bold text-on-surface">
                1. Ukuran Kertas &amp; Standar
              </td>
              <td className="py-3.5 px-4 bg-purple-500/5 font-medium text-on-surface">
                <span className="font-bold text-purple-700 dark:text-purple-300">{targetPaper}</span>
              </td>
              <td className="py-3.5 px-4 bg-error/5 font-medium text-error">
                {dimCheck && !dimCheck.passed ? (
                  <span>{draftPaper} (Tidak Sesuai)</span>
                ) : (
                  <span className="text-on-surface">{draftPaper}</span>
                )}
              </td>
              <td className="py-3.5 px-4 bg-success/5 font-bold text-success">
                <span>{aiPaper} (Sesuai)</span>
              </td>
              <td className="py-3.5 px-4 text-center">
                <Badge className="bg-success text-on-success text-[10px]">Tersinkron</Badge>
              </td>
            </tr>

            {/* 2. Format Margin */}
            <tr className="hover:bg-surface-container/40 transition">
              <td className="py-3.5 px-4 font-bold text-on-surface">
                2. Margin Halaman (T / L)
              </td>
              <td className="py-3.5 px-4 bg-purple-500/5 font-medium text-on-surface">
                <span className="font-bold text-purple-700 dark:text-purple-300">{targetMargin}</span>
              </td>
              <td className="py-3.5 px-4 bg-error/5 font-medium text-error">
                {topCheck || leftCheck ? (
                  <span>{draftMarginTop} (T) / {draftMarginLeft} (L)</span>
                ) : (
                  <span className="text-on-surface">{targetMargin}</span>
                )}
              </td>
              <td className="py-3.5 px-4 bg-success/5 font-bold text-success">
                <span>{aiMargin} (Disesuaikan)</span>
              </td>
              <td className="py-3.5 px-4 text-center">
                <Badge className="bg-success text-on-success text-[10px]">Disesuaikan</Badge>
              </td>
            </tr>

            {/* 3. Struktur Kolom */}
            <tr className="hover:bg-surface-container/40 transition">
              <td className="py-3.5 px-4 font-bold text-on-surface">
                3. Tata Letak Kolom
              </td>
              <td className="py-3.5 px-4 bg-purple-500/5 font-medium text-on-surface">
                <span className="font-bold text-purple-700 dark:text-purple-300">{targetCols}</span>
              </td>
              <td className="py-3.5 px-4 bg-error/5 font-medium text-error">
                {colCheck && !colCheck.passed ? (
                  <span>{draftCols} (Pelanggaran Grid)</span>
                ) : (
                  <span className="text-on-surface">{draftCols}</span>
                )}
              </td>
              <td className="py-3.5 px-4 bg-success/5 font-bold text-success">
                <span>{aiCols} (Reflowed)</span>
              </td>
              <td className="py-3.5 px-4 text-center">
                <Badge className="bg-success text-on-success text-[10px]">Ditata Ulang</Badge>
              </td>
            </tr>

            {/* 4. Double-Blind Peer Review */}
            <tr className="hover:bg-surface-container/40 transition">
              <td className="py-3.5 px-4 font-bold text-on-surface">
                4. Anonimitas Penulis
              </td>
              <td className="py-3.5 px-4 bg-purple-500/5 font-medium text-on-surface">
                <span className="font-bold text-purple-700 dark:text-purple-300">Wajib Anonim (Double-Blind)</span>
              </td>
              <td className="py-3.5 px-4 bg-error/5 font-medium text-error">
                {leaks.length > 0 ? (
                  <span>Bocor {leaks.length} identitas ({leaks.map((l) => l.leak).slice(0, 2).join(", ")})</span>
                ) : (
                  <span className="text-success">Sudah Anonim</span>
                )}
              </td>
              <td className="py-3.5 px-4 bg-success/5 font-bold text-success">
                <span>[Author details omitted for review]</span>
              </td>
              <td className="py-3.5 px-4 text-center">
                <Badge className="bg-success text-on-success text-[10px]">Diredaksi</Badge>
              </td>
            </tr>

            {/* 5. Sitasi & Bibliografi */}
            <tr className="hover:bg-surface-container/40 transition">
              <td className="py-3.5 px-4 font-bold text-on-surface">
                5. Validasi Sitasi
              </td>
              <td className="py-3.5 px-4 bg-purple-500/5 font-medium text-on-surface">
                <span className="font-bold text-purple-700 dark:text-purple-300">Sitasi Numerik Sinkron</span>
              </td>
              <td className="py-3.5 px-4 bg-error/5 font-medium text-error">
                {citations.uncited_references.length > 0 ? (
                  <span>{citations.uncited_references.length} referensi tidak disitasi di teks</span>
                ) : (
                  <span className="text-success">Semua referensi terhubung</span>
                )}
              </td>
              <td className="py-3.5 px-4 bg-success/5 font-bold text-success">
                <span>Bibliografi Diselaraskan</span>
              </td>
              <td className="py-3.5 px-4 text-center">
                <Badge variant="outline" className="text-[10px]">Divalidasi</Badge>
              </td>
            </tr>

            {/* 6. Struktur Bagian Akademik */}
            {structCheck && (
              <tr className="hover:bg-surface-container/40 transition">
                <td className="py-3.5 px-4 font-bold text-on-surface">
                  6. Struktur Bagian Naskah
                </td>
                <td className="py-3.5 px-4 bg-purple-500/5 font-medium text-on-surface">
                  <span className="font-bold text-purple-700 dark:text-purple-300">Abstract, Intro, Method, Result, Ref</span>
                </td>
                <td className="py-3.5 px-4 bg-error/5 font-medium text-error">
                  <span>{structCheck.actual}</span>
                </td>
                <td className="py-3.5 px-4 bg-success/5 font-bold text-success">
                  <span>Grid Naskah Ditata &amp; Judul Diberi Nomor</span>
                </td>
                <td className="py-3.5 px-4 text-center">
                  <Badge variant="outline" className="text-[10px] text-warning border-warning/40">Perlu Review</Badge>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
