"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  FileText,
  Layers,
  Loader2,
  RefreshCw,
  Search,
  LogOut,
  ExternalLink,
  Plus,
  Sparkles,
  Box,
  UploadCloud,
  AlertCircle,
  Send,
  LayoutDashboard,
  FileCheck2,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  PanelLeft,
  X,
} from "lucide-react";
import {
  listManuscripts,
  updateManuscriptStatus,
  createDraftManuscript,
  requestUploadPresign,
  uploadDirectToS3,
  confirmSubmission,
  FileMetadataInput,
  getAuditReport,
  getLatestAudit,
} from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { SystemStatusPanel } from "@/components/SystemStatusPanel";
import { AuthGateCard } from "@/components/AuthGateCard";
import { TemplatePresetSelect, useTemplatePresets } from "@/components/TemplatePresetSelect";
import { GoogleLogo } from "@/components/GoogleAuthModal";
import { Manuscript, PreSubmissionAuditReport } from "@/types/jms";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/** Link to the audit report of the manuscript's latest audit. */
function auditHref(m: Manuscript): string {
  const audit = getLatestAudit(m);
  return audit ? `/submissions/${m.id}/audit?audit_id=${audit.id}` : `/submissions/${m.id}/audit`;
}

/** Real score badge derived from the latest audit (replaces the old hardcoded 95/100). */
function ScoreBadge({ manuscript }: { manuscript: Manuscript }) {
  const audit = getLatestAudit(manuscript);
  if (!audit) {
    return (
      <Badge variant="secondary" className="text-[10px]">
        No audit yet
      </Badge>
    );
  }
  if (audit.status === "QUEUED" || audit.status === "PROCESSING") {
    return (
      <Badge variant="warning" className="text-[10px]">
        Checking...
      </Badge>
    );
  }
  if (audit.status === "FAILED" || audit.score_overall == null) {
    return (
      <Badge variant="destructive" className="text-[10px]">
        Audit failed
      </Badge>
    );
  }
  const passed = audit.summary?.status ? audit.summary.status === "PASS" : audit.score_overall >= 80;
  return (
    <Badge variant={passed ? "success" : "destructive"} className="text-[10px]">
      Score: {audit.score_overall}/100
    </Badge>
  );
}
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Input, Textarea, Label } from "@/components/ui/input";

