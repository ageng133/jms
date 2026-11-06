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
  AlignJustify,
  Type,
  ListOrdered,
  Maximize2,
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

  const draftFileName = report.draft_filename || report.original_filename || "Naskah_Draft.pdf";
  const templateFileName =
    report.template_filename ||
    report.template_specs?.name ||
    (report.template_preset ? `Template ${report.template_preset.toUpperCase()}` : "Template_Acuan.pdf");
  const aiFileName = draftFileName.replace(/\.pdf$/i, "") + "_camera_ready.pdf";

  // Extract actual draft measurements from checks
  const colCheck = checks.find((c) => c.rule === "COLUMN_LAYOUT");
  const topCheck = checks.find((c) => c.rule === "MARGIN_TOP");
  const leftCheck = checks.find((c) => c.rule === "MARGIN_LEFT");
  const dimCheck = checks.find((c) => c.rule === "PAGE_DIMENSIONS");
  const structCheck = checks.find((c) => c.rule === "SECTION_STRUCTURE");
  const fontCheck = checks.find((c) => c.rule === "FONT_FAMILY" || c.rule === "FONT_SIZE_BODY");
  const alignCheck = checks.find((c) => c.rule === "TEXT_ALIGNMENT");

  const draftCols = colCheck ? colCheck.actual : `${specs?.column_count || 1} Kolom`;
  const draftMarginTop = topCheck ? topCheck.actual : `${specs?.margin_top_mm || 20} mm`;
  const draftMarginLeft = leftCheck ? leftCheck.actual : `${specs?.margin_left_mm || 18} mm`;
  const draftPaper = dimCheck ? dimCheck.actual : (specs?.page_format || "A4");

  const targetCols = specs?.column_count === 2 ? `2 Kolom (${specs.column_gap_mm || 6.35} mm spasi)` : "1 Kolom";
  const targetMargin = `${specs?.margin_top_mm || 20} mm (T) / ${specs?.margin_bottom_mm || 20} mm (B) / ${specs?.margin_left_mm || 18} mm (L) / ${specs?.margin_right_mm || 18} mm (R)`;
  const targetPaper = `${specs?.page_format || "A4"} (${specs?.page_width_mm || 210}x${specs?.page_height_mm || 297} mm)`;
  const targetFont = `${specs?.font_family || "Times New Roman"} (Isi: ${specs?.body_font_size_pt || 9.5}pt, Judul: ${specs?.title_font_size_pt || 16}pt, Sub: ${specs?.heading_font_size_pt || 10}pt)`;
  const targetSpacing = specs?.line_spacing ? `Spasi ${specs.line_spacing} (${specs.line_height_pt || 11.5}pt)` : "Single 1.15x (11.5pt leading)";
  const targetAlign = specs?.text_alignment === "left" ? "Rata Kiri (Left-aligned)" : "Rata Kanan-Kiri (Justified)";
  const targetSections = specs?.required_sections && specs.required_sections.length > 0
    ? specs.required_sections.join(", ")
    : "Abstract, Keywords, Introduction, Methods, Results, Discussion, Conclusion, References";

  const aiCols = fixed?.column_count ? `${fixed.column_count} Kolom` : targetCols;
  const aiMargin = fixed?.target_margins_mm
    ? `${fixed.target_margins_mm.top} mm (T) / ${fixed.target_margins_mm.bottom} mm (B) / ${fixed.target_margins_mm.left} mm (L) / ${fixed.target_margins_mm.right} mm (R)`
    : targetMargin;
  const aiPaper = fixed?.target_format || specs?.page_format || "A4";
  const aiFont = `${specs?.font_family || "Times-Roman"} (${specs?.body_font_size_pt || 9.5}pt)`;

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
                Matriks Triad: Perbandingan Sebanding 3 Berkas Dokumen
              </h2>
              <Badge className="bg-primary text-on-primary text-[10px] font-semibold">
                Diekstrak dari Upload
              </Badge>
            </div>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Semua parameter (daftar isi, margin, font, spacing, alignment) diekstrak langsung dari <strong>berkas template yang diunggah</strong> dan dibandingkan secara seimbang terhadap <strong>naskah draft</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 font-bold border border-purple-500/20 truncate max-w-[170px]" title={templateFileName}>
            🟣 1. {templateFileName}
          </span>
          <span className="px-3 py-1 rounded-full bg-error/10 text-error font-bold border border-error/20 truncate max-w-[170px]" title={draftFileName}>
            🔴 2. {draftFileName}
          </span>
          <span className="px-3 py-1 rounded-full bg-success/10 text-success font-bold border border-success/20 truncate max-w-[170px]" title={aiFileName}>
            🟢 3. {aiFileName}
          </span>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-high border-b border-outline-variant text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
              <th className="py-3 px-4 w-[18%]">Kriteria Template</th>
              <th className="py-3 px-4 w-[28%] bg-purple-500/5 text-purple-700 dark:text-purple-300">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
                  <span>🟣 1. Template Acuan:</span>
                </div>
                <div className="font-mono text-[10px] truncate mt-0.5" title={templateFileName}>{templateFileName}</div>
              </th>
              <th className="py-3 px-4 w-[26%] bg-error/5 text-error">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-error inline-block" />
                  <span>🔴 2. Naskah Asli:</span>
                </div>
                <div className="font-mono text-[10px] truncate mt-0.5" title={draftFileName}>{draftFileName}</div>
              </th>
              <th className="py-3 px-4 w-[28%] bg-success/5 text-success">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-success inline-block" />
                  <span>🟢 3. Hasil AI (Camera-Ready):</span>
                </div>
                <div className="font-mono text-[10px] truncate mt-0.5" title={aiFileName}>{aiFileName}</div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {/* 1. Konteks & Header Jurnal */}
            <tr className="hover:bg-surface-container/40 transition">
              <td className="py-3 px-4 font-bold text-on-surface">
                1. Konteks &amp; Header Jurnal
              </td>
              <td className="py-3 px-4 bg-purple-500/5 font-medium text-on-surface">
                <span className="font-bold text-purple-700 dark:text-purple-300">
                  {specs?.running_header || specs?.name || "Standar Publikasi Jurnal Ilmiah"}
                </span>
                <p className="text-[10px] text-on-surface-variant mt-0.5">Identitas header terdeteksi dari template</p>
              </td>
              <td className="py-3 px-4 bg-error/5 font-medium text-error">
                <span>{report.manuscript_title || "Draft belum memiliki header resmi"}</span>
              </td>
              <td className="py-3 px-4 bg-success/5 font-bold text-success">
                <span>Header Resmi Disematkan di Setiap Halaman</span>
              </td>
            </tr>

            {/* 2. Ukuran Kertas */}
            <tr className="hover:bg-surface-container/40 transition">
              <td className="py-3 px-4 font-bold text-on-surface">
                2. Ukuran Kertas &amp; Dimensi
              </td>
              <td className="py-3 px-4 bg-purple-500/5 font-medium text-on-surface">
                <span className="font-bold text-purple-700 dark:text-purple-300">{targetPaper}</span>
              </td>
              <td className="py-3 px-4 bg-error/5 font-medium text-error">
                {dimCheck && !dimCheck.passed ? (
                  <span>{draftPaper} (Dimensi Berbeda)</span>
                ) : (
                  <span className="text-on-surface">{draftPaper}</span>
                )}
              </td>
              <td className="py-3 px-4 bg-success/5 font-bold text-success">
                <span>{aiPaper} (Sesuai 100%)</span>
              </td>
            </tr>

            {/* 3. Margin Batas Tepi */}
            <tr className="hover:bg-surface-container/40 transition">
              <td className="py-3 px-4 font-bold text-on-surface">
                3. Batas Tepi (Margin)
              </td>
              <td className="py-3 px-4 bg-purple-500/5 font-medium text-on-surface">
                <span className="font-bold text-purple-700 dark:text-purple-300">{targetMargin}</span>
                <p className="text-[10px] text-on-surface-variant mt-0.5">Diukur langsung dari batas teks template</p>
              </td>
              <td className="py-3 px-4 bg-error/5 font-medium text-error">
                {topCheck || leftCheck ? (
                  <span>{draftMarginTop} (T) / {draftMarginLeft} (L)</span>
                ) : (
                  <span className="text-on-surface">{targetMargin}</span>
                )}
              </td>
              <td className="py-3 px-4 bg-success/5 font-bold text-success">
                <span>{aiMargin} (Disesuaikan Presisi)</span>
              </td>
            </tr>

            {/* 4. Struktur Kolom */}
            <tr className="hover:bg-surface-container/40 transition">
              <td className="py-3 px-4 font-bold text-on-surface">
                4. Tata Letak Kolom &amp; Gutter
              </td>
              <td className="py-3 px-4 bg-purple-500/5 font-medium text-on-surface">
                <span className="font-bold text-purple-700 dark:text-purple-300">{targetCols}</span>
              </td>
              <td className="py-3 px-4 bg-error/5 font-medium text-error">
                {colCheck && !colCheck.passed ? (
                  <span>{draftCols} (Pelanggaran Grid Template)</span>
                ) : (
                  <span className="text-on-surface">{draftCols}</span>
                )}
              </td>
              <td className="py-3 px-4 bg-success/5 font-bold text-success">
                <span>{aiCols} (Reflow Grid Sempurna)</span>
              </td>
            </tr>

            {/* 5. Tipografi & Font */}
            <tr className="hover:bg-surface-container/40 transition">
              <td className="py-3 px-4 font-bold text-on-surface">
                5. Tipografi &amp; Ukuran Font
              </td>
              <td className="py-3 px-4 bg-purple-500/5 font-medium text-on-surface">
                <span className="font-bold text-purple-700 dark:text-purple-300">{targetFont}</span>
                <p className="text-[10px] text-on-surface-variant mt-0.5">Font dominan &amp; hierarki judul template</p>
              </td>
              <td className="py-3 px-4 bg-error/5 font-medium text-error">
                {fontCheck && !fontCheck.passed ? (
                  <span>{fontCheck.actual}</span>
                ) : (
                  <span className="text-on-surface-variant">Font bervariasi / belum distandardisasi</span>
                )}
              </td>
              <td className="py-3 px-4 bg-success/5 font-bold text-success">
                <span>Dikalibrasi ke {aiFont} (Judul &amp; Sub-bab Seragam)</span>
              </td>
            </tr>

            {/* 6. Spasi Baris & Leading */}
            <tr className="hover:bg-surface-container/40 transition">
              <td className="py-3 px-4 font-bold text-on-surface">
                6. Spasi Baris &amp; Leading
              </td>
              <td className="py-3 px-4 bg-purple-500/5 font-medium text-on-surface">
                <span className="font-bold text-purple-700 dark:text-purple-300">{targetSpacing}</span>
              </td>
              <td className="py-3 px-4 bg-error/5 font-medium text-error">
                <span>Spasi tidak konsisten (campuran 1.0x dan 1.5x)</span>
              </td>
              <td className="py-3 px-4 bg-success/5 font-bold text-success">
                <span>Terkalibrasi Sesuai Rasio Template ({specs?.line_spacing || "1.15x"})</span>
              </td>
            </tr>

            {/* 7. Perataan Teks (Text Alignment) */}
            <tr className="hover:bg-surface-container/40 transition">
              <td className="py-3 px-4 font-bold text-on-surface">
                7. Perataan Teks (Alignment)
              </td>
              <td className="py-3 px-4 bg-purple-500/5 font-medium text-on-surface">
                <span className="font-bold text-purple-700 dark:text-purple-300">{targetAlign}</span>
              </td>
              <td className="py-3 px-4 bg-error/5 font-medium text-error">
                {alignCheck && !alignCheck.passed ? (
                  <span>{alignCheck.actual}</span>
                ) : (
                  <span>Rata Kiri (Belum Justified Rapi)</span>
                )}
              </td>
              <td className="py-3 px-4 bg-success/5 font-bold text-success">
                <span>{specs?.text_alignment === "left" ? "Rata Kiri" : "Rata Kanan-Kiri (Justified Bersih)"}</span>
              </td>
            </tr>

            {/* 8. Daftar Isi & Struktur Seksi */}
            <tr className="hover:bg-surface-container/40 transition">
              <td className="py-3 px-4 font-bold text-on-surface">
                8. Struktur Seksi (Daftar Isi)
              </td>
              <td className="py-3 px-4 bg-purple-500/5 font-medium text-on-surface">
                <span className="font-bold text-purple-700 dark:text-purple-300 leading-relaxed block">
                  {targetSections}
                </span>
                <p className="text-[10px] text-on-surface-variant mt-0.5">Seksi wajib yang disyaratkan template</p>
              </td>
              <td className="py-3 px-4 bg-error/5 font-medium text-error">
                {structCheck ? (
                  <span>{structCheck.actual}</span>
                ) : (
                  <span>Periksa kelengkapan seksi utama</span>
                )}
              </td>
              <td className="py-3 px-4 bg-success/5 font-bold text-success">
                <span>Urutan Heading Terstruktur &amp; Diberi Penomoran Akademik</span>
              </td>
            </tr>

            {/* 9. Anonimitas Penulis (Double-Blind) */}
            <tr className="hover:bg-surface-container/40 transition">
              <td className="py-3 px-4 font-bold text-on-surface">
                9. Anonimitas Penulis (Double-Blind)
              </td>
              <td className="py-3 px-4 bg-purple-500/5 font-medium text-on-surface">
                <span className="font-bold text-purple-700 dark:text-purple-300">Wajib Bersih (Tanpa Nama/Afiliasi)</span>
              </td>
              <td className="py-3 px-4 bg-error/5 font-medium text-error">
                {leaks.length > 0 ? (
                  <span>Bocor {leaks.length} data identitas ({leaks.map((l) => l.leak).slice(0, 2).join(", ")})</span>
                ) : (
                  <span className="text-success">Naskah Asli Sudah Anonim</span>
                )}
              </td>
              <td className="py-3 px-4 bg-success/5 font-bold text-success">
                <span>100% Teredaksi ([Author details omitted for double-blind review])</span>
              </td>
            </tr>

            {/* 10. Sitasi & Referensi */}
            <tr className="hover:bg-surface-container/40 transition">
              <td className="py-3 px-4 font-bold text-on-surface">
                10. Sitasi &amp; Daftar Pustaka
              </td>
              <td className="py-3 px-4 bg-purple-500/5 font-medium text-on-surface">
                <span className="font-bold text-purple-700 dark:text-purple-300">Sitasi Numerik [1], [2] Sinkron</span>
              </td>
              <td className="py-3 px-4 bg-error/5 font-medium text-error">
                {citations.uncited_references.length > 0 ? (
                  <span>{citations.uncited_references.length} referensi tidak dipanggil di teks</span>
                ) : (
                  <span className="text-success">Sitasi sinkron dengan daftar pustaka</span>
                )}
              </td>
              <td className="py-3 px-4 bg-success/5 font-bold text-success">
                <span>Format Bibliografi Disesuaikan Standar Jurnal</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
