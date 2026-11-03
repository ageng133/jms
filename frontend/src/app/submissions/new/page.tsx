"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, CheckCircle, ArrowRight, Loader2, FileText, AlertCircle } from "lucide-react";
import {
  createDraftManuscript,
  requestUploadPresign,
  uploadDirectToS3,
  confirmSubmission,
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
  const [file, setFile] = useState<File | null>(null);

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

  // Step 2 & 3: Direct S3 Upload and Enqueue AI Pre-Check
  async function handleFileUploadAndDispatch() {
    if (!file || !manuscriptId) {
      setError("Please select a PDF file first");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      // Step A: Get Presigned PUT URL
      setUploadProgress("Generating secure upload URL...");
      const presign = await requestUploadPresign(manuscriptId, file.name, "PDF");

      // Step B: Upload file directly to S3/MinIO
      setUploadProgress("Uploading manuscript directly to S3 storage...");
      await uploadDirectToS3(presign.upload_url, file);

      // Step C: Confirm submission in Gateway & Dispatch Redis event
      setUploadProgress("Enqueuing AI Pre-Submission Audit...");
      const confirmResult = await confirmSubmission(manuscriptId, {
        s3_key: presign.s3_key,
        file_type: "PDF",
        original_filename: file.name,
        file_size_bytes: file.size,
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
          Direct S3 Upload
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
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Next: Upload File"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      {/* Step 2: Direct S3 Upload */}
      {step === 2 && (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900">Upload Manuscript File</h2>
            <p className="text-sm text-slate-500">
              Upload PDF manuscript. Direct-to-S3 upload ensures zero gateway memory pressure.
            </p>
          </div>

          <div className="border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-xl p-8 text-center transition cursor-pointer bg-slate-50/50">
            <input
              type="file"
              accept=".pdf"
              id="file-upload"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setFile(e.target.files[0]);
                }
              }}
            />
            <label htmlFor="file-upload" className="cursor-pointer space-y-3 block">
              <UploadCloud className="w-12 h-12 text-slate-400 mx-auto" />
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  {file ? file.name : "Click to select or drag and drop manuscript PDF"}
                </p>
                <p className="text-xs text-slate-400 mt-1">Maximum 50MB &bull; .PDF format</p>
              </div>
            </label>
          </div>

          {file && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between text-sm text-blue-900">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="font-medium">{file.name}</span>
                <span className="text-xs text-blue-600">({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 bg-blue-200 rounded text-blue-800">Ready</span>
            </div>
          )}

          {uploadProgress && (
            <div className="flex items-center gap-2 text-xs font-medium text-slate-600 animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
              <span>{uploadProgress}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-4">
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
              disabled={!file || loading}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition shadow-sm disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit & Launch AI Pre-Check"}
              <ArrowRight className="w-4 h-4" />
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
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Manuscript Submitted Successfully</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Your file is safely persisted in S3 and queued in Redis for async pre-submission audit. Redirecting to live inspection...
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-blue-600 font-medium">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Connecting to AI Audit report...</span>
          </div>
        </div>
      )}
    </div>
  );
}
