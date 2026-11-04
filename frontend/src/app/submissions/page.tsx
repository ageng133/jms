"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Clock, AlertTriangle, CheckCircle, FileCheck, Loader2 } from "lucide-react";
import { Manuscript } from "@/types/jms";
import { listManuscripts } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { AuthGateCard } from "@/components/AuthGateCard";

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: any }> = {
  DRAFT: { label: "Draft", bg: "bg-slate-100", text: "text-slate-700", icon: Clock },
  PRE_CHECK_PENDING: { label: "Pre-Check Pending", bg: "bg-blue-50", text: "text-blue-700", icon: Clock },
  PRE_CHECK_FAILED: { label: "Pre-Check Failed", bg: "bg-rose-50", text: "text-rose-700", icon: AlertTriangle },
  UNDER_DESK_REVIEW: { label: "Under Desk Review", bg: "bg-emerald-50", text: "text-emerald-700", icon: CheckCircle },
  IN_PEER_REVIEW: { label: "In Peer Review", bg: "bg-purple-50", text: "text-purple-700", icon: FileCheck },
  ACCEPTED: { label: "Accepted", bg: "bg-green-50", text: "text-green-700", icon: CheckCircle },
  REJECTED: { label: "Rejected", bg: "bg-red-50", text: "text-red-700", icon: AlertTriangle },
};

export default function SubmissionsPage() {
  const { user, loading: authLoading } = useAuth();
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    async function loadData() {
      try {
        const data = await listManuscripts();
        setManuscripts(data);
      } catch (err: any) {
        setError(err.message || "Failed to load manuscripts");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  if (authLoading) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-3" />
        <p className="text-xs text-slate-500">Checking authorization status...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthGateCard
        title="Sign in with Google to View Submissions"
        description="Your submission records, pre-submission audits, and reviewer logs are tied to your university Google SSO account."
        actionText="Sign in with Google"
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Manuscript Submissions</h1>
          <p className="text-sm text-slate-500">Track and inspect automated pre-submission compliance reports</p>
        </div>
        <Link
          href="/submissions/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Submit Manuscript
        </Link>
      </div>

      {loading && (
        <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
          Loading manuscripts...
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          {error}
        </div>
      )}

      {!loading && manuscripts.length === 0 && (
        <div className="p-12 text-center bg-white rounded-xl border border-dashed border-slate-300 space-y-3">
          <p className="text-slate-500 font-medium">No manuscripts found.</p>
          <Link
            href="/submissions/new"
            className="inline-block text-sm font-semibold text-blue-600 hover:underline"
          >
            Create your first submission &rarr;
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {manuscripts.map((m) => {
          const statusInfo = STATUS_CONFIG[m.status] || STATUS_CONFIG.DRAFT;
          const StatusIcon = statusInfo.icon;
          const latestFile = m.files && m.files.length > 0 ? m.files[m.files.length - 1] : null;
          const latestAudit = latestFile?.audits && latestFile.audits.length > 0 ? latestFile.audits[0] : null;

          return (
            <div
              key={m.id}
              className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
            >
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusInfo.bg} ${statusInfo.text}`}
                  >
                    <StatusIcon className="w-3.5 h-3.5" />
                    {statusInfo.label}
                  </span>
                  <span className="text-xs text-slate-400">
                    ID: {m.id.slice(0, 8)}...
                  </span>
                </div>
                <h2 className="text-lg font-bold text-slate-900 leading-snug">{m.title}</h2>
                <p className="text-sm text-slate-600 line-clamp-2">{m.abstract}</p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {m.keywords.map((kw, idx) => (
                    <span key={idx} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {latestAudit && (
                  <Link
                    href={`/submissions/${m.id}/audit?audit_id=${latestAudit.id}`}
                    className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold transition"
                  >
                    View AI Report
                  </Link>
                )}
                <Link
                  href={`/submissions/${m.id}`}
                  className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold transition"
                >
                  Details
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

