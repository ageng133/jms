"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Clock, AlertTriangle, CheckCircle, FileCheck, Loader2, Sparkles } from "lucide-react";
import { Manuscript } from "@/types/jms";
import { getLatestAudit, listManuscripts } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { AuthGateCard } from "@/components/AuthGateCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const STATUS_CONFIG: Record<string, { label: string; badgeVariant: "default" | "secondary" | "success" | "warning" | "destructive" | "info"; icon: any }> = {
  DRAFT: { label: "Draft", badgeVariant: "secondary", icon: Clock },
  PRE_CHECK_PENDING: { label: "Pre-Check Pending", badgeVariant: "info", icon: Clock },
  PRE_CHECK_FAILED: { label: "Pre-Check Failed", badgeVariant: "destructive", icon: AlertTriangle },
  UNDER_DESK_REVIEW: { label: "Under Desk Review", badgeVariant: "warning", icon: CheckCircle },
  IN_PEER_REVIEW: { label: "In Peer Review", badgeVariant: "default", icon: FileCheck },
  ACCEPTED: { label: "Accepted", badgeVariant: "success", icon: CheckCircle },
  REJECTED: { label: "Rejected", badgeVariant: "destructive", icon: AlertTriangle },
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
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
        <p className="text-xs text-on-surface-variant">Checking authorization status...</p>
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
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface tracking-tight">Manuscript Submissions</h1>
          <p className="text-xs sm:text-sm text-on-surface-variant">Track and inspect automated pre-submission compliance reports</p>
        </div>
        <Link href="/submissions/new">
          <Button className="bg-primary hover:bg-primary text-on-primary font-medium text-xs rounded-full gap-1.5 shadow-xs h-9 px-4 active:scale-[0.98] transition-all">
            <Plus className="w-4 h-4" />
            <span>Submit Manuscript</span>
          </Button>
        </Link>
      </div>

      {loading && (
        <div className="p-16 text-center text-on-surface-variant bg-surface-container-low rounded-3xl border border-outline-variant shadow-elevation-1 space-y-2">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
          <p className="text-xs">Loading submissions...</p>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-error/10 border border-error/20 text-error text-xs">
          {error}
        </div>
      )}

      {!loading && manuscripts.length === 0 && (
        <div className="p-16 text-center bg-surface-container-low rounded-3xl border border-dashed border-outline-variant space-y-3">
          <p className="text-on-surface-variant text-sm font-medium">No manuscripts found.</p>
          <Link href="/submissions/new">
            <Button variant="outline" size="sm" className="rounded-full text-xs text-primary">
              Create your first submission &rarr;
            </Button>
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {manuscripts.map((m) => {
          const statusInfo = STATUS_CONFIG[m.status] || STATUS_CONFIG.DRAFT;
          const StatusIcon = statusInfo.icon;
          const latestAudit = getLatestAudit(m);

          return (
            <div
              key={m.id}
              className="bg-surface-container-low p-5 sm:p-6 rounded-2xl border border-outline-variant shadow-elevation-1 hover:shadow-elevation-2 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
            >
              <div className="space-y-2 max-w-2xl min-w-0">
                <div className="flex items-center gap-2.5">
                  <Badge variant={statusInfo.badgeVariant} className="text-[11px] gap-1">
                    <StatusIcon className="w-3 h-3" />
                    <span>{statusInfo.label}</span>
                  </Badge>
                  <span className="text-[11px] text-on-surface-variant font-mono">
                    ID: {m.id.slice(0, 8)}...
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-bold text-on-surface leading-snug">
                  {m.title}
                </h2>
                <p className="text-xs sm:text-sm text-on-surface-variant line-clamp-2 leading-relaxed">
                  {m.abstract}
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {m.keywords.map((kw, idx) => (
                    <span
                      key={idx}
                      className="text-[11px] bg-on-surface/[0.04] text-on-surface px-2.5 py-0.5 rounded-full font-medium"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto pt-2 sm:pt-0">
                {latestAudit && (
                  <Link
                    href={`/submissions/${m.id}/audit?audit_id=${latestAudit.id}`}
                    className="flex-1 sm:flex-initial"
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs rounded-full gap-1.5 border-outline-variant hover:bg-on-surface/[0.04]"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                      <span>View AI Report</span>
                    </Button>
                  </Link>
                )}
                <Link href={`/submissions/${m.id}`} className="flex-1 sm:flex-initial">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs rounded-full hover:bg-on-surface/[0.04]"
                  >
                    Details
                  </Button>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
