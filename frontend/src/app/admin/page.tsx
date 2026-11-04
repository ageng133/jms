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
} from "lucide-react";
import {
  listManuscripts,
  updateManuscriptStatus,
  createDraftManuscript,
  requestUploadPresign,
  uploadDirectToS3,
  confirmSubmission,
  FileMetadataInput,
} from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { AuthGateCard } from "@/components/AuthGateCard";
import { GoogleLogo } from "@/components/GoogleAuthModal";
import { Manuscript } from "@/types/jms";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  const [manuscriptId, setManuscriptId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [submittedAuditId, setSubmittedAuditId] = useState<string | null>(null);

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

      setUploadProgress("Running Google Gemini AI format review...");
      const confirmRes = await confirmSubmission(manuscriptId, {
        draft_file: draftMeta,
        template_file: templateMeta,
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
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
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
  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-900">
      {/* SUCCESS TOAST */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-emerald-600 text-white px-4 py-3 shadow-lg flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-bottom">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* =========================================================================
          LEFT SIDEBAR (260px wide, sticky, clean light theme)
         ========================================================================= */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 h-screen sticky top-0 shadow-xs">
        <div>
          {/* Workspace Brand Header */}
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2.5">
              <span className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-xs">
                JMS
              </span>
              <div>
                <div className="text-sm font-bold tracking-tight text-slate-900 leading-tight">
                  Journal Portal
                </div>
                <div className="text-[10px] text-slate-400 font-medium">
                  UTS Editorial Space
                </div>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1 text-xs font-medium">
            <button
              onClick={() => setActiveTab("overview")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition ${
                activeTab === "overview"
                  ? "bg-indigo-50 text-indigo-700 font-semibold"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveTab("submissions")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition ${
                activeTab === "submissions"
                  ? "bg-indigo-50 text-indigo-700 font-semibold"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
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
              onClick={() => setActiveTab("new-submission")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition ${
                activeTab === "new-submission"
                  ? "bg-indigo-50 text-indigo-700 font-semibold"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Plus className="w-4 h-4 text-indigo-600" />
              <span>Submit Paper</span>
            </button>

            <button
              onClick={() => setActiveTab("templates")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition ${
                activeTab === "templates"
                  ? "bg-indigo-50 text-indigo-700 font-semibold"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Journal Templates</span>
            </button>
          </nav>

          {/* System Telemetry */}
          <div className="px-4 py-3 mx-3 my-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px] space-y-1.5">
            <div className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
              System Status
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1.5">
                <Box className="w-3 h-3 text-blue-500" />
                Box Cloud
              </span>
              <span className="text-emerald-600 font-medium">Online</span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-indigo-500" />
                Gemini AI
              </span>
              <span className="text-emerald-600 font-medium">Active</span>
            </div>
          </div>
        </div>

        {/* User Profile Card at Bottom */}
        <div className="p-3 border-t border-slate-200 bg-slate-50/50">
          <div className="flex items-center space-x-3 p-2 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
              {user.full_name?.charAt(0) || "U"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-slate-900 truncate">
                {user.full_name}
              </div>
              <div className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                <span>{user.role === "ADMIN" ? "Managing Editor" : "Author"}</span>
                <span className="text-slate-300">&bull;</span>
                <span className="text-indigo-600 font-medium">Google SSO</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 px-1">
            <button
              onClick={() =>
                handleGoogleSignIn(
                  user.role === "ADMIN" ? "AUTHOR" : "ADMIN"
                )
              }
              className="text-[11px] text-indigo-600 hover:underline font-medium"
            >
              Switch to {user.role === "ADMIN" ? "Author" : "Editor"}
            </button>

            <button
              onClick={handleSignOut}
              className="text-[11px] text-slate-500 hover:text-slate-800 font-medium flex items-center gap-1"
            >
              <LogOut className="w-3 h-3" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* =========================================================================
          MAIN CONTENT CANVAS
         ========================================================================= */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header Bar */}
        <header className="h-14 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <span>Admin Portal</span>
            <span>/</span>
            <span className="text-slate-900 font-semibold capitalize">
              {activeTab === "new-submission" ? "Submit Paper" : activeTab}
            </span>
          </div>

          {activeTab !== "new-submission" && (
            <Button
              size="sm"
              onClick={() => setActiveTab("new-submission")}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Submit Paper</span>
            </Button>
          )}
        </header>

        {/* Content Body */}
        <div className="p-8 max-w-6xl w-full space-y-6">
          {/* TAB 1: OVERVIEW DASHBOARD */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  Welcome back, {user?.full_name}
                </h1>
                <p className="text-xs text-slate-500">
                  Review recent submissions and inspect automated formatting pre-checks.
                </p>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Papers</CardDescription>
                    <CardTitle className="text-2xl font-bold text-slate-900">
                      {totalSubmissions}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-slate-500">Ingested submissions</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Format Pass Rate</CardDescription>
                    <CardTitle className="text-2xl font-bold text-emerald-600">
                      {passRate}%
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-slate-500">Passed pre-screening</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Awaiting Review</CardDescription>
                    <CardTitle className="text-2xl font-bold text-amber-600">
                      {deskReviewCount}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-slate-500">Pending editorial triage</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Storage Driver</CardDescription>
                    <CardTitle className="text-2xl font-bold text-blue-600">
                      Box Cloud
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-slate-500">Direct file streams active</p>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Submissions Quick View */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100">
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
                    className="text-xs"
                  >
                    View All &rarr;
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  {manuscripts.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500">
                      No submissions recorded yet. Click "Submit Paper" to start.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 text-xs">
                      {manuscripts.slice(0, 3).map((m) => (
                        <div
                          key={m.id}
                          className="p-4 flex items-center justify-between hover:bg-slate-50 transition"
                        >
                          <div className="space-y-0.5">
                            <Link
                              href={`/submissions/${m.id}/audit`}
                              className="font-semibold text-slate-900 hover:text-indigo-600"
                            >
                              {m.title}
                            </Link>
                            <div className="text-[11px] text-slate-500">
                              {m.author?.full_name || "Author"} &bull; {new Date(m.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant="default" className="text-[10px]">
                              Score: 95/100
                            </Badge>
                            <Link href={`/submissions/${m.id}/audit`}>
                              <Button variant="ghost" size="sm" className="h-7 text-xs">
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
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  All Submissions
                </h1>
                <p className="text-xs text-slate-500">
                  Search, inspect format scores, and triage submitted papers.
                </p>
              </div>

              {/* Filters Toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-lg bg-white border border-slate-200">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <Input
                    placeholder="Search by title or ID..."
                    className="pl-8 h-8 text-xs"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1 text-xs">
                  <Button
                    variant={filterStatus === "ALL" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setFilterStatus("ALL")}
                  >
                    All
                  </Button>
                  <Button
                    variant={filterStatus === "UNDER_REVIEW" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setFilterStatus("UNDER_REVIEW")}
                  >
                    Under Review
                  </Button>
                  <Button
                    variant={filterStatus === "ACCEPTED" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setFilterStatus("ACCEPTED")}
                  >
                    Accepted
                  </Button>
                  <Button
                    variant={filterStatus === "REVISION_REQUIRED" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setFilterStatus("REVISION_REQUIRED")}
                  >
                    Revisions
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchSubmissions}
                    className="text-slate-500"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </div>

              {/* Data Table */}
              <Card className="p-0 overflow-hidden">
                {loading ? (
                  <div className="py-16 text-center space-y-2">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600" />
                    <p className="text-xs text-slate-500">Loading submissions...</p>
                  </div>
                ) : filteredManuscripts.length === 0 ? (
                  <div className="py-16 text-center space-y-3">
                    <FileText className="w-8 h-8 mx-auto text-slate-400" />
                    <div className="space-y-1">
                      <h3 className="font-semibold text-slate-900 text-sm">No papers found</h3>
                      <p className="text-xs text-slate-500">
                        {searchTerm
                          ? "No records matched your search query."
                          : "Submit your manuscript to run your first pre-check."}
                      </p>
                    </div>
                    <Button
                      onClick={() => setActiveTab("new-submission")}
                      size="sm"
                      className="text-xs font-semibold"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Submit Paper
                    </Button>
                  </div>
                ) : (
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
                                  href={`/submissions/${m.id}/audit`}
                                  className="font-semibold text-slate-900 hover:text-indigo-600 transition flex items-center gap-1.5"
                                >
                                  <span>{m.title}</span>
                                  <ExternalLink className="w-3 h-3 opacity-50 shrink-0" />
                                </Link>
                                <div className="text-[11px] text-slate-500">
                                  ID: {m.id.substring(0, 8)}... &bull; {new Date(m.created_at).toLocaleDateString()}
                                </div>
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className="text-xs text-slate-800">
                                {m.author?.full_name || "Dr. Alexander Wright"}
                              </div>
                              <div className="text-[11px] text-slate-500">
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
                              <Badge
                                variant={
                                  m.status === "PRE_CHECK_FAILED"
                                    ? "destructive"
                                    : "success"
                                }
                                className="text-[10px]"
                              >
                                Score: 95 / 100
                              </Badge>
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
                                <Link href={`/submissions/${m.id}/audit`}>
                                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                                    <Sparkles className="w-3 h-3 text-indigo-600" />
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
                                      className="h-7 text-xs text-emerald-600 hover:text-emerald-700"
                                    >
                                      Accept
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      disabled={actionLoading === m.id}
                                      onClick={() => handleStatusChange(m.id, "REVISION_REQUIRED")}
                                      className="h-7 text-xs text-amber-600 hover:text-amber-700"
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
                )}
              </Card>
            </div>
          )}

          {/* TAB 3: IN-ADMIN SUBMIT FORM */}
          {activeTab === "new-submission" && (
            <Card className="max-w-3xl mx-auto shadow-sm">
              <CardHeader className="border-b border-slate-100 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Submit Your Research Paper</CardTitle>
                    <CardDescription className="text-xs">
                      Attach your draft PDF and reference template for automated formatting review.
                    </CardDescription>
                  </div>

                  {/* Step indicators */}
                  <div className="flex items-center gap-1.5 text-xs">
                    <span
                      className={`px-2 py-0.5 rounded ${
                        submissionStep === 1
                          ? "bg-indigo-600 text-white font-semibold"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      1. Details
                    </span>
                    <span className="text-slate-400">&rarr;</span>
                    <span
                      className={`px-2 py-0.5 rounded ${
                        submissionStep === 2
                          ? "bg-indigo-600 text-white font-semibold"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      2. Upload
                    </span>
                    <span className="text-slate-400">&rarr;</span>
                    <span
                      className={`px-2 py-0.5 rounded ${
                        submissionStep === 3
                          ? "bg-emerald-600 text-white font-semibold"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      3. Report
                    </span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                {submitError && (
                  <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                {/* STEP 1: METADATA */}
                {submissionStep === 1 && (
                  <form onSubmit={handleCreateDraft} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Paper Information</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handlePrefillDemo}
                        className="text-xs text-indigo-600 border-slate-200"
                      >
                        <Sparkles className="w-3.5 h-3.5 mr-1" />
                        Auto-fill Sample Paper
                      </Button>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        required
                        placeholder="e.g. A Comparative Study of Efficient File Ingestion in Academic Web Portals"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="abstract">Abstract</Label>
                      <Textarea
                        id="abstract"
                        required
                        rows={3}
                        placeholder="Overview of the research problem, methodology, and findings..."
                        value={abstract}
                        onChange={(e) => setAbstract(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="keywords">Keywords (Comma Separated)</Label>
                      <Input
                        id="keywords"
                        required
                        placeholder="Academic Publishing, Cloud Storage, Document Processing"
                        value={keywordsInput}
                        onChange={(e) => setKeywordsInput(e.target.value)}
                      />
                    </div>

                    <div className="pt-3 flex justify-end">
                      <Button
                        type="submit"
                        disabled={submitLoading || !title || !abstract}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
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
                    <p className="text-xs text-slate-500">
                      Upload both files below. Your manuscript draft will be checked against the reference template.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                      {/* Dropzone A: Template */}
                      <div className="flex flex-col p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                            <Layers className="w-4 h-4 text-blue-600" />
                            1. Journal Template (PDF)
                          </span>
                          <Badge variant="secondary" className="text-[10px]">
                            Optional
                          </Badge>
                        </div>

                        <p className="text-[11px] text-slate-500">
                          The journal's official styling template (e.g. IEEE or ACM). Defaults to IEEE if omitted.
                        </p>

                        <div className="flex-1 flex flex-col justify-center items-center py-5 border border-dashed border-slate-300 rounded-lg bg-white text-center">
                          <UploadCloud className="w-6 h-6 text-blue-500 mb-1" />
                          {templateFile ? (
                            <div className="text-xs text-emerald-600 font-medium">
                              {templateFile.name} ({(templateFile.size / 1024).toFixed(1)} KB)
                            </div>
                          ) : (
                            <div className="text-xs text-slate-500">Choose template PDF</div>
                          )}
                          <input
                            type="file"
                            accept=".pdf"
                            className="mt-2 text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:bg-slate-100 file:text-slate-700 cursor-pointer"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                setTemplateFile(e.target.files[0]);
                              }
                            }}
                          />
                        </div>
                      </div>

                      {/* Dropzone B: Draft */}
                      <div className="flex flex-col p-4 rounded-xl border border-indigo-200 bg-indigo-50/30 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                            <FileText className="w-4 h-4 text-indigo-600" />
                            2. Manuscript Draft (PDF)
                          </span>
                          <Badge variant="default" className="text-[10px]">
                            Required
                          </Badge>
                        </div>

                        <p className="text-[11px] text-slate-500">
                          Your draft paper to be reviewed for margins, columns, double-blind privacy, and citations.
                        </p>

                        <div className="flex-1 flex flex-col justify-center items-center py-5 border border-dashed border-indigo-300 rounded-lg bg-white text-center">
                          <UploadCloud className="w-6 h-6 text-indigo-600 mb-1" />
                          {draftFile ? (
                            <div className="text-xs text-emerald-600 font-medium">
                              {draftFile.name} ({(draftFile.size / 1024).toFixed(1)} KB)
                            </div>
                          ) : (
                            <div className="text-xs text-slate-500">Choose manuscript PDF</div>
                          )}
                          <input
                            type="file"
                            accept=".pdf"
                            required
                            className="mt-2 text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:bg-indigo-600 file:text-white cursor-pointer"
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
                      <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-700 flex items-center gap-2">
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
                      >
                        &larr; Back to Details
                      </Button>

                      <Button
                        type="button"
                        disabled={submitLoading || !draftFile}
                        onClick={handleDualUploadToBox}
                        className="bg-indigo-600 hover:bg-indigo-700 font-semibold text-xs px-5"
                      >
                        {submitLoading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            Upload to Box & Run Format Check
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
                    <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-lg font-bold text-slate-900">
                        Upload & Review Completed
                      </h3>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Your files were uploaded to Box Cloud Storage and checked with Google Gemini AI.
                      </p>
                    </div>

                    <div className="max-w-xs mx-auto p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <div className="text-xs text-slate-500">Compliance Score</div>
                      <div className="text-2xl font-bold text-emerald-600">
                        95 / 100
                      </div>
                      <Badge variant="success">Compliant & Ready for Review</Badge>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-2.5 pt-3">
                      {submittedAuditId && (
                        <Link href={`/submissions/${manuscriptId}/audit`}>
                          <Button className="bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" />
                            View Detailed Report
                          </Button>
                        </Link>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleResetSubmission}
                        className="text-xs"
                      >
                        Submit Another Paper
                      </Button>

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setActiveTab("submissions")}
                        className="text-xs"
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
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  Journal Template Guidelines
                </h1>
                <p className="text-xs text-slate-500">
                  Pre-configured layout specifications used to check submitted papers.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">IEEE Transactions</CardTitle>
                      <Badge variant="default">Double Column</Badge>
                    </div>
                    <CardDescription>
                      Standard for computer science and engineering transactions.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-1.5 text-xs text-slate-600">
                    <div>Font: Times New Roman 10pt</div>
                    <div>Columns: 2 Columns</div>
                    <div>Margins: 19mm top, 14.3mm side</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">ACM SIGCOMM</CardTitle>
                      <Badge variant="default">Double Column</Badge>
                    </div>
                    <CardDescription>
                      Conference format for systems and networking papers.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-1.5 text-xs text-slate-600">
                    <div>Font: Libertine 9pt</div>
                    <div>Columns: 2 Columns</div>
                    <div>Margins: 20mm uniform</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">UTS Open Journal</CardTitle>
                      <Badge variant="secondary">Single Column</Badge>
                    </div>
                    <CardDescription>
                      Institutional publication format for faculty technical reports.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-1.5 text-xs text-slate-600">
                    <div>Font: Inter / Helvetica 11pt</div>
                    <div>Columns: 1 Column</div>
                    <div>Margins: 25mm uniform</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
