"use client";

import React, { useState } from "react";
import {
  Award,
  CheckCircle2,
  Printer,
  QrCode,
  ShieldCheck,
  Sparkles,
  Download,
  Calendar,
  FileCheck2,
  ExternalLink,
} from "lucide-react";
import { PreSubmissionAuditReport } from "@/types/jms";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ComplianceCertificateCardProps {
  report: PreSubmissionAuditReport;
  manuscriptTitle?: string;
}

export function ComplianceCertificateCard({
  report,
  manuscriptTitle,
}: ComplianceCertificateCardProps) {
  const [showFullCert, setShowFullCert] = useState(false);

  const certId = `FK-${(report.audit_id || "AUDIT").slice(0, 8).toUpperCase()}-${new Date().getFullYear()}`;
  const isPassed = (report.overall_score || 0) >= 75;
  const issueDate = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-gradient-to-br from-amber-500/10 via-indigo-500/5 to-purple-500/10 rounded-3xl p-6 sm:p-8 border border-amber-300/40 shadow-xl relative overflow-hidden">
      {/* Decorative Guilloche Ambient Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
        <div className="space-y-3 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-800 border border-amber-400/40 shadow-xs">
              <Award className="w-4 h-4 text-amber-600" />
              Sertifikat Kelayakan Format Resmi
            </span>
            <Badge className="bg-emerald-600 text-white text-[10px] font-semibold">
              Terverifikasi Digital
            </Badge>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Bukti Kepatuhan Format Jurnal (Format Kilat Verified)
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Sertifikat ini membuktikan bahwa naskah telah melalui audit otomatis terhadap margin, struktur kolom, integritas blind review, dan gaya rujukan. Dapat dilampirkan saat pengajuan sidang skripsi/tesis atau submit ke dewan editor jurnal.
          </p>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
            <span className="flex items-center gap-1.5 font-mono">
              <QrCode className="w-4 h-4 text-indigo-600" />
              ID Sertifikat: <strong className="text-slate-900">{certId}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-indigo-600" />
              Diterbitkan: <strong className="text-slate-900">{issueDate}</strong>
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
          <Button
            onClick={() => setShowFullCert(true)}
            className="bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold text-xs rounded-full px-6 shadow-lg shadow-amber-600/20 h-11 gap-2"
          >
            <Award className="w-4 h-4" />
            <span>Buka &amp; Cetak Sertifikat</span>
          </Button>

          <Button
            variant="outline"
            onClick={handlePrint}
            className="rounded-full text-xs gap-1.5 border-slate-300 bg-white/80 hover:bg-white text-slate-700 h-11"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Langsung (PDF)</span>
          </Button>
        </div>
      </div>

      {/* Embedded Full Certificate Modal */}
      {showFullCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-8 sm:p-12 border-8 border-double border-amber-500/30 shadow-2xl relative my-8 print:m-0 print:border-none print:shadow-none">
            {/* Close Button (Hidden on Print) */}
            <button
              onClick={() => setShowFullCert(false)}
              className="absolute top-6 right-6 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-sm font-bold print:hidden"
            >
              &times;
            </button>

            {/* Certificate Header */}
            <div className="text-center space-y-2 border-b-2 border-amber-200 pb-6">
              <div className="inline-flex p-3 rounded-2xl bg-amber-50 text-amber-600 mb-1 border border-amber-200">
                <Award className="w-10 h-10" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-serif font-black tracking-wide text-slate-900 uppercase">
                Sertifikat Kepatuhan Format Jurnal
              </h1>
              <p className="text-xs uppercase tracking-widest text-amber-700 font-bold">
                Format Kilat Academic Assurance &bull; Digital Verification Seal
              </p>
              <p className="text-[11px] font-mono text-slate-400">
                Nomor Sertifikasi: {certId}
              </p>
            </div>

            {/* Certificate Body */}
            <div className="py-8 space-y-6 text-center">
              <p className="text-xs sm:text-sm text-slate-500 italic">
                Dengan ini diterangkan bahwa naskah ilmiah:
              </p>

              <h2 className="text-lg sm:text-xl font-bold text-slate-900 px-4 max-w-xl mx-auto leading-snug">
                "{manuscriptTitle || `Manuscript ID: ${report.manuscript_id}`}"
              </h2>

              <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
                Telah melalui serangkaian pengujian pra-publikasi otomatis menggunakan sistem evaluasi format berstandar Sinta &amp; Scopus. Naskah dinyatakan memenuhi standar layout, margin batas cetak, penyusunan sitasi, dan integritas double-blind peer review.
              </p>

              {/* Score & Metrics Box */}
              <div className="grid grid-cols-3 gap-3 max-w-md mx-auto pt-2">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Skor Format</span>
                  <span className="text-xl font-black text-emerald-600">{report.overall_score}/100</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Status Audit</span>
                  <span className="text-xs font-bold text-slate-900 block mt-1">LULUS FORMAT</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Template</span>
                  <span className="text-xs font-bold text-slate-900 block mt-1 truncate">
                    {report.template_specs?.page_format || "A4 Standard"}
                  </span>
                </div>
              </div>
            </div>

            {/* Certificate Signatures & Seal */}
            <div className="grid grid-cols-2 items-end pt-6 border-t border-slate-200 text-xs">
              <div className="space-y-1 text-left">
                <p className="text-[10px] text-slate-400 uppercase font-bold">Verifikasi Digital</p>
                <p className="font-mono text-[11px] text-slate-700">Hash: {report.audit_id}</p>
                <p className="text-slate-500 text-[10px]">Tanggal: {issueDate}</p>
              </div>

              <div className="text-right space-y-2">
                <div className="inline-block border-b border-slate-800 pb-1 px-4 text-center">
                  <span className="font-serif italic font-bold text-slate-800 block">Editorial AI Review Board</span>
                </div>
                <p className="text-[10px] text-slate-500">Format Kilat Verification Authority</p>
              </div>
            </div>

            {/* Print Action Bar (Hidden in Print) */}
            <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-end gap-3 print:hidden">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFullCert(false)}
                className="rounded-full text-xs"
              >
                Tutup
              </Button>
              <Button
                size="sm"
                onClick={handlePrint}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-xs gap-1.5 shadow-md"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak / Unduh PDF</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

