"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  FileText,
  ArrowLeft,
  Sparkles,
  Calendar,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Clock,
  User,
} from "lucide-react";
import { Manuscript } from "@/types/jms";
import { getLatestAudit, getManuscript } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { AuthGateCard } from "@/components/AuthGateCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function ManuscriptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const { user, loading: authLoading } = useAuth();
  const [manuscript, setManuscript] = useState<Manuscript | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    async function load() {
      try {
        setLoading(true);
        const found = await getManuscript(resolvedParams.id);
        setManuscript(found);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user, resolvedParams.id]);

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
        title="Sign in with Google to View Manuscript"
        description="Manuscript details and submission files are restricted to authenticated university users."
        actionText="Sign in with Google"
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-on-surface-variant hover:text-on-surface transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Dashboard
      </Link>

      {loading ? (
        <div className="p-16 text-center bg-surface-container-low rounded-3xl border border-outline-variant shadow-elevation-1 space-y-2">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
          <p className="text-xs text-on-surface-variant">Loading manuscript details...</p>
        </div>
      ) : !manuscript ? (
        <div className="p-16 text-center bg-surface-container-low rounded-3xl border border-dashed border-outline-variant space-y-3">
          <p className="text-sm font-semibold text-on-surface">Manuscript not found</p>
          <Link href="/admin">
            <Button variant="outline" size="sm" className="rounded-full text-xs">
              Return to Submissions
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-surface-container-low rounded-3xl p-6 sm:p-8 border border-outline-variant shadow-elevation-1 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant pb-4">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="text-[11px]">
                  {manuscript.status}
                </Badge>
                <span className="text-xs text-on-surface-variant font-mono">
                  ID: {manuscript.id}
                </span>
              </div>

              <Link
                href={
                  getLatestAudit(manuscript)
                    ? `/submissions/${manuscript.id}/audit?audit_id=${getLatestAudit(manuscript)!.id}`
                    : `/submissions/${manuscript.id}/audit`
                }
              >
                <Button className="bg-primary hover:bg-primary text-on-primary text-xs font-medium rounded-full shadow-xs gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Inspect Audit Report</span>
                </Button>
              </Link>
            </div>

            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight">
                {manuscript.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-xs text-on-surface-variant">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-primary" />
                  {manuscript.author?.full_name || "Author"} &bull; {manuscript.author?.affiliation || "UTS"}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Submitted on {new Date(manuscript.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <h2 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                Abstract
              </h2>
              <p className="text-xs sm:text-sm text-on-surface leading-relaxed bg-surface-container p-4 rounded-2xl border border-outline-variant">
                {manuscript.abstract}
              </p>
            </div>

            <div className="space-y-1.5 pt-1">
              <h2 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                Keywords
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {manuscript.keywords.map((kw, i) => (
                  <span
                    key={i}
                    className="text-xs bg-on-surface/[0.05] text-on-surface px-3 py-1 rounded-full font-medium"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Files List Card */}
          <Card className="rounded-3xl border border-outline-variant shadow-elevation-1">
            <CardHeader className="border-b border-outline-variant pb-3">
              <CardTitle className="text-base text-on-surface">Associated Files &amp; Storage</CardTitle>
              <CardDescription className="text-xs text-on-surface-variant">
                S3 / Box cloud files attached to this manuscript submission.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {manuscript.files && manuscript.files.length > 0 ? (
                <div className="space-y-3">
                  {manuscript.files.map((f) => (
                    <div
                      key={f.id}
                      className="p-3.5 rounded-2xl bg-surface-container border border-outline-variant flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-on-surface truncate">{f.original_filename}</p>
                          <p className="text-[11px] text-on-surface-variant font-mono">
                            Role: {f.file_role} &bull; {(f.file_size_bytes / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">
                        {f.file_role}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-on-surface-variant">No file attachments registered.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

