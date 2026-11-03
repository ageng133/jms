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
import {
  createDraftManuscript,
  requestUploadPresign,
  uploadDirectToS3,
  confirmSubmission,
  FileMetadataInput,
} from "@/lib/api";

export default function NewSubmissionPage() {
  const router = useRouter();
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
  const [useDefaultTemplate, setUseDefaultTemplate] = useState(false);
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

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Step Indicator */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-5">
        <div className={`flex items-center gap-2.5 text-sm font-semibold transition ${step >= 1 ? "text-blue-600" : "text-slate-400"}`}>
          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition shadow-sm ${step >= 1 ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"}`}>
            1
          </span>
          <span>Metadata</span>
        </div>
        <div className={`flex-1 h-0.5 mx-4 rounded-full transition-colors ${step >= 2 ? "bg-blue-600" : "bg-slate-200"}`} />
        <div className={`flex items-center gap-2.5 text-sm font-semibold transition ${step >= 2 ? "text-blue-600" : "text-slate-400"}`}>
          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition shadow-sm ${step >= 2 ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"}`}>
            2
          </span>
          <span>Upload Template & Draft</span>
        </div>
        <div className={`flex-1 h-0.5 mx-4 rounded-full transition-colors ${step === 3 ? "bg-blue-600" : "bg-slate-200"}`} />
        <div className={`flex items-center gap-2.5 text-sm font-semibold transition ${step === 3 ? "text-blue-600" : "text-slate-400"}`}>
          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition shadow-sm ${step === 3 ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"}`}>
            3
          </span>
          <span>AI Pre-Check</span>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Step 1: Metadata Form */}
      {step === 1 && (
        <form onSubmit={handleMetadataSubmit} className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="space-y-0.5">
              <h2 className="text-xl font-bold text-slate-900">Manuscript Metadata</h2>
              <p className="text-sm text-slate-500">Enter article title, abstract, and research indexing keywords.</p>
            </div>
            <button
              type="button"
              onClick={handlePrefillDemo}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50/70 text-blue-700 hover:bg-blue-100 text-xs font-semibold transition shadow-sm self-start sm:self-auto"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Auto-Fill Demo Data
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Manuscript Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Distributed Zero-Copy Memory Pipelines for High-Performance Parsing"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Abstract
              </label>
              <textarea
                required
                rows={5}
                value={abstract}
                onChange={(e) => setAbstract(e.target.value)}
                placeholder="Provide a concise 150-300 word summary of research contributions..."
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Keywords (comma separated)
              </label>
              <input
                type="text"
                required
                value={keywordsInput}
                onChange={(e) => setKeywordsInput(e.target.value)}
                placeholder="Distributed systems, PyMuPDF, Document Layout, Arrow IPC"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition shadow-sm disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Next: Upload Files"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      {/* Step 2: Dual File Direct S3 Upload (Template + Draft) - Side by Side */}
      {step === 2 && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-8">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wide">
                Dual Ingestion Pipeline
              </span>
              <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wide">
                Side-by-Side Verification
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">Upload Template & Manuscript Draft</h2>
            <p className="text-sm text-slate-500">
              Upload the journal reference template alongside your draft side-by-side. The AI Engine compares geometry, margins, and column layouts directly against the template guidelines.
            </p>
          </div>

          {/* Side-by-Side Dual Upload Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            {/* Upload Zone A: Journal Template (Left) */}
            <div className="flex flex-col justify-between p-6 rounded-2xl border border-indigo-100 bg-gradient-to-b from-indigo-50/30 to-white shadow-xs space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                      A
                    </span>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Journal Template (.pdf)
                    </label>
                  </div>
                  <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    Optional Spec
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Target style guide defining margins, page bounds, and multi-column grids.
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
                      setUseDefaultTemplate(false);
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
                        setUseDefaultTemplate(false);
                      }
                    }}
                    className={`border-2 border-dashed rounded-xl p-8 text-center transition cursor-pointer block space-y-3 bg-white hover:bg-indigo-50/40 ${
                      templateDragOver ? "border-indigo-500 bg-indigo-50 scale-[1.01]" : "border-indigo-200"
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                      <Layers className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        Drop Journal Template PDF here
                      </p>
                      <p className="text-xs text-slate-400 mt-1">or browse from your computer</p>
                    </div>
                    <span className="inline-block text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
                      Extracts target margins & column grid
                    </span>
                  </label>
                ) : (
                  <div className="bg-white rounded-xl border border-indigo-200 p-5 shadow-sm space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">{templateFile.name}</p>
                          <p className="text-xs text-slate-500 font-mono">
                            {(templateFile.size / (1024 * 1024)).toFixed(2)} MB &bull; PDF Template
                          </p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 text-[11px] font-bold shrink-0">
                        Template Loaded
                      </span>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 text-xs">
                      <label
                        htmlFor="template-upload"
                        className="font-semibold text-slate-600 hover:text-indigo-600 cursor-pointer"
                      >
                        Change File
                      </label>
                      <span className="text-slate-300">&bull;</span>
                      <button
                        type="button"
                        onClick={() => setTemplateFile(null)}
                        className="font-semibold text-rose-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Status / Selected File Info */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-500">
                <span className="font-semibold text-slate-700">Fallback Notice:</span> If omitted, the audit automatically evaluates against UTS IEEE Standard formatting rules.
              </div>
            </div>

            {/* Upload Zone B: Author Manuscript Draft (Right) */}
            <div className="flex flex-col justify-between p-6 rounded-2xl border border-blue-100 bg-gradient-to-b from-blue-50/30 to-white shadow-xs space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                      B
                    </span>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Manuscript Draft (.pdf) <span className="text-rose-500">*</span>
                    </label>
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    Required Draft
                  </span>
                </div>
                <p className="text-xs text-slate-500">
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
                    className={`border-2 border-dashed rounded-xl p-8 text-center transition cursor-pointer block space-y-3 bg-white hover:bg-blue-50/40 ${
                      draftDragOver ? "border-blue-500 bg-blue-50 scale-[1.01]" : "border-blue-300"
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        Drop Author Manuscript PDF here
                      </p>
                      <p className="text-xs text-slate-400 mt-1">or browse from your computer (Max 50MB)</p>
                    </div>
                    <span className="inline-block text-[11px] font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
                      Direct-to-S3 pre-signed upload
                    </span>
                  </label>
                ) : (
                  <div className="bg-white rounded-xl border border-blue-200 p-5 shadow-sm space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">{draftFile.name}</p>
                          <p className="text-xs text-slate-500 font-mono">
                            {(draftFile.size / (1024 * 1024)).toFixed(2)} MB &bull; Author Manuscript
                          </p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold shrink-0 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Ready
                      </span>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 text-xs">
                      <label
                        htmlFor="draft-upload"
                        className="font-semibold text-slate-600 hover:text-blue-600 cursor-pointer"
                      >
                        Change File
                      </label>
                      <span className="text-slate-300">&bull;</span>
                      <button
                        type="button"
                        onClick={() => setDraftFile(null)}
                        className="font-semibold text-rose-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Status / Selected File Info */}
              {draftFile ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] text-emerald-800 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Draft manuscript verified. Ready for asynchronous pre-submission audit.</span>
                </div>
              ) : (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-[11px] text-rose-700">
                  <span className="font-semibold">Action required:</span> Please select a draft manuscript PDF to proceed.
                </div>
              )}
            </div>
          </div>

          {uploadProgress && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2 text-xs font-medium text-slate-700 animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span>{uploadProgress}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-sm font-semibold text-slate-500 hover:text-slate-800"
            >
              &larr; Back
            </button>
            <button
              type="button"
              onClick={handleFileUploadAndDispatch}
              disabled={!draftFile || loading}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition shadow-sm disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Submit & Compare Against Template
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Success & Redirecting */}
      {step === 3 && (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-sm text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Manuscript & Template Submitted</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Both files are securely uploaded to S3. AI Worker is comparing draft layout against template guidelines. Redirecting to live audit report...
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-blue-600 font-medium">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Connecting to comparative audit report...</span>
          </div>
        </div>
      )}
    </div>
  );
}
