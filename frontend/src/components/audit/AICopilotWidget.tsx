"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Send,
  Loader2,
  Check,
  Copy,
  ShieldAlert,
  Code2,
  BookOpen,
  Ruler,
  GraduationCap,
  Rocket,
  Microscope,
  Briefcase,
  HelpCircle,
  Lightbulb,
  CheckCircle2,
  Bot,
} from "lucide-react";
import {
  AcademicTier,
  CopilotAction,
  AICopilotRequest,
  AICopilotResponse,
} from "@/types/jms";
import { askAICopilot } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AICopilotWidgetProps {
  manuscriptId?: string;
  auditId?: string;
  initialTier?: AcademicTier;
  className?: string;
}

export function AICopilotWidget({
  manuscriptId,
  auditId,
  initialTier = "S1",
  className = "",
}: AICopilotWidgetProps) {
  const [tier, setTier] = useState<AcademicTier>(initialTier);
  const [action, setAction] = useState<CopilotAction>("DEFENSE_PREDICTION");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<AICopilotResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState<number | null>(null);

  // Auto-fetch initial advice when tier changes
  useEffect(() => {
    fetchAdvice(action);
  }, [tier]);

  async function fetchAdvice(targetAction: CopilotAction, customPrompt?: string) {
    setLoading(true);
    setError(null);
    setAction(targetAction);

    try {
      const data = await askAICopilot({
        manuscript_id: manuscriptId,
        audit_id: auditId,
        academic_level: tier,
        action: targetAction,
        prompt: customPrompt || `Tolong berikan panduan ${targetAction} untuk jenjang ${tier}`,
      });
      setResponse(data);
    } catch (err: any) {
      setError(err.message || "Gagal menghubungi Format Kilat AI Copilot");
    } finally {
      setLoading(false);
    }
  }

  function handleCustomSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;
    fetchAdvice("CHAT", prompt.trim());
    setPrompt("");
  }

  function copyCode(snippet: string, idx: number) {
    navigator.clipboard.writeText(snippet);
    setCopiedSnippet(idx);
    setTimeout(() => setCopiedSnippet(null), 2500);
  }

  return (
    <div className={`rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-white via-indigo-50/20 to-purple-50/30 shadow-xl overflow-hidden ${className}`}>
      {/* 1. Header with Vibrant Aurora Gradient */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white relative overflow-hidden">
        {/* Ambient Glow Orbs */}
        <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-white/20 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-pink-400/30 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner border border-white/25">
              <Bot className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold tracking-tight">Format Kilat AI Academic Copilot</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/25 text-white backdrop-blur-xs border border-white/30 uppercase tracking-wider">
                  Live Assistant
                </span>
              </div>
              <p className="text-xs text-indigo-100 mt-0.5">
                Dampingi naskah S1, S2, S3, dan Dosen Muda agar format rapi dan siap kirim!
              </p>
            </div>
          </div>

          {response?.engine_mode && (
            <Badge className="bg-white/15 text-white border-white/30 text-[10px] self-start sm:self-auto backdrop-blur-md">
              ⚡ {response.engine_mode.replace(/_/g, " ")}
            </Badge>
          )}
        </div>

        {/* 2. Zilenial Academic Level Tabs */}
        <div className="relative z-10 mt-5 pt-4 border-t border-white/20">
          <div className="text-[11px] font-semibold text-indigo-100 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Pilih Jenjang Akademik Anda:</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* S1 */}
            <button
              type="button"
              onClick={() => setTier("S1")}
              className={`py-2 px-3 rounded-2xl text-left text-xs font-semibold transition-all flex items-center gap-2 ${
                tier === "S1"
                  ? "bg-white text-indigo-900 shadow-md scale-102"
                  : "bg-white/10 hover:bg-white/20 text-white border border-white/15"
              }`}
            >
              <span className="w-6 h-6 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
                🎓
              </span>
              <div className="truncate">
                <div>S1 Skripsi</div>
                <div className={`text-[10px] font-normal ${tier === "S1" ? "text-indigo-600" : "text-indigo-200"}`}>
                  Margin 4-4-3-3 &amp; Sidang
                </div>
              </div>
            </button>

            {/* S2 */}
            <button
              type="button"
              onClick={() => setTier("S2")}
              className={`py-2 px-3 rounded-2xl text-left text-xs font-semibold transition-all flex items-center gap-2 ${
                tier === "S2"
                  ? "bg-white text-indigo-900 shadow-md scale-102"
                  : "bg-white/10 hover:bg-white/20 text-white border border-white/15"
              }`}
            >
              <span className="w-6 h-6 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0">
                🚀
              </span>
              <div className="truncate">
                <div>S2 Tesis</div>
                <div className={`text-[10px] font-normal ${tier === "S2" ? "text-indigo-600" : "text-indigo-200"}`}>
                  IEEE 2-Kolom &amp; Overleaf
                </div>
              </div>
            </button>

            {/* S3 */}
            <button
              type="button"
              onClick={() => setTier("S3")}
              className={`py-2 px-3 rounded-2xl text-left text-xs font-semibold transition-all flex items-center gap-2 ${
                tier === "S3"
                  ? "bg-white text-indigo-900 shadow-md scale-102"
                  : "bg-white/10 hover:bg-white/20 text-white border border-white/15"
              }`}
            >
              <span className="w-6 h-6 rounded-xl bg-purple-500/20 text-pink-300 flex items-center justify-center shrink-0">
                🔬
              </span>
              <div className="truncate">
                <div>S3 Disertasi</div>
                <div className={`text-[10px] font-normal ${tier === "S3" ? "text-indigo-600" : "text-indigo-200"}`}>
                  Scopus Q1 &amp; Retraksi
                </div>
              </div>
            </button>

            {/* Lecturer */}
            <button
              type="button"
              onClick={() => setTier("LECTURER")}
              className={`py-2 px-3 rounded-2xl text-left text-xs font-semibold transition-all flex items-center gap-2 ${
                tier === "LECTURER"
                  ? "bg-white text-indigo-900 shadow-md scale-102"
                  : "bg-white/10 hover:bg-white/20 text-white border border-white/15"
              }`}
            >
              <span className="w-6 h-6 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
                ⚡
              </span>
              <div className="truncate">
                <div>Dosen Muda</div>
                <div className={`text-[10px] font-normal ${tier === "LECTURER" ? "text-indigo-600" : "text-indigo-200"}`}>
                  SINTA 1-6 &amp; Luaran BKD
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Quick Action Chips */}
      <div className="p-4 sm:p-5 bg-white border-b border-black/[0.06] flex flex-wrap gap-2 items-center">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1 flex items-center gap-1">
          <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
          Aksi Cepat 1-Klik:
        </span>

        <button
          onClick={() => fetchAdvice("DEFENSE_PREDICTION")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
            action === "DEFENSE_PREDICTION"
              ? "bg-indigo-600 text-white shadow-xs font-semibold"
              : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/60"
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Prediksi Pertanyaan Sidang &amp; Reviewer</span>
        </button>

        <button
          onClick={() => fetchAdvice("LATEX_FIX")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
            action === "LATEX_FIX"
              ? "bg-purple-600 text-white shadow-xs font-semibold"
              : "bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200/60"
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>Kode Overleaf &amp; LaTeX Fix</span>
        </button>

        <button
          onClick={() => fetchAdvice("BIBTEX_FIX")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
            action === "BIBTEX_FIX"
              ? "bg-emerald-600 text-white shadow-xs font-semibold"
              : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60"
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Perbaiki BibTeX &amp; DOI</span>
        </button>

        <button
          onClick={() => fetchAdvice("MARGIN_EXPLAIN")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
            action === "MARGIN_EXPLAIN"
              ? "bg-amber-600 text-white shadow-xs font-semibold"
              : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/60"
          }`}
        >
          <Ruler className="w-3.5 h-3.5" />
          <span>Aturan Margin 4-4-3-3</span>
        </button>
      </div>

      {/* 4. Active Copilot Output Area */}
      <div className="p-5 sm:p-6 space-y-5">
        {loading ? (
          <div className="py-12 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
            <p className="text-xs font-medium text-slate-500">
              Format Kilat AI sedang menganalisis naskah untuk jenjang {tier}...
            </p>
          </div>
        ) : error ? (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            {error}
          </div>
        ) : response ? (
          <div className="space-y-4">
            {/* Main Response Box */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-indigo-100 shadow-2xs space-y-3">
              <div className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-line">
                {response.response}
              </div>
            </div>

            {/* Defense Questions Box (If action is DEFENSE_PREDICTION) */}
            {response.defense_predictions && response.defense_predictions.length > 0 && (
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-900">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <span>Prediksi Pertanyaan Penguji / Reviewer:</span>
                </div>
                <div className="space-y-2">
                  {response.defense_predictions.map((q, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 p-3 rounded-xl bg-white border border-amber-200/60 text-xs text-slate-800">
                      <span className="font-bold text-amber-600 font-mono">Q{idx + 1}:</span>
                      <span className="font-medium">{q}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested Code Snippets (If LaTeX / BibTeX) */}
            {response.suggested_snippets && response.suggested_snippets.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Code2 className="w-4 h-4 text-indigo-600" />
                    <span>Kode Perbaikan Camera-Ready:</span>
                  </span>
                </div>

                {response.suggested_snippets.map((snip, idx) => (
                  <div key={idx} className="relative rounded-2xl bg-slate-950 p-4 border border-slate-800 text-xs font-mono text-cyan-300 shadow-md">
                    <button
                      onClick={() => copyCode(snip, idx)}
                      className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-sans flex items-center gap-1.5 transition active:scale-95"
                    >
                      {copiedSnippet === idx ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400 font-semibold">Tersalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Salin Kode</span>
                        </>
                      )}
                    </button>
                    <pre className="overflow-x-auto pt-2 pb-1 pr-16">{snip}</pre>
                  </div>
                ))}
              </div>
            )}

            {/* Academic Action Checklist */}
            {response.checklist && response.checklist.length > 0 && (
              <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200/70 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Checklist Kelulusan Format ({tier}):</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-800">
                  {response.checklist.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 rounded-xl bg-white border border-emerald-200/50">
                      <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                        ✓
                      </span>
                      <span className="font-medium truncate">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* 5. Interactive Chat Form */}
        <form onSubmit={handleCustomSubmit} className="pt-2">
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white border border-indigo-200 shadow-xs focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
            <input
              type="text"
              placeholder={`Tanyakan hal spesifik untuk jenjang ${tier} (misal: 'Cara kecilkan tabel di Overleaf', 'Contoh abstrak APA')...`}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="flex-1 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 bg-transparent outline-none"
            />
            <Button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-3.5 h-8 text-xs font-semibold gap-1.5 shadow-xs shrink-0"
            >
              <span>Kirim</span>
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