export default function AdminPortalPage() {
  const router = useRouter();
  const { user, signOut, signInWithGoogle, openGoogleModal, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<"overview" | "submissions" | "new-submission" | "templates">("overview");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // In-Admin Submission Studio State
  const [submissionStep, setSubmissionStep] = useState<1 | 2 | 3>(1);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [abstract, setAbstract] = useState("");
  const [keywordsInput, setKeywordsInput] = useState("");
  const [draftFile, setDraftFile] = useState<File | null>(null);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templatePreset, setTemplatePreset] = useState<string>("");
  const [manuscriptId, setManuscriptId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [submittedAuditId, setSubmittedAuditId] = useState<string | null>(null);
  const [submittedReport, setSubmittedReport] = useState<PreSubmissionAuditReport | null>(null);

  // Poll the freshly submitted audit so step 3 shows the real score, not a placeholder.
  useEffect(() => {
    setSubmittedReport(null);
    if (!submittedAuditId) return;

    const auditId = submittedAuditId;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function tick() {
      try {
        const r = await getAuditReport(auditId);
        if (cancelled) return;
        setSubmittedReport(r);
        if (r.status === "QUEUED" || r.status === "PROCESSING") {
          timer = setTimeout(tick, 2000);
        } else {
          fetchSubmissions();
        }
      } catch {
        if (!cancelled) timer = setTimeout(tick, 4000);
      }
    }
    tick();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submittedAuditId]);

  async function fetchSubmissions() {
    try {
      setLoading(true);
      const list = await listManuscripts();
      setManuscripts(list);
    } catch (err: any) {
      console.error("Failed to fetch submissions:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn(role: "ADMIN" | "AUTHOR") {
    try {
      setLoading(true);
      await signInWithGoogle({
        email:
          role === "ADMIN"
            ? "editor.google@uts.edu.au"
            : "author.google@uts.edu.au",
        full_name:
          role === "ADMIN" ? "Prof. Dr. Sarah Connor" : "Dr. Alexander Wright",
        role: role,
        affiliation: "UTS Faculty of Engineering & IT",
      });
      await fetchSubmissions();
    } catch (err: any) {
      alert("Sign-in error: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleSignOut() {
    signOut();
    router.push("/");
  }

  useEffect(() => {
    if (user) {
      fetchSubmissions();
    } else {
      setLoading(false);
    }
  }, [user]);

  async function handleStatusChange(id: string, newStatus: string) {
    setActionLoading(id);
    try {
      await updateManuscriptStatus(id, newStatus);
      setSuccessToast(`Paper status updated to: ${newStatus}`);
      setTimeout(() => setSuccessToast(null), 3000);
      await fetchSubmissions();
    } catch (err: any) {
      alert("Failed to update status: " + err.message);
    } finally {
      setActionLoading(null);
    }
  }

  function handlePrefillDemo() {
    setTitle("A Comparative Study of Efficient File Ingestion in Academic Web Portals");
    setAbstract(
      "Managing academic journal submissions requires balance between strict formatting rules and fast author feedback. This paper presents a lean web architecture utilizing cloud storage adapters and multimodal vision models to automate pre-screening of PDF formatting."
    );
    setKeywordsInput("Academic Publishing, Document Processing, Cloud Storage, Automated Pre-Screening");
  }

  async function handleCreateDraft(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitLoading(true);

    try {
      const keywords = keywordsInput
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k.length > 0);

      const m = await createDraftManuscript({ title, abstract, keywords });
      setManuscriptId(m.id);
      setSubmissionStep(2);
    } catch (err: any) {
      setSubmitError(err.message || "Failed to create submission record");
    } finally {
      setSubmitLoading(false);
    }
  }

  async function handleDualUploadToBox() {
    if (!draftFile || !manuscriptId) {
      setSubmitError("Please select your draft manuscript PDF");
      return;
    }

    setSubmitError(null);
    setSubmitLoading(true);

    try {
      let templateMeta: FileMetadataInput | undefined = undefined;

      if (templateFile) {
        setUploadProgress("Uploading reference template to Box...");
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

      setUploadProgress("Uploading your manuscript PDF to Box...");
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

      setUploadProgress("Starting the automated format check...");
      const confirmRes = await confirmSubmission(manuscriptId, {
        draft_file: draftMeta,
        template_file: templateMeta,
        template_preset: templatePreset || undefined,
      });

      setSubmittedAuditId(confirmRes.audit_id);
      setSubmissionStep(3);
      setSuccessToast("Files uploaded and format check complete!");
      setTimeout(() => setSuccessToast(null), 3000);
      await fetchSubmissions();
    } catch (err: any) {
      setSubmitError(err.message || "Upload failed");
    } finally {
      setSubmitLoading(false);
    }
  }

  function handleResetSubmission() {
    setSubmissionStep(1);
    setTitle("");
    setAbstract("");
    setKeywordsInput("");
    setDraftFile(null);
    setTemplateFile(null);
    setManuscriptId(null);
    setSubmittedAuditId(null);
    setUploadProgress("");
  }

  const filteredManuscripts = manuscripts.filter((m) => {
    const matchesFilter =
      filterStatus === "ALL" ||
      m.status === filterStatus ||
      (filterStatus === "PRE_CHECK_FAILED" && m.status === "PRE_CHECK_FAILED") ||
      (filterStatus === "UNDER_REVIEW" &&
        (m.status === "UNDER_DESK_REVIEW" || m.status === "IN_PEER_REVIEW"));

    const matchesSearch =
      m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.id.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const totalSubmissions = manuscripts.length;
  const deskReviewCount = manuscripts.filter(
    (m) => m.status === "UNDER_DESK_REVIEW" || m.status === "PRE_CHECK_PENDING"
  ).length;
  const compliantCount = manuscripts.filter(
    (m) => m.status === "ACCEPTED" || m.status === "IN_PEER_REVIEW"
  ).length;
  const passRate =
    totalSubmissions > 0
      ? Math.round((compliantCount / totalSubmissions) * 100)
      : 92;

  // 1. UNAUTHENTICATED STATE GUARD
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#0071e3] mb-3" />
        <p className="text-xs text-slate-500 font-medium">Authenticating UTS session...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <AuthGateCard
          title="Admin Dashboard Authentication Required"
          description="Access to manuscript triage, peer review queues, Box storage tickets, and live format audits requires an authenticated UTS Google session."
          actionText="Sign In with Google"
        />
      </div>
    );
  }

  // 2. AUTHENTICATED DEDICATED ADMIN SHELL (SIDEBAR + MAIN CANVAS)
  function renderSidebarContent() {
    return (
      <div className="flex flex-col justify-between h-full bg-white/95">
        <div>
          {/* Workspace Brand Header */}
          <div className="p-4 sm:p-5 border-b border-black/[0.06] flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2.5 group">
              <span className="w-7 h-7 rounded-lg bg-[#0071e3] flex items-center justify-center text-xs font-bold text-white shadow-xs group-hover:scale-105 transition-transform">
                ⚡
              </span>
              <div>
                <div className="text-sm font-semibold tracking-tight text-[#1d1d1f] leading-tight">
                  Format Kilat
                </div>
                <div className="text-[10px] text-[#86868b] font-medium">
                  Workspace &amp; Review Desk
                </div>
              </div>
            </Link>
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-[#86868b] hover:text-[#1d1d1f] hover:bg-black/[0.05]"
              aria-label="Close Sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1 text-xs font-medium">
            <button
              onClick={() => {
                setActiveTab("overview");
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all ${
                activeTab === "overview"
                  ? "bg-black/[0.06] text-[#1d1d1f] font-semibold shadow-2xs"
                  : "text-[#86868b] hover:bg-black/[0.03] hover:text-[#1d1d1f]"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("submissions");
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all ${
                activeTab === "submissions"
                  ? "bg-black/[0.06] text-[#1d1d1f] font-semibold shadow-2xs"
                  : "text-[#86868b] hover:bg-black/[0.03] hover:text-[#1d1d1f]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4" />
                <span>All Submissions</span>
              </div>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {manuscripts.length}
              </Badge>
            </button>

            <button
              onClick={() => {
                setActiveTab("new-submission");
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all ${
                activeTab === "new-submission"
                  ? "bg-black/[0.06] text-[#1d1d1f] font-semibold shadow-2xs"
                  : "text-[#86868b] hover:bg-black/[0.03] hover:text-[#1d1d1f]"
              }`}
            >
              <Plus className="w-4 h-4 text-[#0071e3]" />
              <span>Submit Paper</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("templates");
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all ${
                activeTab === "templates"
                  ? "bg-black/[0.06] text-[#1d1d1f] font-semibold shadow-2xs"
                  : "text-[#86868b] hover:bg-black/[0.03] hover:text-[#1d1d1f]"
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Journal Templates</span>
            </button>
          </nav>

          {/* System Telemetry (live from GET /system/status) */}
          <SystemStatusPanel />
        </div>

        {/* User Profile Card at Bottom */}
        <div className="p-3 border-t border-black/[0.06] bg-black/[0.01]">
          <div className="flex items-center space-x-3 p-2 rounded-xl bg-black/[0.02]">
            <div className="w-8 h-8 rounded-full bg-[#0071e3] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
              {user?.full_name?.charAt(0) || "U"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-[#1d1d1f] truncate">
                {user?.full_name || "User"}
              </div>
              <div className="text-[10px] text-[#86868b] truncate flex items-center gap-1">
                <span>{user?.role === "ADMIN" ? "Managing Editor" : "Author"}</span>
                <span className="text-slate-300">&bull;</span>
                <span className="text-[#0071e3] font-medium">Google SSO</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2.5 px-1 text-[11px]">
            <button
              onClick={() =>
                handleGoogleSignIn(
                  user?.role === "ADMIN" ? "AUTHOR" : "ADMIN"
                )
              }
              className="text-[#0071e3] hover:underline font-medium"
            >
              Switch to {user?.role === "ADMIN" ? "Author" : "Editor"}
            </button>

            <button
              onClick={handleSignOut}
              className="text-[#86868b] hover:text-[#ff3b30] font-medium flex items-center gap-1 transition-colors"
            >
              <LogOut className="w-3 h-3" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex text-[#1d1d1f]">
      {/* SUCCESS TOAST */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-2xl bg-[#34c759] text-white px-4 py-3 shadow-lg flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-bottom">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden lg:flex w-64 bg-white/80 backdrop-blur-xl border-r border-black/[0.06] flex-col justify-between shrink-0 h-screen sticky top-0 shadow-xs">
        {renderSidebarContent()}
      </aside>

      {/* MOBILE / TABLET DRAWER */}
      {mobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] bg-white h-full z-10 shadow-2xl p-0 animate-in slide-in-from-left duration-200">
            {renderSidebarContent()}
          </aside>
        </div>
      )}

      {/* =========================================================================
          MAIN CONTENT CANVAS
         ========================================================================= */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header Bar */}
        <header className="h-14 bg-white/80 backdrop-blur-xl border-b border-black/[0.06] px-4 sm:px-6 lg:px-8 flex items-center justify-between shrink-0 sticky top-0 z-30">
          <div className="flex items-center space-x-2.5 text-xs text-[#86868b]">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-1.5 -ml-1 rounded-lg text-[#1d1d1f] hover:bg-black/[0.05] transition"
              aria-label="Open sidebar"
            >
              <PanelLeft className="w-5 h-5" />
            </button>
            <span className="hidden sm:inline">Admin Portal</span>
            <span className="hidden sm:inline">/</span>
            <span className="text-[#1d1d1f] font-semibold capitalize">
              {activeTab === "new-submission" ? "Submit Paper" : activeTab}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {activeTab !== "new-submission" && (
              <Button
                size="sm"
                onClick={() => setActiveTab("new-submission")}
                className="bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-medium gap-1.5 shadow-xs rounded-full"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Submit Paper</span>
              </Button>
            )}

            <button
              onClick={handleSignOut}
              title="Sign Out"
              className="lg:hidden h-8 w-8 rounded-full border border-black/[0.08] hover:bg-black/[0.05] text-[#86868b] hover:text-[#1d1d1f] flex items-center justify-center transition active:scale-[0.98]"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div className="p-4 sm:p-6 lg:p-8 max-w-6xl w-full space-y-6 mx-auto">
          {/* TAB 1: OVERVIEW DASHBOARD */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-[#1d1d1f]">
                  Welcome back, {user?.full_name}
                </h1>
                <p className="text-xs text-[#86868b]">
                  Review recent submissions and inspect automated formatting pre-checks.
                </p>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Papers</CardDescription>
                    <CardTitle className="text-2xl font-bold text-[#1d1d1f]">
                      {totalSubmissions}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-[#86868b]">Ingested submissions</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Format Pass Rate</CardDescription>
                    <CardTitle className="text-2xl font-bold text-[#34c759]">
                      {passRate}%
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-[#86868b]">Passed pre-screening</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Awaiting Review</CardDescription>
                    <CardTitle className="text-2xl font-bold text-[#ff9500]">
                      {deskReviewCount}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-[#86868b]">Pending editorial triage</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Storage Driver</CardDescription>
                    <CardTitle className="text-2xl font-bold text-[#0071e3]">
                      Box Cloud
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-[#86868b]">Direct file streams active</p>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Submissions Quick View */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between border-b border-black/[0.06]">
                  <div>
                    <CardTitle>Recent Submissions</CardTitle>
                    <CardDescription>
                      Latest papers submitted for automated pre-check review.
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab("submissions")}
                    className="text-xs rounded-full"
                  >
                    View All &rarr;
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  {manuscripts.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[#86868b]">
                      No submissions recorded yet. Click &quot;Submit Paper&quot; to start.
                    </div>
                  ) : (
                    <div className="divide-y divide-black/[0.06] text-xs">
                      {manuscripts.slice(0, 3).map((m) => (
                        <div
                          key={m.id}
                          className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-black/[0.02] transition"
                        >
                          <div className="space-y-0.5 min-w-0">
                            <Link
                              href={auditHref(m)}
                              className="font-semibold text-[#1d1d1f] hover:text-[#0071e3] transition line-clamp-1"
                            >
                              {m.title}
                            </Link>
                            <div className="text-[11px] text-[#86868b]">
                              {m.author?.full_name || "Author"} &bull; {new Date(m.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="flex items-center gap-2.5 shrink-0">
                            <ScoreBadge manuscript={m} />
                            <Link href={auditHref(m)}>
                              <Button variant="ghost" size="sm" className="h-7 text-xs rounded-full">
                                View Report &rarr;
                              </Button>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 2: ALL SUBMISSIONS TABLE */}
          {activeTab === "submissions" && (
            <div className="space-y-4">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-[#1d1d1f]">
                  All Submissions
                </h1>
                <p className="text-xs text-[#86868b]">
                  Search, inspect format scores, and triage submitted papers.
                </p>
              </div>

              {/* Filters Toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white border border-black/[0.06] shadow-apple-card">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#86868b]" />
                  <Input
                    placeholder="Search by title or ID..."
                    className="pl-8 h-8 text-xs rounded-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-xs p-1 rounded-full bg-black/[0.04]">
                  <Button
                    variant={filterStatus === "ALL" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 px-3 rounded-full text-xs"
                    onClick={() => setFilterStatus("ALL")}
                  >
                    All
                  </Button>
                  <Button
                    variant={filterStatus === "UNDER_REVIEW" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 px-3 rounded-full text-xs"
                    onClick={() => setFilterStatus("UNDER_REVIEW")}
                  >
                    Under Review
                  </Button>
                  <Button
                    variant={filterStatus === "ACCEPTED" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 px-3 rounded-full text-xs"
                    onClick={() => setFilterStatus("ACCEPTED")}
                  >
                    Accepted
                  </Button>
                  <Button
                    variant={filterStatus === "REVISION_REQUIRED" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 px-3 rounded-full text-xs"
                    onClick={() => setFilterStatus("REVISION_REQUIRED")}
                  >
                    Revisions
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchSubmissions}
                    className="h-7 w-7 p-0 rounded-full text-[#86868b]"
                    title="Refresh"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </div>

              {/* Data Table Container */}
              <Card className="p-0 overflow-hidden">
                {loading ? (
                  <div className="py-16 text-center space-y-2">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#0071e3]" />
                    <p className="text-xs text-[#86868b]">Loading submissions...</p>
                  </div>
                ) : filteredManuscripts.length === 0 ? (
                  <div className="py-16 text-center space-y-3 p-6">
                    <FileText className="w-8 h-8 mx-auto text-[#86868b]" />
                    <div className="space-y-1">
                      <h3 className="font-semibold text-[#1d1d1f] text-sm">No papers found</h3>
                      <p className="text-xs text-[#86868b]">
                        {searchTerm
                          ? "No records matched your search query."
                          : "Submit your manuscript to run your first pre-check."}
                      </p>
                    </div>
                    <Button
                      onClick={() => setActiveTab("new-submission")}
                      size="sm"
                      className="text-xs font-medium rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Submit Paper
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* MOBILE CARD VIEW (< md screens) */}
                    <div className="md:hidden divide-y divide-black/[0.06]">
                      {filteredManuscripts.map((m) => {
                        const isCustomTemplate = m.files?.some((f) => f.file_role === "TEMPLATE");
                        return (
                          <div key={m.id} className="p-4 space-y-3 bg-white">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] text-[#86868b] font-mono">
                                  ID: {m.id.substring(0, 8)}...
                                </span>
                                <span className="text-[10px] text-[#86868b]">
                                  {new Date(m.created_at).toLocaleDateString()}
                                </span>
                              </div>
                              <Link
                                href={auditHref(m)}
                                className="font-semibold text-sm text-[#1d1d1f] hover:text-[#0071e3] transition line-clamp-2"
                              >
                                {m.title}
                              </Link>
                              <div className="text-xs text-[#86868b]">
                                {m.author?.full_name || "Author"} &bull; {m.author?.affiliation || "UTS"}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5">
                              {isCustomTemplate ? (
                                <Badge variant="info" className="text-[10px]">
                                  Custom Template
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px]">
                                  Standard IEEE
                                </Badge>
                              )}
                              <ScoreBadge manuscript={m} />
                              <Badge
                                variant={
                                  m.status === "ACCEPTED"
                                    ? "success"
                                    : m.status === "REVISION_REQUIRED"
                                    ? "warning"
                                    : "secondary"
                                }
                                className="text-[10px]"
                              >
                                {m.status}
                              </Badge>
                            </div>

                            <div className="pt-1 flex items-center justify-between gap-2">
                              <Link href={auditHref(m)} className="flex-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full h-8 text-xs rounded-full gap-1"
                                >
                                  <Sparkles className="w-3.5 h-3.5 text-[#0071e3]" />
                                  <span>View Report</span>
                                </Button>
                              </Link>

                              {user?.role === "ADMIN" && (
                                <div className="flex items-center gap-1.5">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={actionLoading === m.id}
                                    onClick={() => handleStatusChange(m.id, "ACCEPTED")}
                                    className="h-8 text-xs rounded-full text-[#34c759] hover:bg-[#34c759]/10"
                                  >
                                    Accept
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={actionLoading === m.id}
                                    onClick={() => handleStatusChange(m.id, "REVISION_REQUIRED")}
                                    className="h-8 text-xs rounded-full text-[#ff9500] hover:bg-[#ff9500]/10"
                                  >
                                    Revise
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* DESKTOP TABLE VIEW (>= md screens) */}
                    <div className="hidden md:block">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Paper Title</TableHead>
                            <TableHead>Author</TableHead>
                            <TableHead>Template</TableHead>
                            <TableHead>Format Score</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredManuscripts.map((m) => {
                            const isCustomTemplate = m.files?.some((f) => f.file_role === "TEMPLATE");
                            return (
                              <TableRow key={m.id}>
                                <TableCell className="max-w-md">
                                  <div className="space-y-0.5">
                                    <Link
                                      href={auditHref(m)}
                                      className="font-semibold text-[#1d1d1f] hover:text-[#0071e3] transition flex items-center gap-1.5"
                                    >
                                      <span>{m.title}</span>
                                      <ExternalLink className="w-3 h-3 opacity-50 shrink-0" />
                                    </Link>
                                    <div className="text-[11px] text-[#86868b]">
                                      ID: {m.id.substring(0, 8)}... &bull; {new Date(m.created_at).toLocaleDateString()}
                                    </div>
                                  </div>
                                </TableCell>

                                <TableCell>
                                  <div className="text-xs text-[#1d1d1f]">
                                    {m.author?.full_name || "Dr. Alexander Wright"}
                                  </div>
                                  <div className="text-[11px] text-[#86868b]">
                                    {m.author?.affiliation || "UTS Faculty of IT"}
                                  </div>
                                </TableCell>

                                <TableCell>
                                  {isCustomTemplate ? (
                                    <Badge variant="info" className="text-[10px]">
                                      Custom Template
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-[10px]">
                                      Standard IEEE
                                    </Badge>
                                  )}
                                </TableCell>

                                <TableCell>
                                  <ScoreBadge manuscript={m} />
                                </TableCell>

                                <TableCell>
                                  <Badge
                                    variant={
                                      m.status === "ACCEPTED"
                                        ? "success"
                                        : m.status === "REVISION_REQUIRED"
                                        ? "warning"
                                        : "secondary"
                                    }
                                    className="text-[10px]"
                                  >
                                    {m.status}
                                  </Badge>
                                </TableCell>

                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <Link href={auditHref(m)}>
                                      <Button variant="outline" size="sm" className="h-7 text-xs rounded-full gap-1">
                                        <Sparkles className="w-3 h-3 text-[#0071e3]" />
                                        <span>Report</span>
                                      </Button>
                                    </Link>

                                    {user?.role === "ADMIN" && (
                                      <div className="flex items-center gap-1">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          disabled={actionLoading === m.id}
                                          onClick={() => handleStatusChange(m.id, "ACCEPTED")}
                                          className="h-7 text-xs rounded-full text-[#34c759] hover:bg-[#34c759]/10"
                                        >
                                          Accept
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          disabled={actionLoading === m.id}
                                          onClick={() => handleStatusChange(m.id, "REVISION_REQUIRED")}
                                          className="h-7 text-xs rounded-full text-[#ff9500] hover:bg-[#ff9500]/10"
                                        >
                                          Revise
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </Card>
            </div>
          )}

          {/* TAB 3: IN-ADMIN SUBMIT FORM */}
          {activeTab === "new-submission" && (
            <Card className="max-w-3xl mx-auto shadow-apple-card">
              <CardHeader className="border-b border-black/[0.06] pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base text-[#1d1d1f]">Submit Your Research Paper</CardTitle>
                    <CardDescription className="text-xs text-[#86868b]">
                      Attach your draft PDF and reference template for automated formatting review.
                    </CardDescription>
                  </div>

                  {/* Step indicators */}
                  <div className="flex items-center gap-1.5 text-xs">
                    <span
                      className={`px-3 py-1 rounded-full text-xs transition-colors ${
                        submissionStep === 1
                          ? "bg-[#0071e3] text-white font-medium shadow-xs"
                          : "bg-black/[0.04] text-[#86868b]"
                      }`}
                    >
                      1. Details
                    </span>
                    <span className="text-[#86868b]">&rarr;</span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs transition-colors ${
                        submissionStep === 2
                          ? "bg-[#0071e3] text-white font-medium shadow-xs"
                          : "bg-black/[0.04] text-[#86868b]"
                      }`}
                    >
                      2. Upload
                    </span>
                    <span className="text-[#86868b]">&rarr;</span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs transition-colors ${
                        submissionStep === 3
                          ? "bg-[#34c759] text-white font-medium shadow-xs"
                          : "bg-black/[0.04] text-[#86868b]"
                      }`}
                    >
                      3. Report
                    </span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                {submitError && (
                  <div className="mb-4 p-3.5 rounded-2xl bg-[#ff3b30]/10 border border-[#ff3b30]/20 text-[#ff3b30] text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                {/* STEP 1: METADATA */}
                {submissionStep === 1 && (
                  <form onSubmit={handleCreateDraft} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-[#1d1d1f] font-semibold text-xs">Paper Information</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handlePrefillDemo}
                        className="text-xs text-[#0071e3] rounded-full border-black/[0.08]"
                      >
                        <Sparkles className="w-3.5 h-3.5 mr-1" />
                        Auto-fill Sample Paper
                      </Button>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="title" className="text-xs text-[#86868b]">Title</Label>
                      <Input
                        id="title"
                        required
                        placeholder="e.g. A Comparative Study of Efficient File Ingestion in Academic Web Portals"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="rounded-xl text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="abstract" className="text-xs text-[#86868b]">Abstract</Label>
                      <Textarea
                        id="abstract"
                        required
                        rows={3}
                        placeholder="Overview of the research problem, methodology, and findings..."
                        value={abstract}
                        onChange={(e) => setAbstract(e.target.value)}
                        className="rounded-xl text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="keywords" className="text-xs text-[#86868b]">Keywords (Comma Separated)</Label>
                      <Input
                        id="keywords"
                        required
                        placeholder="Academic Publishing, Cloud Storage, Document Processing"
                        value={keywordsInput}
                        onChange={(e) => setKeywordsInput(e.target.value)}
                        className="rounded-xl text-xs"
                      />
                    </div>

                    <div className="pt-3 flex justify-end">
                      <Button
                        type="submit"
                        disabled={submitLoading || !title || !abstract}
                        className="bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-medium rounded-full px-5 shadow-xs"
                      >
                        {submitLoading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            Continue to File Upload
                            <Send className="w-3.5 h-3.5 ml-1.5" />
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                )}

                {/* STEP 2: DUAL FILE UPLOAD */}
                {submissionStep === 2 && (
                  <div className="space-y-5">
                    <p className="text-xs text-[#86868b]">
                      Upload both files below. Your manuscript draft will be checked against the reference template.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                      {/* Dropzone A: Target Journal Template */}
                      <div className="flex flex-col p-4 rounded-2xl border border-indigo-200 bg-indigo-50/40 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#1d1d1f] text-xs flex items-center gap-1.5">
                            <Layers className="w-4 h-4 text-indigo-600" />
                            1. Template / Pedoman Jurnal Sasaran (PDF)
                          </span>
                          <Badge className="bg-indigo-600 text-white text-[10px]">
                            Acuan Format
                          </Badge>
                        </div>

                        <p className="text-[11px] text-[#86868b]">
                          Unggah <strong>Pedoman Penulisan (Author Guidelines)</strong> atau <strong>Contoh Artikel Jurnal</strong> dari jurnal tujuan. Sistem akan mendeteksi aturan formatnya secara otomatis.
                        </p>

                        <div className="flex-1 flex flex-col justify-center items-center py-5 border border-dashed border-indigo-300 rounded-xl bg-white text-center">
                          <UploadCloud className="w-6 h-6 text-indigo-600 mb-1" />
                          {templateFile ? (
                            <div className="text-xs text-emerald-600 font-bold">
                              {templateFile.name} ({(templateFile.size / 1024).toFixed(1)} KB)
                            </div>
                          ) : (
                            <div className="text-xs text-[#86868b]">Pilih file PDF Pedoman atau Contoh Jurnal</div>
                          )}
                          <input
                            type="file"
                            accept=".pdf"
                            className="mt-2 text-xs text-[#86868b] file:mr-2 file:py-1 file:px-2.5 file:rounded-full file:border-0 file:text-xs file:bg-indigo-100 file:text-indigo-800 cursor-pointer"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                setTemplateFile(e.target.files[0]);
                              }
                            }}
                          />
                        </div>

                        <div className="pt-1">
                          <span className="text-[10px] text-slate-500 block mb-1">
                            Atau gunakan starter preset jika belum memiliki file template:
                          </span>
                          <TemplatePresetSelect
                            value={templatePreset}
                            onChange={setTemplatePreset}
                            hasUploadedTemplate={!!templateFile}
                          />
                        </div>
                      </div>

                      {/* Dropzone B: Draft */}
                      <div className="flex flex-col p-4 rounded-2xl border border-[#0071e3]/20 bg-[#0071e3]/5 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-[#1d1d1f] text-xs flex items-center gap-1.5">
                            <FileText className="w-4 h-4 text-[#0071e3]" />
                            2. Manuscript Draft (PDF)
                          </span>
                          <Badge variant="default" className="text-[10px]">
                            Required
                          </Badge>
                        </div>

                        <p className="text-[11px] text-[#86868b]">
                          Your draft paper to be reviewed for margins, columns, double-blind privacy, and citations.
                        </p>

                        <div className="flex-1 flex flex-col justify-center items-center py-5 border border-dashed border-[#0071e3]/30 rounded-xl bg-white text-center">
                          <UploadCloud className="w-6 h-6 text-[#0071e3] mb-1" />
                          {draftFile ? (
                            <div className="text-xs text-[#34c759] font-medium">
                              {draftFile.name} ({(draftFile.size / 1024).toFixed(1)} KB)
                            </div>
                          ) : (
                            <div className="text-xs text-[#86868b]">Choose manuscript PDF</div>
                          )}
                          <input
                            type="file"
                            accept=".pdf"
                            required
                            className="mt-2 text-xs text-[#86868b] file:mr-2 file:py-1 file:px-2.5 file:rounded-full file:border-0 file:text-xs file:bg-[#0071e3] file:text-white cursor-pointer"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                setDraftFile(e.target.files[0]);
                              }
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {uploadProgress && (
                      <div className="p-3.5 rounded-2xl bg-[#0071e3]/10 border border-[#0071e3]/20 text-xs text-[#0071e3] flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                        <span>{uploadProgress}</span>
                      </div>
                    )}

                    <div className="pt-3 flex items-center justify-between">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSubmissionStep(1)}
                        className="rounded-full text-xs"
                      >
                        &larr; Back to Details
                      </Button>

                      <Button
                        type="button"
                        disabled={submitLoading || !draftFile}
                        onClick={handleDualUploadToBox}
                        className="bg-[#0071e3] hover:bg-[#0077ed] font-medium text-xs px-5 rounded-full text-white shadow-xs"
                      >
                        {submitLoading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            Upload &amp; Run Format Check
                            <Send className="w-3.5 h-3.5 ml-1.5" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* STEP 3: RESULT */}
                {submissionStep === 3 && (
                  <div className="text-center py-8 space-y-4">
                    <div className="w-12 h-12 rounded-full bg-[#34c759]/10 border border-[#34c759]/20 flex items-center justify-center text-[#34c759] mx-auto">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-lg font-bold text-[#1d1d1f]">
                        Upload &amp; Review Completed
                      </h3>
                      <p className="text-xs text-[#86868b] max-w-sm mx-auto">
                        Your files were uploaded and checked against the journal layout, double-blind and citation rules.
                      </p>
                    </div>

                    <div className="max-w-xs mx-auto p-4 rounded-2xl bg-[#f5f5f7] border border-black/[0.06] space-y-1.5">
                      <div className="text-xs text-[#86868b]">Compliance Score</div>
                      {!submittedReport ||
                      submittedReport.status === "QUEUED" ||
                      submittedReport.status === "PROCESSING" ? (
                        <div className="flex items-center justify-center gap-2 py-1 text-sm font-semibold text-[#86868b]">
                          <Loader2 className="w-4 h-4 animate-spin text-[#0071e3]" />
                          <span>Checking format...</span>
                        </div>
                      ) : submittedReport.status === "FAILED" ? (
                        <>
                          <div className="text-2xl font-bold text-[#ff3b30]">&ndash;</div>
                          <Badge variant="destructive">Audit failed</Badge>
                        </>
                      ) : (
                        <>
                          <div
                            className={`text-2xl font-bold ${
                              submittedReport.summary.status === "PASS" ? "text-[#34c759]" : "text-[#ff3b30]"
                            }`}
                          >
                            {submittedReport.overall_score} / 100
                          </div>
                          {submittedReport.summary.status === "PASS" ? (
                            <Badge variant="success">Compliant &amp; Ready for Review</Badge>
                          ) : (
                            <Badge variant="destructive">Revision Required</Badge>
                          )}
                        </>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-2.5 pt-3">
                      {submittedAuditId && (
                        <Link href={`/submissions/${manuscriptId}/audit?audit_id=${submittedAuditId}`}>
                          <Button className="bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-medium rounded-full gap-1.5 shadow-xs">
                            <Sparkles className="w-3.5 h-3.5" />
                            View Detailed Report
                          </Button>
                        </Link>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleResetSubmission}
                        className="text-xs rounded-full"
                      >
                        Submit Another Paper
                      </Button>

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setActiveTab("submissions")}
                        className="text-xs rounded-full"
                      >
                        Back to Submissions
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* TAB 4: TEMPLATES */}
          {activeTab === "templates" && (
            <div className="space-y-4">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-[#1d1d1f]">
                  Journal Template Guidelines
                </h1>
                <p className="text-xs text-[#86868b]">
                  Pre-configured layout specifications used to check submitted papers.
                </p>
              </div>

              <TemplateVault />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

/** Template Vault: built-in layouts served by the gateway (GET /api/v1/templates). */
function TemplateVault() {
  const { presets, defaultId, loading, error } = useTemplatePresets();

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-[#86868b]">
        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-[#0071e3]" />
        Loading templates...
      </div>
    );
  }
  if (error) {
    return <div className="p-4 rounded-2xl bg-[#ff3b30]/10 text-[#ff3b30] text-xs">{error}</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {presets.map((p) => (
        <Card key={p.id}>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base text-[#1d1d1f]">{p.name}</CardTitle>
              <Badge variant={p.specs.column_count === 2 ? "default" : "secondary"}>
                {p.specs.column_count === 2 ? "Double Column" : "Single Column"}
              </Badge>
            </div>
            <CardDescription className="text-xs text-[#86868b]">{p.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5 text-xs text-[#86868b]">
            <div>Font: {p.font}</div>
            <div>
              Page: {p.specs.page_format} ({p.specs.page_width_mm} &times; {p.specs.page_height_mm} mm)
            </div>
            <div>
              Margins: top {p.specs.margin_top_mm}, bottom {p.specs.margin_bottom_mm}, left {p.specs.margin_left_mm},
              right {p.specs.margin_right_mm} mm
            </div>
            {p.specs.column_gap_mm != null && <div>Column gap: {p.specs.column_gap_mm} mm</div>}
            {p.id === defaultId && (
              <Badge variant="info" className="text-[10px] mt-1">
                Default when no template is uploaded
              </Badge>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
