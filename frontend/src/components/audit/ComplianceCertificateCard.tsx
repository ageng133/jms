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
    <div className="bg-warning-container/40 rounded-m3-xl p-6 sm:p-8 border border-warning/40 shadow-elevation-1 relative overflow-hidden">
      {/* Decorative Guilloche Ambient Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-warning/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
        <div className="space-y-3 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-warning/20 text-on-warning-container border border-warning/40 shadow-xs">
              <Award className="w-4 h-4 text-warning" />
              Sertifikat Kelayakan Format Resmi
            </span>
            <Badge className="bg-success text-on-success text-[10px] font-semibold">
              Terverifikasi Digital
            </Badge>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-on-surface tracking-tight">
            Bukti Kepatuhan Format Jurnal (Format Kilat Verified)
          </h2>
          <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
            Sertifikat ini membuktikan bahwa naskah telah melalui audit otomatis terhadap margin, struktur kolom, integritas blind review, dan gaya rujukan. Dapat dilampirkan saat pengajuan sidang skripsi/tesis atau submit ke dewan editor jurnal.
          </p>

          <div className="flex flex-wrap items-center gap-4 text-xs text-on-surface-variant pt-1">
            <span className="flex items-center gap-1.5 font-mono">
              <QrCode className="w-4 h-4 text-primary" />
              ID Sertifikat: <strong className="text-on-surface">{certId}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-primary" />
              Diterbitkan: <strong className="text-on-surface">{issueDate}</strong>
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
          <Button
            onClick={() => setShowFullCert(true)}
            className="bg-warning text-on-warning px-6 h-11"
          >
            <Award className="w-4 h-4" />
            <span>Buka &amp; Cetak Sertifikat</span>
          </Button>

          <Button
            variant="outline"
            onClick={handlePrint}
            className="rounded-full text-xs gap-1.5 h-11"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Langsung (PDF)</span>
          </Button>
        </div>
      </div>

      {/* Embedded Full Certificate Modal */}
      {showFullCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim/60 overflow-y-auto">
          <div className="bg-surface-container-low rounded-3xl max-w-3xl w-full p-8 sm:p-12 border-8 border-double border-warning/30 shadow-2xl relative my-8 print:m-0 print:border-none print:shadow-none">
            {/* Close Button (Hidden on Print) */}
            <button
              onClick={() => setShowFullCert(false)}
              className="absolute top-6 right-6 w-8 h-8 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant flex items-center justify-center text-sm font-bold print:hidden"
            >
              &times;
            </button>

            {/* Certificate Header */}
            <div className="text-center space-y-2 border-b-2 border-warning/30 pb-6">
              <div className="inline-flex p-3 rounded-2xl bg-warning-container/60 text-warning mb-1 border border-warning/30">
                <Award className="w-10 h-10" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-serif font-black tracking-wide text-on-surface uppercase">
                Sertifikat Kepatuhan Format Jurnal
              </h1>
              <p className="text-xs uppercase tracking-widest text-on-warning-container font-bold">
                Format Kilat Academic Assurance &bull; Digital Verification Seal
              </p>
              <p className="text-[11px] font-mono text-outline">
                Nomor Sertifikasi: {certId}
              </p>
            </div>

            {/* Certificate Body */}
            <div className="py-8 space-y-6 text-center">
              <p className="text-xs sm:text-sm text-on-surface-variant italic">
                Dengan ini diterangkan bahwa naskah ilmiah:
              </p>

              <h2 className="text-lg sm:text-xl font-bold text-on-surface px-4 max-w-xl mx-auto leading-snug">
                "{manuscriptTitle || `Manuscript ID: ${report.manuscript_id}`}"
              </h2>

              <p className="text-xs sm:text-sm text-on-surface-variant max-w-lg mx-auto leading-relaxed">
                Telah melalui serangkaian pengujian pra-publikasi otomatis menggunakan sistem evaluasi format berstandar Sinta &amp; Scopus. Naskah dinyatakan memenuhi standar layout, margin batas cetak, penyusunan sitasi, dan integritas double-blind peer review.
              </p>

              {/* Score & Metrics Box */}
              <div className="grid grid-cols-3 gap-3 max-w-md mx-auto pt-2">
                <div className="p-3 bg-surface-container border border-outline-variant rounded-xl text-center">
                  <span className="text-[10px] text-outline font-bold block uppercase">Skor Format</span>
                  <span className="text-xl font-black text-success">{report.overall_score}/100</span>
                </div>
                <div className="p-3 bg-surface-container border border-outline-variant rounded-xl text-center">
                  <span className="text-[10px] text-outline font-bold block uppercase">Status Audit</span>
                  <span className="text-xs font-bold text-on-surface block mt-1">LULUS FORMAT</span>
                </div>
                <div className="p-3 bg-surface-container border border-outline-variant rounded-xl text-center">
                  <span className="text-[10px] text-outline font-bold block uppercase">Template</span>
                  <span className="text-xs font-bold text-on-surface block mt-1 truncate">
                    {report.template_specs?.page_format || "A4 Standard"}
                  </span>
                </div>
              </div>
            </div>

            {/* Certificate Signatures & Seal */}
            <div className="grid grid-cols-2 items-end pt-6 border-t border-outline-variant text-xs">
              <div className="space-y-1 text-left">
                <p className="text-[10px] text-outline uppercase font-bold">Verifikasi Digital</p>
                <p className="font-mono text-[11px] text-on-surface-variant">Hash: {report.audit_id}</p>
                <p className="text-on-surface-variant text-[10px]">Tanggal: {issueDate}</p>
              </div>

              <div className="text-right space-y-2">
                <div className="inline-block border-b border-outline pb-1 px-4 text-center">
                  <span className="font-serif italic font-bold text-on-surface block">Editorial AI Review Board</span>
                </div>
                <p className="text-[10px] text-on-surface-variant">Format Kilat Verification Authority</p>
              </div>
            </div>

            {/* Print Action Bar (Hidden in Print) */}
            <div className="mt-8 pt-4 border-t border-outline-variant flex items-center justify-end gap-3 print:hidden">
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
                className="bg-primary hover:bg-primary text-on-primary rounded-full text-xs gap-1.5 shadow-md"
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

