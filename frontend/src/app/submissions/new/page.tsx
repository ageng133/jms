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

  // Pipeline Tracking
  const [manuscriptId, setManuscriptId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string>("");

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
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Step Indicator */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className={`flex items-center gap-2 text-sm font-semibold ${step >= 1 ? "text-blue-600" : "text-slate-400"}`}>
          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${step >= 1 ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"}`}>
            1
          </span>
          Metadata
        </div>
        <div className="h-0.5 w-12 bg-slate-200" />
        <div className={`flex items-center gap-2 text-sm font-semibold ${step >= 2 ? "text-blue-600" : "text-slate-400"}`}>
          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${step >= 2 ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"}`}>
            2
          </span>
          Upload Template & Draft
        </div>
        <div className="h-0.5 w-12 bg-slate-200" />
        <div className={`flex items-center gap-2 text-sm font-semibold ${step === 3 ? "text-blue-600" : "text-slate-400"}`}>
          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${step === 3 ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"}`}>
            3
          </span>
          AI Pre-Check
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
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900">Manuscript Metadata</h2>
            <p className="text-sm text-slate-500">Enter article title, abstract, and research indexing keywords.</p>
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

      {/* Step 2: Dual File Direct S3 Upload (Template + Draft) */}
      {step === 2 && (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-8">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wide">
                Dual Ingestion Pipeline
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">Upload Template & Manuscript Draft</h2>
            <p className="text-sm text-slate-500">
              Upload the journal reference template alongside your draft. The AI Engine compares geometry, margins, and column layouts directly against the template guidelines.
            </p>
          </div>

          {/* Upload Zone A: Journal Template */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                1. Journal Reference Template (.pdf)
              </label>
              <span className="text-xs text-slate-400">Optional: Falls back to UTS IEEE Standard if omitted</span>
            </div>

            <div className="border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-xl p-6 text-center transition cursor-pointer bg-slate-50/50">
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
              <label htmlFor="template-upload" className="cursor-pointer space-y-2 block">
                <Layers className="w-10 h-10 text-indigo-400 mx-auto" />
                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    {templateFile ? templateFile.name : "Select or drag & drop Journal Template PDF"}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">Defines target margins, column grid & page dimensions</p>
                </div>
              </label>
            </div>

            {templateFile && (
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-between text-xs text-indigo-900">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <span className="font-semibold">{templateFile.name}</span>
                  <span className="text-indigo-600">({(templateFile.size / (1024 * 1024)).toFixed(2)} MB)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setTemplateFile(null)}
                  className="text-xs text-rose-600 hover:underline"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          {/* Upload Zone B: Author Manuscript Draft */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                2. Author Manuscript Draft (.pdf) <span className="text-rose-500">*</span>
              </label>
              <span className="text-xs text-slate-400">Required: Direct-to-S3 upload</span>
            </div>

            <div className="border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-xl p-6 text-center transition cursor-pointer bg-slate-50/50">
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
              <label htmlFor="draft-upload" className="cursor-pointer space-y-2 block">
                <UploadCloud className="w-10 h-10 text-blue-500 mx-auto" />
                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    {draftFile ? draftFile.name : "Select or drag & drop Author Manuscript PDF"}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">Maximum 50MB &bull; .PDF format</p>
                </div>
              </label>
            </div>

            {draftFile && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between text-xs text-blue-900">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold">{draftFile.name}</span>
                  <span className="text-blue-600">({(draftFile.size / (1024 * 1024)).toFixed(2)} MB)</span>
                </div>
                <span className="px-2 py-0.5 bg-blue-200 rounded font-semibold text-blue-800">Ready</span>
              </div>
            )}
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
