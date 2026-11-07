"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  UploadCloud,
  CheckCircle,
  ArrowRight,
  Loader2,
  FileText,
  AlertCircle,
  Layers,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { AuthGateCard } from "@/components/AuthGateCard";
import { TemplatePresetSelect } from "@/components/TemplatePresetSelect";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Textarea, Label } from "@/components/ui/input";
import {
  createDraftManuscript,
  requestUploadPresign,
  uploadDirectToS3,
  confirmSubmission,
  FileMetadataInput,
} from "@/lib/api";

export default function NewSubmissionPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [abstract, setAbstract] = useState("");
  const [keywordsInput, setKeywordsInput] = useState("");

  // Dual File State
  const [draftFile, setDraftFile] = useState<File | null>(null);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templatePreset, setTemplatePreset] = useState<string>("");
  const [templateDragOver, setTemplateDragOver] = useState(false);
  const [draftDragOver, setDraftDragOver] = useState(false);

  // Pipeline Tracking
  const [manuscriptId, setManuscriptId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string>("");

  function handlePrefillDemo() {
    setTitle("High-Throughput Zero-Copy Deserialization in Distributed Microservices");
    setAbstract(
      "Distributed document ingestion architectures frequently bottleneck at the serialization boundary. We demonstrate a zero-copy Apache Arrow and PyMuPDF data plane achieving 180MB/s per-node throughput without deserialization tax."
    );
    setKeywordsInput("Distributed Systems, Zero-Copy IPC, PyMuPDF, Document Layout, Arrow");
  }

  // Step 1: Create Draft
  async function handleMetadataSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const keywords = keywordsInput
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k.length > 0);

      const m = await createDraftManuscript({ title, abstract, keywords });
      setManuscriptId(m.id);
      setStep(2);
    } catch (err: any) {
      setError(err.message || "Failed to create draft");
    } finally {
      setLoading(false);
    }
  }

  // Step 2 & 3: Dual File Direct S3 Upload and Enqueue AI Pre-Check
  async function handleFileUploadAndDispatch() {
    if (!draftFile || !manuscriptId) {
      setError("Please select the author manuscript draft PDF");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      let templateMeta: FileMetadataInput | undefined = undefined;

      // 1. Upload Template if provided
      if (templateFile) {
        setUploadProgress("Presigning & uploading Journal Reference Template to S3...");
        const templatePresign = await requestUploadPresign(
          manuscriptId,
          templateFile.name,
          "PDF",
          "TEMPLATE"
        );
        await uploadDirectToS3(templatePresign.upload_url, templateFile);
        templateMeta = {
          s3_key: templatePresign.s3_key,
          file_type: "PDF",
          original_filename: templateFile.name,
          file_size_bytes: templateFile.size,
          file_role: "TEMPLATE",
        };
      }

      // 2. Upload Manuscript Draft
      setUploadProgress("Presigning & uploading Manuscript Draft to S3...");
      const draftPresign = await requestUploadPresign(
        manuscriptId,
        draftFile.name,
        "PDF",
        "MANUSCRIPT"
      );
      await uploadDirectToS3(draftPresign.upload_url, draftFile);
      const draftMeta: FileMetadataInput = {
        s3_key: draftPresign.s3_key,
        file_type: "PDF",
        original_filename: draftFile.name,
        file_size_bytes: draftFile.size,
        file_role: "MANUSCRIPT",
      };

      // 3. Confirm submission in Gateway & Dispatch Redis event
      setUploadProgress("Enqueuing comparative AI Pre-Submission Audit...");
      const confirmResult = await confirmSubmission(manuscriptId, {
        draft_file: draftMeta,
        template_file: templateMeta,
        template_preset: templateFile ? undefined : (templatePreset || undefined),
      });

      setStep(3);
      // Redirect to the real-time audit report inspection page
      setTimeout(() => {
        router.push(`/submissions/${manuscriptId}/audit?audit_id=${confirmResult.audit_id}`);
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to complete upload");
    } finally {
      setLoading(false);
    }
  }

  if (authLoading) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
        <p className="text-xs text-on-surface-variant">Checking authentication state...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthGateCard
        title="Sign In to Submit & Audit"
        description="Automated pre-submission format auditing, Box cloud storage upload, and visual layout checking require an authenticated session."
        actionText="Sign In / 1-Click Demo Login"
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Step Indicator */}
      <div className="flex items-center justify-between border-b border-outline-variant pb-5">
        <div className={`flex items-center gap-2 text-xs font-semibold transition ${step >= 1 ? "text-primary" : "text-on-surface-variant"}`}>
          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition shadow-xs ${step >= 1 ? "bg-primary text-on-primary" : "bg-on-surface/[0.05] text-on-surface-variant"}`}>
            1
          </span>
          <span className="hidden sm:inline">Metadata</span>
        </div>
        <div className={`flex-1 h-0.5 mx-3 sm:mx-4 rounded-full transition-colors ${step >= 2 ? "bg-primary" : "bg-on-surface/[0.06]"}`} />
        <div className={`flex items-center gap-2 text-xs font-semibold transition ${step >= 2 ? "text-primary" : "text-on-surface-variant"}`}>
          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition shadow-xs ${step >= 2 ? "bg-primary text-on-primary" : "bg-on-surface/[0.05] text-on-surface-variant"}`}>
            2
          </span>
          <span className="hidden sm:inline">Upload Template &amp; Draft</span>
        </div>
        <div className={`flex-1 h-0.5 mx-3 sm:mx-4 rounded-full transition-colors ${step === 3 ? "bg-success" : "bg-on-surface/[0.06]"}`} />
        <div className={`flex items-center gap-2 text-xs font-semibold transition ${step === 3 ? "text-success" : "text-on-surface-variant"}`}>
          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition shadow-xs ${step === 3 ? "bg-success text-on-success" : "bg-on-surface/[0.05] text-on-surface-variant"}`}>
            3
          </span>
          <span className="hidden sm:inline">AI Pre-Check</span>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-error/10 border border-error/20 text-error text-xs flex items-center gap-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Step 1: Metadata Form */}
      {step === 1 && (
        <form onSubmit={handleMetadataSubmit} className="bg-surface-container-low p-6 sm:p-8 rounded-3xl border border-outline-variant shadow-elevation-1 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant pb-4">
            <div className="space-y-0.5">
              <h2 className="text-xl font-bold text-on-surface">Manuscript Metadata</h2>
              <p className="text-xs text-on-surface-variant">Enter article title, abstract, and research indexing keywords.</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrefillDemo}
              className="text-xs text-primary rounded-full border-outline-variant gap-1.5 self-start sm:self-auto"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Auto-Fill Demo Data</span>
            </Button>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="title" className="text-xs text-on-surface-variant">Manuscript Title</Label>
              <Input
                id="title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Distributed Zero-Copy Memory Pipelines for High-Performance Parsing"
                className="rounded-xl text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="abstract" className="text-xs text-on-surface-variant">Abstract</Label>
              <Textarea
                id="abstract"
                required
                rows={5}
                value={abstract}
                onChange={(e) => setAbstract(e.target.value)}
                placeholder="Provide a concise 150-300 word summary of research contributions..."
                className="rounded-xl text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="keywords" className="text-xs text-on-surface-variant">Keywords (comma separated)</Label>
              <Input
                id="keywords"
                type="text"
                required
                value={keywordsInput}
                onChange={(e) => setKeywordsInput(e.target.value)}
                placeholder="Distributed systems, PyMuPDF, Document Layout, Arrow IPC"
                className="rounded-xl text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              disabled={loading}
              className="bg-primary hover:bg-primary text-on-primary font-medium text-xs rounded-full px-6 shadow-xs disabled:opacity-50 gap-2 h-10 active:scale-[0.98] transition-all"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Next: Upload Files"}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </form>
      )}

      {/* Step 2: Dual File Direct S3 Upload (Template + Draft) - Side by Side */}
      {step === 2 && (
        <div className="bg-surface-container-low p-6 sm:p-8 rounded-3xl border border-outline-variant shadow-elevation-1 space-y-8">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px]">
                Input Dokumen
              </Badge>
              <Badge variant="default" className="text-[10px]">
                Verifikasi Berpasangan
              </Badge>
            </div>
            <h2 className="text-xl font-bold text-on-surface">Unggah Template Jurnal &amp; Naskah Draft</h2>
            <p className="text-xs sm:text-sm text-on-surface-variant">
              Unggah template atau pedoman penulisan jurnal sasaran bersama draft naskah Anda. Sistem akan memeriksa margin, kolom, dan sitasi.
            </p>
          </div>

          {/* Side-by-Side Dual Upload Grid: Target Journal Template & Author Draft */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            {/* Upload Zone A: Target Journal Template (Left) */}
            <div className="flex flex-col justify-between p-5 sm:p-6 rounded-2xl border border-primary/30 bg-primary-container/40 space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary text-on-primary flex items-center justify-center text-xs font-bold">
                      1
                    </span>
                    <label className="text-xs font-bold text-on-surface">
                      Template / Pedoman Jurnal Sasaran (.pdf)
                    </label>
                  </div>
                  <Badge className="bg-primary text-on-primary text-[10px] font-semibold">
                    Acuan Format
                  </Badge>
                </div>
                <p className="text-xs text-on-surface-variant">
                  Unggah file <strong>Pedoman Penulisan (Author Guidelines)</strong> atau <strong>Contoh Artikel Jurnal</strong> dari jurnal tujuan Anda. Format Kilat akan mendeteksi aturannya secara otomatis.
                </p>

                {/* Hidden File Input */}
                <input
                  type="file"
                  accept=".pdf"
                  id="template-upload"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setTemplateFile(e.target.files[0]);
                    }
                  }}
                />

                {/* Dropzone or Loaded Card */}
                {!templateFile ? (
                  <label
                    htmlFor="template-upload"
                    onDragOver={(e) => {
                      e.preventDefault();
                      setTemplateDragOver(true);
                    }}
                    onDragLeave={() => setTemplateDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setTemplateDragOver(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        setTemplateFile(e.dataTransfer.files[0]);
                      }
                    }}
                    className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition cursor-pointer block space-y-2.5 bg-surface-container-low hover:bg-primary-container/50 ${
                      templateDragOver ? "border-primary bg-primary-container/60 scale-[1.01]" : "border-primary/50"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-2xl bg-primary-container text-primary flex items-center justify-center mx-auto">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-on-surface">
                        Tarik &amp; lepas PDF Template / Pedoman Jurnal di sini
                      </p>
                      <p className="text-[11px] text-on-surface-variant mt-0.5">atau klik untuk telusuri dari komputer</p>
                    </div>
                    <span className="inline-block text-[10px] font-semibold text-on-primary-container bg-primary-container px-3 py-1 rounded-full">
                      Mendeteksi margin, kolom, font &amp; gaya sitasi
                    </span>
                  </label>
                ) : (
                  <div className="bg-surface-container-low rounded-2xl border border-primary/30 p-4 shadow-xs space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-primary-container text-primary flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-on-surface truncate">{templateFile.name}</p>
                          <p className="text-[10px] text-on-surface-variant font-mono">
                            {(templateFile.size / (1024 * 1024)).toFixed(2)} MB &bull; Target Template Berkas
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-primary text-on-primary text-[10px]">
                        Mode AST XML Aktif
                      </Badge>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant text-xs">
                      <label
                        htmlFor="template-upload"
                        className="font-medium text-on-surface-variant hover:text-primary cursor-pointer"
                      >
                        Ganti File Template
                      </label>
                      <span className="text-on-surface-variant">&bull;</span>
                      <button
                        type="button"
                        onClick={() => setTemplateFile(null)}
                        className="font-medium text-error hover:underline"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                )}

                {/* Optional Preset Selector Fallback Accordion */}
                <div className="pt-2">
                  <p className="text-[11px] font-medium text-on-surface-variant mb-1.5">
                    Atau gunakan starter preset jika belum memiliki file template jurnal:
                  </p>
                  <TemplatePresetSelect
                    value={templatePreset}
                    onChange={setTemplatePreset}
                    hasUploadedTemplate={!!templateFile}
                  />
                </div>
              </div>

              {/* Status / Selected File Info */}
              <div className="p-3 bg-surface/80 border border-primary/20 rounded-xl text-[11px] text-on-primary-container">
                <span className="font-bold text-on-primary-container">Catatan:</span> Naskah Anda diperiksa langsung terhadap file template jurnal yang diunggah, baik berupa pedoman tertulis maupun contoh artikel.
              </div>
            </div>

            {/* Upload Zone B: Author Manuscript Draft (Right) */}
            <div className="flex flex-col justify-between p-5 sm:p-6 rounded-2xl border border-primary/20 bg-primary/5 space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary text-on-primary flex items-center justify-center text-xs font-bold">
                      2
                    </span>
                    <label className="text-xs font-bold text-on-surface">
                      Draft Naskah Anda (.pdf) <span className="text-error">*</span>
                    </label>
                  </div>
                  <Badge variant="default" className="text-[10px]">
                    Naskah Penulis
                  </Badge>
                </div>
                <p className="text-xs text-on-surface-variant">
                  File draft naskah Anda yang akan diperiksa terhadap standar template jurnal di sebelah kiri.
                </p>

                {/* Hidden File Input */}
                <input
                  type="file"
                  accept=".pdf"
                  id="draft-upload"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setDraftFile(e.target.files[0]);
                    }
                  }}
                />

                {/* Dropzone or Loaded Card */}
                {!draftFile ? (
                  <label
                    htmlFor="draft-upload"
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDraftDragOver(true);
                    }}
                    onDragLeave={() => setDraftDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDraftDragOver(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        setDraftFile(e.dataTransfer.files[0]);
                      }
                    }}
                    className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition cursor-pointer block space-y-2.5 bg-surface-container-low hover:bg-primary/5 ${
                      draftDragOver ? "border-primary bg-primary/10 scale-[1.01]" : "border-primary/30"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-on-surface">
                        Drop Author Manuscript PDF here
                      </p>
                      <p className="text-[11px] text-on-surface-variant mt-0.5">or browse from your computer (Max 50MB)</p>
                    </div>
                    <span className="inline-block text-[10px] font-medium text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                      Direct-to-S3 pre-signed upload
                    </span>
                  </label>
                ) : (
                  <div className="bg-surface-container-low rounded-2xl border border-primary/20 p-4 shadow-xs space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-on-surface truncate">{draftFile.name}</p>
                          <p className="text-[10px] text-on-surface-variant font-mono">
                            {(draftFile.size / (1024 * 1024)).toFixed(2)} MB &bull; Author Manuscript
                          </p>
                        </div>
                      </div>
                      <Badge variant="success" className="text-[10px] gap-1">
                        <CheckCircle className="w-3 h-3" /> Ready
                      </Badge>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant text-xs">
                      <label
                        htmlFor="draft-upload"
                        className="font-medium text-on-surface-variant hover:text-primary cursor-pointer"
                      >
                        Change File
                      </label>
                      <span className="text-on-surface-variant">&bull;</span>
                      <button
                        type="button"
                        onClick={() => setDraftFile(null)}
                        className="font-medium text-error hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Status / Selected File Info */}
              {draftFile ? (
                <div className="p-3 bg-success/10 border border-success/20 rounded-xl text-[11px] text-success flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>Draft manuscript verified. Ready for asynchronous pre-submission audit.</span>
                </div>
              ) : (
                <div className="p-3 bg-error/10 border border-error/20 rounded-xl text-[11px] text-error">
                  <span className="font-semibold">Action required:</span> Please select a draft manuscript PDF to proceed.
                </div>
              )}
            </div>
          </div>

          {uploadProgress && (
            <div className="p-3.5 bg-primary/10 border border-primary/20 rounded-2xl flex items-center gap-2 text-xs font-medium text-primary animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span>{uploadProgress}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-outline-variant">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setStep(1)}
              className="text-xs rounded-full text-on-surface-variant hover:text-on-surface"
            >
              &larr; Back
            </Button>
            <Button
              type="button"
              onClick={handleFileUploadAndDispatch}
              disabled={!draftFile || loading}
              className="bg-primary hover:bg-primary text-on-primary font-medium text-xs rounded-full px-6 shadow-xs disabled:opacity-50 gap-2 h-10 active:scale-[0.98] transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Submit &amp; Compare Against Template
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Success & Redirecting */}
      {step === 3 && (
        <div className="bg-surface-container-low p-10 sm:p-14 rounded-3xl border border-outline-variant shadow-elevation-1 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-success/10 text-success flex items-center justify-center mx-auto">
            <CheckCircle className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold text-on-surface tracking-tight">Manuscript &amp; Template Submitted</h2>
          <p className="text-xs sm:text-sm text-on-surface-variant max-w-md mx-auto">
            Both files are securely uploaded to S3. AI Worker is comparing draft layout against template guidelines. Redirecting to live audit report...
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-primary font-medium pt-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Connecting to comparative audit report...</span>
          </div>
        </div>
      )}
    </div>
  );
}
