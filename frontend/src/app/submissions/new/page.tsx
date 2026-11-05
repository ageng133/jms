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
        template_preset: templatePreset || undefined,
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
        <Loader2 className="w-8 h-8 animate-spin text-[#0071e3] mx-auto mb-3" />
        <p className="text-xs text-[#86868b]">Checking authentication state...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthGateCard
        title="Sign in with Google to Submit & Audit"
        description="Automated pre-submission format auditing, Box cloud storage upload, and visual layout checking require an authenticated Google session."
        actionText="Sign in with Google to Start Submission"
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Step Indicator */}
      <div className="flex items-center justify-between border-b border-black/[0.06] pb-5">
        <div className={`flex items-center gap-2 text-xs font-semibold transition ${step >= 1 ? "text-[#0071e3]" : "text-[#86868b]"}`}>
          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition shadow-xs ${step >= 1 ? "bg-[#0071e3] text-white" : "bg-black/[0.05] text-[#86868b]"}`}>
            1
          </span>
          <span className="hidden sm:inline">Metadata</span>
        </div>
        <div className={`flex-1 h-0.5 mx-3 sm:mx-4 rounded-full transition-colors ${step >= 2 ? "bg-[#0071e3]" : "bg-black/[0.06]"}`} />
        <div className={`flex items-center gap-2 text-xs font-semibold transition ${step >= 2 ? "text-[#0071e3]" : "text-[#86868b]"}`}>
          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition shadow-xs ${step >= 2 ? "bg-[#0071e3] text-white" : "bg-black/[0.05] text-[#86868b]"}`}>
            2
          </span>
          <span className="hidden sm:inline">Upload Template &amp; Draft</span>
        </div>
        <div className={`flex-1 h-0.5 mx-3 sm:mx-4 rounded-full transition-colors ${step === 3 ? "bg-[#34c759]" : "bg-black/[0.06]"}`} />
        <div className={`flex items-center gap-2 text-xs font-semibold transition ${step === 3 ? "text-[#34c759]" : "text-[#86868b]"}`}>
          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition shadow-xs ${step === 3 ? "bg-[#34c759] text-white" : "bg-black/[0.05] text-[#86868b]"}`}>
            3
          </span>
          <span className="hidden sm:inline">AI Pre-Check</span>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-[#ff3b30]/10 border border-[#ff3b30]/20 text-[#ff3b30] text-xs flex items-center gap-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Step 1: Metadata Form */}
      {step === 1 && (
        <form onSubmit={handleMetadataSubmit} className="bg-white p-6 sm:p-8 rounded-3xl border border-black/[0.06] shadow-apple-card space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/[0.06] pb-4">
            <div className="space-y-0.5">
              <h2 className="text-xl font-bold text-[#1d1d1f]">Manuscript Metadata</h2>
              <p className="text-xs text-[#86868b]">Enter article title, abstract, and research indexing keywords.</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrefillDemo}
              className="text-xs text-[#0071e3] rounded-full border-black/[0.08] gap-1.5 self-start sm:self-auto"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Auto-Fill Demo Data</span>
            </Button>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="title" className="text-xs text-[#86868b]">Manuscript Title</Label>
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
              <Label htmlFor="abstract" className="text-xs text-[#86868b]">Abstract</Label>
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
              <Label htmlFor="keywords" className="text-xs text-[#86868b]">Keywords (comma separated)</Label>
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
              className="bg-[#0071e3] hover:bg-[#0077ed] text-white font-medium text-xs rounded-full px-6 shadow-xs disabled:opacity-50 gap-2 h-10 active:scale-[0.98] transition-all"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Next: Upload Files"}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </form>
      )}

      {/* Step 2: Dual File Direct S3 Upload (Template + Draft) - Side by Side */}
      {step === 2 && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-black/[0.06] shadow-apple-card space-y-8">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px]">
                Dual Ingestion Pipeline
              </Badge>
              <Badge variant="default" className="text-[10px]">
                Side-by-Side Verification
              </Badge>
            </div>
            <h2 className="text-xl font-bold text-[#1d1d1f]">Upload Template &amp; Manuscript Draft</h2>
            <p className="text-xs sm:text-sm text-[#86868b]">
              Upload the journal reference template alongside your draft side-by-side. The AI Engine compares geometry, margins, and column layouts directly against the template guidelines.
            </p>
          </div>

          {/* Side-by-Side Dual Upload Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            {/* Upload Zone A: Journal Template (Left) */}
            <div className="flex flex-col justify-between p-5 sm:p-6 rounded-2xl border border-black/[0.08] bg-[#f5f5f7] space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#0071e3]/10 text-[#0071e3] flex items-center justify-center text-xs font-bold">
                      A
                    </span>
                    <label className="text-xs font-semibold text-[#1d1d1f]">
                      Journal Template (.pdf)
                    </label>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    Optional Spec
                  </Badge>
                </div>
                <p className="text-xs text-[#86868b]">
                  Target style guide defining margins, page bounds, and multi-column grids.
                </p>

                <TemplatePresetSelect
                  value={templatePreset}
                  onChange={setTemplatePreset}
                  hasUploadedTemplate={!!templateFile}
                />

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
                    className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition cursor-pointer block space-y-2.5 bg-white hover:bg-black/[0.02] ${
                      templateDragOver ? "border-[#0071e3] bg-[#0071e3]/5 scale-[1.01]" : "border-black/[0.12]"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-2xl bg-[#0071e3]/10 text-[#0071e3] flex items-center justify-center mx-auto">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#1d1d1f]">
                        Drop Journal Template PDF here
                      </p>
                      <p className="text-[11px] text-[#86868b] mt-0.5">or browse from your computer</p>
                    </div>
                    <span className="inline-block text-[10px] font-medium text-[#0071e3] bg-[#0071e3]/10 px-2.5 py-0.5 rounded-full">
                      Extracts target margins &amp; column grid
                    </span>
                  </label>
                ) : (
                  <div className="bg-white rounded-2xl border border-black/[0.08] p-4 shadow-xs space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-[#0071e3]/10 text-[#0071e3] flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#1d1d1f] truncate">{templateFile.name}</p>
                          <p className="text-[10px] text-[#86868b] font-mono">
                            {(templateFile.size / (1024 * 1024)).toFixed(2)} MB &bull; PDF Template
                          </p>
                        </div>
                      </div>
                      <Badge variant="default" className="text-[10px]">
                        Loaded
                      </Badge>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/[0.06] text-xs">
                      <label
                        htmlFor="template-upload"
                        className="font-medium text-[#86868b] hover:text-[#0071e3] cursor-pointer"
                      >
                        Change File
                      </label>
                      <span className="text-[#86868b]">&bull;</span>
                      <button
                        type="button"
                        onClick={() => setTemplateFile(null)}
                        className="font-medium text-[#ff3b30] hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Status / Selected File Info */}
              <div className="p-3 bg-white border border-black/[0.06] rounded-xl text-[11px] text-[#86868b]">
                <span className="font-semibold text-[#1d1d1f]">Fallback Notice:</span> If omitted, the audit automatically evaluates against UTS IEEE Standard formatting rules.
              </div>
            </div>

            {/* Upload Zone B: Author Manuscript Draft (Right) */}
            <div className="flex flex-col justify-between p-5 sm:p-6 rounded-2xl border border-[#0071e3]/20 bg-[#0071e3]/5 space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#0071e3] text-white flex items-center justify-center text-xs font-bold">
                      B
                    </span>
                    <label className="text-xs font-semibold text-[#1d1d1f]">
                      Manuscript Draft (.pdf) <span className="text-[#ff3b30]">*</span>
                    </label>
                  </div>
                  <Badge variant="default" className="text-[10px]">
                    Required Draft
                  </Badge>
                </div>
                <p className="text-xs text-[#86868b]">
                  Camera-ready draft evaluated for margin geometry, anonymization, and citations.
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
                    className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition cursor-pointer block space-y-2.5 bg-white hover:bg-[#0071e3]/5 ${
                      draftDragOver ? "border-[#0071e3] bg-[#0071e3]/10 scale-[1.01]" : "border-[#0071e3]/30"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-2xl bg-[#0071e3]/10 text-[#0071e3] flex items-center justify-center mx-auto">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#1d1d1f]">
                        Drop Author Manuscript PDF here
                      </p>
                      <p className="text-[11px] text-[#86868b] mt-0.5">or browse from your computer (Max 50MB)</p>
                    </div>
                    <span className="inline-block text-[10px] font-medium text-[#0071e3] bg-[#0071e3]/10 px-2.5 py-0.5 rounded-full">
                      Direct-to-S3 pre-signed upload
                    </span>
                  </label>
                ) : (
                  <div className="bg-white rounded-2xl border border-[#0071e3]/20 p-4 shadow-xs space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-[#0071e3]/10 text-[#0071e3] flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#1d1d1f] truncate">{draftFile.name}</p>
                          <p className="text-[10px] text-[#86868b] font-mono">
                            {(draftFile.size / (1024 * 1024)).toFixed(2)} MB &bull; Author Manuscript
                          </p>
                        </div>
                      </div>
                      <Badge variant="success" className="text-[10px] gap-1">
                        <CheckCircle className="w-3 h-3" /> Ready
                      </Badge>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/[0.06] text-xs">
                      <label
                        htmlFor="draft-upload"
                        className="font-medium text-[#86868b] hover:text-[#0071e3] cursor-pointer"
                      >
                        Change File
                      </label>
                      <span className="text-[#86868b]">&bull;</span>
                      <button
                        type="button"
                        onClick={() => setDraftFile(null)}
                        className="font-medium text-[#ff3b30] hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Status / Selected File Info */}
              {draftFile ? (
                <div className="p-3 bg-[#34c759]/10 border border-[#34c759]/20 rounded-xl text-[11px] text-[#34c759] flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>Draft manuscript verified. Ready for asynchronous pre-submission audit.</span>
                </div>
              ) : (
                <div className="p-3 bg-[#ff3b30]/10 border border-[#ff3b30]/20 rounded-xl text-[11px] text-[#ff3b30]">
                  <span className="font-semibold">Action required:</span> Please select a draft manuscript PDF to proceed.
                </div>
              )}
            </div>
          </div>

          {uploadProgress && (
            <div className="p-3.5 bg-[#0071e3]/10 border border-[#0071e3]/20 rounded-2xl flex items-center gap-2 text-xs font-medium text-[#0071e3] animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span>{uploadProgress}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-black/[0.06]">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setStep(1)}
              className="text-xs rounded-full text-[#86868b] hover:text-[#1d1d1f]"
            >
              &larr; Back
            </Button>
            <Button
              type="button"
              onClick={handleFileUploadAndDispatch}
              disabled={!draftFile || loading}
              className="bg-[#0071e3] hover:bg-[#0077ed] text-white font-medium text-xs rounded-full px-6 shadow-xs disabled:opacity-50 gap-2 h-10 active:scale-[0.98] transition-all"
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
        <div className="bg-white p-10 sm:p-14 rounded-3xl border border-black/[0.06] shadow-apple-card text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-[#34c759]/10 text-[#34c759] flex items-center justify-center mx-auto">
            <CheckCircle className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold text-[#1d1d1f] tracking-tight">Manuscript &amp; Template Submitted</h2>
          <p className="text-xs sm:text-sm text-[#86868b] max-w-md mx-auto">
            Both files are securely uploaded to S3. AI Worker is comparing draft layout against template guidelines. Redirecting to live audit report...
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-[#0071e3] font-medium pt-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Connecting to comparative audit report...</span>
          </div>
        </div>
      )}
    </div>
  );
}
