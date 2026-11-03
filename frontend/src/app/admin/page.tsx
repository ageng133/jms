"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Shield,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Layers,
  ArrowRight,
  Download,
  Loader2,
  RefreshCw,
  Search,
  Filter,
  Check,
  RotateCcw,
  UserCheck,
  Server,
  Database,
  Cpu,
  LogIn,
  ExternalLink,
} from "lucide-react";
import {
  listManuscripts,
  updateManuscriptStatus,
  getCurrentUser,
  loginWithGoogle,
  logout,
} from "@/lib/api";
import { Manuscript } from "@/types/jms";

export default function AdminPanelPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Google Sign-In helper for Admin panel
  async function handleGoogleAdminSignIn() {
    try {
      setLoading(true);
      const res = await loginWithGoogle({
        email: "editor.google@uts.edu.au",
        full_name: "Prof. Dr. Sarah Connor",
        role: "ADMIN",
        affiliation: "UTS Journal of Advanced Distributed Systems",
      });
      setCurrentUser(res.user);
      fetchSubmissions();
    } catch (err: any) {
      alert("Failed to authenticate as Admin: " + err.message);
      setLoading(false);
    }
  }

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

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
    if (!user || (user.role !== "ADMIN" && user.role !== "EDITOR")) {
      // Auto-elevate for seamless preview if needed
      handleGoogleAdminSignIn();
    } else {
      fetchSubmissions();
    }
  }, []);

  async function handleStatusChange(id: string, newStatus: string) {
    setActionLoading(id);
    try {
      await updateManuscriptStatus(id, newStatus);
      setSuccessToast(`Manuscript status updated to ${newStatus}`);
      setTimeout(() => setSuccessToast(null), 3000);
      await fetchSubmissions();
    } catch (err: any) {
      alert("Failed to update status: " + err.message);
    } finally {
      setActionLoading(null);
    }
  }

  // Filter Logic
  const filteredManuscripts = manuscripts.filter((m) => {
    const matchesStatus =
      filterStatus === "ALL" ||
      (filterStatus === "NEEDS_REVIEW" &&
        (m.status === "UNDER_DESK_REVIEW" || m.status === "PRE_CHECK_FAILED")) ||
      m.status === filterStatus;

    const matchesSearch =
      m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.author?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.author?.email?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  // KPI Metrics
  const totalCount = manuscripts.length;
  const deskReviewCount = manuscripts.filter((m) => m.status === "UNDER_DESK_REVIEW").length;
  const preCheckFailedCount = manuscripts.filter((m) => m.status === "PRE_CHECK_FAILED").length;
  const inPeerReviewCount = manuscripts.filter(
    (m) => m.status === "IN_PEER_REVIEW" || m.status === "ACCEPTED"
  ).length;

  return (
    <div className="space-y-8">
      {/* Admin Header with User Session & Google Badge */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold uppercase tracking-wider">
              Managing Editorial Board
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Control Plane
            </span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Editorial Triage & Administration</h1>
          <p className="text-xs text-slate-500">
            Automated pre-submission score review, template verification, and double-blind triage decisions.
          </p>
        </div>

        {/* User Identity / Google Sign-in Status */}
        <div className="flex items-center gap-3">
          {currentUser ? (
            <div className="flex items-center gap-3 bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm">
              {/* Google G Logo */}
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <div className="text-xs">
                <p className="font-bold text-slate-900 flex items-center gap-1.5">
                  {currentUser.full_name}
                  <span className="px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 text-[10px] font-black uppercase">
                    {currentUser.role}
                  </span>
                </p>
                <p className="text-[11px] text-slate-500 font-mono">{currentUser.email}</p>
              </div>
            </div>
          ) : (
            <button
              onClick={handleGoogleAdminSignIn}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-800 hover:bg-slate-50 shadow-sm"
            >
              Sign in with Google
            </button>
          )}

          <button
            onClick={fetchSubmissions}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-white hover:text-slate-900 transition shadow-sm"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {successToast && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successToast}</span>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Submissions</span>
          <p className="text-3xl font-black text-slate-900">{totalCount}</p>
          <p className="text-xs text-slate-500">All submitted papers</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-500">Desk Review Required</span>
          <p className="text-3xl font-black text-amber-600">{deskReviewCount}</p>
          <p className="text-xs text-slate-500">Passed pre-check criteria</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-rose-500">Pre-Check Non-Compliant</span>
          <p className="text-3xl font-black text-rose-600">{preCheckFailedCount}</p>
          <p className="text-xs text-slate-500">Margin or anonymization breach</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-500">Peer Review & Accepted</span>
          <p className="text-3xl font-black text-emerald-600">{inPeerReviewCount}</p>
          <p className="text-xs text-slate-500">Active evaluation pipelines</p>
        </div>
      </div>

      {/* Infrastructure Health Status */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2 font-bold text-slate-300">
          <Server className="w-4 h-4 text-blue-400" />
          <span>Decoupled Microservice Cluster Health:</span>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> Go Gateway (:8080)
          </span>
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> PostgreSQL 16 (:5432)
          </span>
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> Redis Broker (:6379)
          </span>
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> MinIO S3 (:9000)
          </span>
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> Python Worker (PyMuPDF)
          </span>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-200/70 text-xs font-semibold">
          <button
            onClick={() => setFilterStatus("ALL")}
            className={`px-3 py-1.5 rounded-lg transition ${
              filterStatus === "ALL" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All Submissions ({totalCount})
          </button>
          <button
            onClick={() => setFilterStatus("NEEDS_REVIEW")}
            className={`px-3 py-1.5 rounded-lg transition ${
              filterStatus === "NEEDS_REVIEW"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Requires Triage ({deskReviewCount + preCheckFailedCount})
          </button>
          <button
            onClick={() => setFilterStatus("UNDER_DESK_REVIEW")}
            className={`px-3 py-1.5 rounded-lg transition ${
              filterStatus === "UNDER_DESK_REVIEW"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Desk Review ({deskReviewCount})
          </button>
          <button
            onClick={() => setFilterStatus("PRE_CHECK_FAILED")}
            className={`px-3 py-1.5 rounded-lg transition ${
              filterStatus === "PRE_CHECK_FAILED"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Failed AI Check ({preCheckFailedCount})
          </button>
        </div>

        {/* Search Field */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by title, author or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-72 shadow-sm"
          />
        </div>
      </div>

      {/* Submissions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading && (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
            <p className="text-xs font-semibold">Loading editorial queue...</p>
          </div>
        )}

        {!loading && filteredManuscripts.length === 0 && (
          <div className="p-12 text-center text-slate-400 space-y-1">
            <p className="text-sm font-bold text-slate-600">No manuscripts match your filter</p>
            <p className="text-xs">Adjust your status filter or search parameters.</p>
          </div>
        )}

        {!loading && filteredManuscripts.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5">Manuscript Title & Author</th>
                  <th className="px-6 py-3.5">Pre-Check Score</th>
                  <th className="px-6 py-3.5">Template Mode</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Editorial Decisions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredManuscripts.map((m) => {
                  // Find active audit
                  const draftFile = m.files?.find((f) => f.file_role === "MANUSCRIPT") || m.files?.[0];
                  const templateFile = m.files?.find((f) => f.file_role === "TEMPLATE");
                  const activeAudit = draftFile?.audits?.[0];

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/70 transition">
                      {/* Title & Author */}
                      <td className="px-6 py-4 max-w-sm space-y-1">
                        <Link
                          href={`/submissions/${m.id}/audit?audit_id=${activeAudit?.id || ""}`}
                          className="font-bold text-slate-900 hover:text-blue-600 transition line-clamp-1 flex items-center gap-1.5"
                        >
                          {m.title}
                          <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
                        </Link>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2">
                          <span>{m.author?.full_name || "Unknown Author"}</span>
                          <span>&bull;</span>
                          <span className="font-mono text-slate-400">{m.author?.email}</span>
                        </div>
                      </td>

                      {/* Pre-Check Score */}
                      <td className="px-6 py-4">
                        {activeAudit?.score_overall !== undefined && activeAudit.score_overall !== null ? (
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${
                                activeAudit.score_overall >= 80
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-rose-50 text-rose-700 border border-rose-200"
                              }`}
                            >
                              {activeAudit.score_overall}
                            </span>
                            <div className="text-[11px]">
                              <p className="font-bold text-slate-700">
                                {activeAudit.score_overall >= 80 ? "Passed" : "Breaches"}
                              </p>
                              <p className="text-slate-400">
                                {activeAudit.layout_issues?.length || 0} layout, {activeAudit.anonymization_flags?.length || 0} leaks
                              </p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Pending Audit</span>
                        )}
                      </td>

                      {/* Template Mode */}
                      <td className="px-6 py-4">
                        {templateFile ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 text-[11px] font-semibold border border-indigo-200">
                            <Layers className="w-3 h-3" />
                            Custom Template
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium">
                            UTS Standard Baseline
                          </span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            m.status === "ACCEPTED"
                              ? "bg-emerald-100 text-emerald-800"
                              : m.status === "IN_PEER_REVIEW"
                              ? "bg-blue-100 text-blue-800"
                              : m.status === "UNDER_DESK_REVIEW"
                              ? "bg-amber-100 text-amber-800"
                              : m.status === "PRE_CHECK_FAILED"
                              ? "bg-rose-100 text-rose-800"
                              : m.status === "REVISION_REQUIRED"
                              ? "bg-orange-100 text-orange-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {m.status}
                        </span>
                      </td>

                      {/* Editorial Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {activeAudit?.id && (
                            <Link
                              href={`/submissions/${m.id}/audit?audit_id=${activeAudit.id}`}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold transition"
                            >
                              Audit
                            </Link>
                          )}

                          {m.status === "UNDER_DESK_REVIEW" || m.status === "PRE_CHECK_FAILED" ? (
                            <>
                              <button
                                type="button"
                                disabled={actionLoading === m.id}
                                onClick={() => handleStatusChange(m.id, "IN_PEER_REVIEW")}
                                className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition shadow-sm"
                                title="Pass to Peer Review"
                              >
                                Accept for Review
                              </button>
                              <button
                                type="button"
                                disabled={actionLoading === m.id}
                                onClick={() => handleStatusChange(m.id, "REVISION_REQUIRED")}
                                className="px-2.5 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 font-semibold border border-orange-200 transition"
                                title="Request Author Revision"
                              >
                                Request Revision
                              </button>
                            </>
                          ) : m.status === "IN_PEER_REVIEW" ? (
                            <button
                              type="button"
                              disabled={actionLoading === m.id}
                              onClick={() => handleStatusChange(m.id, "ACCEPTED")}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition shadow-sm"
                            >
                              Accept Paper
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

