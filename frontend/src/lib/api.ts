/**
 * JMS / Format Kilat — API client for the Go Gateway.
 *
 * Merged with the original prototype client (old-libs/api.ts): same function
 * names and the `jms_auth_explicit` session guard, plus the endpoints and
 * auth handling added during hardening (uploads with Bearer, audit report
 * mapping, template presets, system status, download URLs).
 */
import type {
  AnonymizationLeak,
  AuditStatus,
  FileType,
  GeometryCheckItem,
  Manuscript,
  ManuscriptStatus,
  PreSubmissionAudit,
  PreSubmissionAuditReport,
  TemplatePreset,
  TemplateSpecs,
  User,
} from "@/types/jms";

export function getApiBaseUrl(): string {
  if (typeof window !== "undefined" && window.location.hostname) {
    if (process.env.NEXT_PUBLIC_API_URL && !process.env.NEXT_PUBLIC_API_URL.includes("localhost")) {
      return process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, "");
    }
    if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
      // If accessing via standard HTTP/HTTPS reverse proxy (Nginx port 80 or 443)
      if (!window.location.port || window.location.port === "80" || window.location.port === "443") {
        return `${window.location.origin}/api/v1`;
      }
      return `${window.location.protocol}//${window.location.hostname}:8080/api/v1`;
    }
  }
  return (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1").replace(/\/+$/, "");
}

export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1").replace(/\/+$/, "");

const TOKEN_KEY = "jms_token";
const USER_KEY = "jms_user";
/** Set only by an explicit sign-in; sessions without it (legacy auto-seeded mocks) are discarded. */
const EXPLICIT_KEY = "jms_auth_explicit";

export const AUTH_CHANGED_EVENT = "jms:auth-changed";
export const AUTH_REQUIRED_EVENT = "jms:auth-required";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GoogleLoginPayload {
  credential?: string;
  id_token?: string;
  email?: string;
  full_name?: string;
  role?: string;
  affiliation?: string;
}

export interface AuthResult {
  token: string;
  expires_at: string;
  user: User;
}

export interface CreateDraftInput {
  title: string;
  abstract: string;
  keywords: string[];
}

export interface PresignResult {
  s3_key: string;
  upload_url: string;
  file_type: string;
  file_role: string;
  expires_in_sec: number;
}

export interface FileMetadataInput {
  s3_key: string;
  file_type: FileType;
  original_filename: string;
  file_size_bytes: number;
  file_role?: "MANUSCRIPT" | "TEMPLATE";
}

export interface ConfirmSubmissionInput {
  draft_file: FileMetadataInput;
  template_file?: FileMetadataInput;
  /** Built-in layout used when no template PDF is uploaded (default "ieee"). */
  template_preset?: string;
}

export interface TemplatePresetList {
  default_id: string;
  presets: TemplatePreset[];
}

export interface ConfirmSubmissionResult {
  audit_id: string;
  file_id: string;
  template_file_id?: string;
  manuscript_id: string;
  status: ManuscriptStatus;
  audit_status: AuditStatus;
  queued_at: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: string };
}

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// Session storage helpers
// ---------------------------------------------------------------------------

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function dispatch(eventName: string) {
  if (isBrowser()) window.dispatchEvent(new Event(eventName));
}

/** Clears sessions that were not created by an explicit sign-in. Returns true if the session is valid. */
function hasExplicitSession(): boolean {
  if (localStorage.getItem(EXPLICIT_KEY)) return true;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  return false;
}

export function getStoredToken(): string | null {
  if (!isBrowser()) return null;
  try {
    if (!hasExplicitSession()) return null;
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return !!getStoredToken();
}

export function getCurrentUser(): User | null {
  if (!isBrowser()) return null;
  try {
    if (!hasExplicitSession()) return null;
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function storeSession(token: string, user: User) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(EXPLICIT_KEY, "true");
  } catch {
    /* storage unavailable (private mode etc.) */
  }
  dispatch(AUTH_CHANGED_EVENT);
}

export function logout() {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(EXPLICIT_KEY);
  } catch {
    /* ignore */
  }
  dispatch(AUTH_CHANGED_EVENT);
}

// ---------------------------------------------------------------------------
// Core fetch helpers
// ---------------------------------------------------------------------------

async function parseEnvelope<T>(res: Response): Promise<T> {
  let body: ApiEnvelope<T> | null = null;
  try {
    body = (await res.json()) as ApiEnvelope<T>;
  } catch {
    body = null;
  }

  if (!res.ok || !body || body.success === false) {
    const message = body?.error?.message || `Request failed with status ${res.status}`;
    throw new ApiError(message, res.status, body?.error?.code);
  }

  return body.data as T;
}

async function fetchPublic<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
  });
  return parseEnvelope<T>(res);
}

async function fetchWithAuth<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  if (!token) {
    dispatch(AUTH_REQUIRED_EVENT);
    throw new ApiError("Authentication required. Please sign in with Google to continue.", 401, "UNAUTHORIZED");
  }

  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });

  if (res.status === 401) {
    logout();
    dispatch(AUTH_REQUIRED_EVENT);
  }

  return parseEnvelope<T>(res);
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function loginWithGoogle(payload: GoogleLoginPayload): Promise<AuthResult> {
  const result = await fetchPublic<AuthResult>("/auth/google", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  storeSession(result.token, result.user);
  return result;
}

export async function loginWithPassword(email: string, password: string): Promise<AuthResult> {
  const result = await fetchPublic<AuthResult>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  storeSession(result.token, result.user);
  return result;
}

export async function fetchCurrentUser(): Promise<User | null> {
  if (!getStoredToken()) return null;
  return fetchWithAuth<User>("/auth/me");
}

// ---------------------------------------------------------------------------
// Manuscripts
// ---------------------------------------------------------------------------

export async function listManuscripts(): Promise<Manuscript[]> {
  const list = await fetchWithAuth<Manuscript[] | null>("/manuscripts");
  return (list || []).map(normalizeManuscript);
}

export async function getManuscript(id: string): Promise<Manuscript> {
  const m = await fetchWithAuth<Manuscript>(`/manuscripts/${encodeURIComponent(id)}`);
  return normalizeManuscript(m);
}

export async function createDraftManuscript(input: CreateDraftInput): Promise<Manuscript> {
  return fetchWithAuth<Manuscript>("/manuscripts", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateManuscriptStatus(id: string, status: ManuscriptStatus | string) {
  return fetchWithAuth<{ id: string; status: ManuscriptStatus }>(
    `/manuscripts/${encodeURIComponent(id)}/status`,
    { method: "PATCH", body: JSON.stringify({ status }) }
  );
}

// ---------------------------------------------------------------------------
// Upload pipeline: presign -> upload -> confirm
// ---------------------------------------------------------------------------

export async function requestUploadPresign(
  manuscriptId: string,
  filename: string,
  fileType: FileType,
  fileRole: "MANUSCRIPT" | "TEMPLATE" = "MANUSCRIPT"
): Promise<PresignResult> {
  const result = await fetchWithAuth<PresignResult>(`/manuscripts/${encodeURIComponent(manuscriptId)}/files/presign`, {
    method: "POST",
    body: JSON.stringify({ filename, file_type: fileType, file_role: fileRole }),
  });

  // Normalize upload_url if it points to internal gateway endpoint (avoid localhost:8080 leaks)
  if (result.upload_url && result.upload_url.includes("/files/upload")) {
    try {
      const parsed = new URL(result.upload_url, typeof window !== "undefined" ? window.location.origin : "http://localhost:8080");
      result.upload_url = `${getApiBaseUrl()}/files/upload${parsed.search}`;
    } catch {
      const queryIdx = result.upload_url.indexOf("?");
      const query = queryIdx !== -1 ? result.upload_url.substring(queryIdx) : "";
      result.upload_url = `${getApiBaseUrl()}/files/upload${query}`;
    }
  }

  return result;
}

/**
 * Uploads raw file bytes to the URL returned by the presign step.
 * Works for both the gateway's Box/local upload endpoint and a real S3/MinIO
 * presigned URL. The JWT is only attached when the target is our own gateway,
 * never to third-party storage hosts.
 */
export async function uploadDirectToS3(uploadUrl: string, file: File): Promise<void> {
  const headers: Record<string, string> = {
    "Content-Type": file.type || "application/pdf",
  };

  // If uploadUrl points to the gateway's file upload endpoint, normalize it to the client's active API base URL
  let targetUrl = uploadUrl;
  if (targetUrl.includes("/files/upload")) {
    try {
      const parsed = new URL(targetUrl, typeof window !== "undefined" ? window.location.origin : "http://localhost:8080");
      targetUrl = `${getApiBaseUrl()}/files/upload${parsed.search}`;
    } catch {
      const queryIdx = targetUrl.indexOf("?");
      const query = queryIdx !== -1 ? targetUrl.substring(queryIdx) : "";
      targetUrl = `${getApiBaseUrl()}/files/upload${query}`;
    }
  }

  const token = getStoredToken();
  if (token && (targetUrl.includes("/files/upload") || isSameOrigin(targetUrl, getApiBaseUrl()))) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(targetUrl, { method: "PUT", headers, body: file });
  if (!res.ok) {
    let message = `Upload failed with status ${res.status}`;
    try {
      const body = (await res.json()) as ApiEnvelope<unknown>;
      if (body?.error?.message) message = body.error.message;
    } catch {
      /* S3 returns XML; keep generic message */
    }
    throw new ApiError(message, res.status);
  }
}

export async function confirmSubmission(
  manuscriptId: string,
  input: ConfirmSubmissionInput
): Promise<ConfirmSubmissionResult> {
  return fetchWithAuth<ConfirmSubmissionResult>(`/manuscripts/${encodeURIComponent(manuscriptId)}/files/confirm`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// ---------------------------------------------------------------------------
// Template presets (Template Vault)
// ---------------------------------------------------------------------------

export interface EngineStatus {
  name: string;
  status: "online" | "offline" | "configured";
}

// 4. Interactive AI Academic Copilot
export async function askAICopilot(
  req: import("@/types/jms").AICopilotRequest
): Promise<import("@/types/jms").AICopilotResponse> {
  const res = await fetch(`${API_BASE_URL}/ai/copilot`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || "AI Copilot request failed");
  }

  const json = await res.json();
  return json.data;
}
export interface SystemStatus {
  status: "HEALTHY" | "DEGRADED";
  /** "box-cloud" | "local-disk" | "minio" */
  storage: string;
  engines: EngineStatus[];
}

/** Real storage driver + audit engine liveness (GET /system/status). */
export async function getSystemStatus(): Promise<SystemStatus> {
  const res = await fetchWithAuth<SystemStatus>("/system/status");
  return { ...res, engines: res.engines || [] };
}

export async function listTemplatePresets(): Promise<TemplatePresetList> {
  const res = await fetchWithAuth<TemplatePresetList>("/templates");
  return { default_id: res.default_id, presets: res.presets || [] };
}

// ---------------------------------------------------------------------------
// Audits
// ---------------------------------------------------------------------------

/** GET /audits/:id body: the stored audit plus fields for the comparison UI. */
export type AuditApiResponse = PreSubmissionAudit &
  Pick<PreSubmissionAuditReport, "original_pdf_s3_key" | "ai_engine" | "ai_mode" | "fixed_layout">;

/** Accepts an audit ID or a manuscript ID (the gateway resolves the latest audit). */
export async function getRawAudit(auditId: string): Promise<AuditApiResponse> {
  return fetchWithAuth<AuditApiResponse>(`/audits/${encodeURIComponent(auditId)}`);
}

/** Fetches an audit and reshapes the DB record into the report contract used by the UI. */
export async function getAuditReport(auditId: string): Promise<PreSubmissionAuditReport> {
  const raw = await getRawAudit(auditId);
  return toAuditReport(raw);
}

/** Latest audit of the manuscript's latest draft file (template files carry no audits). */
export function getLatestAudit(m: Manuscript): PreSubmissionAudit | null {
  const drafts = (m.files || []).filter((f) => (f.file_role || "MANUSCRIPT") === "MANUSCRIPT");
  if (drafts.length === 0) return null;

  const latestFile = drafts.reduce((a, b) => (b.version > a.version ? b : a));
  const audits = latestFile.audits || [];
  if (audits.length === 0) return null;

  return audits.reduce((a, b) => (new Date(b.created_at) > new Date(a.created_at) ? b : a));
}

export async function getLatestAuditIdForManuscript(manuscriptId: string): Promise<string | null> {
  const m = await getManuscript(manuscriptId);
  return getLatestAudit(m)?.id ?? null;
}

/** URL for viewing/downloading a stored file (e.g. the annotated PDF) through the gateway. */
export function getFileDownloadUrl(key: string): string {
  const params = new URLSearchParams({ key });
  const token = getStoredToken();
  if (token) params.set("token", token);
  return `${getApiBaseUrl()}/files/download?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function isSameOrigin(a: string, b: string): boolean {
  try {
    return new URL(a).origin === new URL(b).origin;
  } catch {
    return false;
  }
}

function normalizeManuscript(m: Manuscript): Manuscript {
  return {
    ...m,
    keywords: m.keywords || [],
    files: (m.files || []).map((f) => ({ ...f, audits: f.audits || [] })),
  };
}

function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function toAuditReport(raw: AuditApiResponse): PreSubmissionAuditReport {
  const checks = asArray<GeometryCheckItem>(raw.layout_issues);
  const leaks = asArray<AnonymizationLeak>(raw.anonymization_flags);
  const cite = (raw.citation_issues || {}) as Partial<NonNullable<PreSubmissionAudit["citation_issues"]>>;
  const uncited = asArray<string>(cite.uncited_references);
  const missing = asArray<string>(cite.missing_citations);

  const failedChecks = checks.filter((c) => !c.passed);

  // Prefer the summary persisted by the backend (single scoring rule).
  // Fallback for older audits: same rule as domain.ScoreAudit in Go.
  const stored = raw.summary;
  const criticalErrors = stored?.critical_errors ?? new Set(failedChecks.map((c) => c.rule)).size;
  const warnings = stored?.warnings ?? leaks.length + uncited.length + missing.length;
  const status: "PASS" | "FAIL" =
    stored?.status === "PASS" || stored?.status === "FAIL"
      ? stored.status
      : criticalErrors === 0 && warnings <= 2
      ? "PASS"
      : "FAIL";

  const specs = raw.template_specs as TemplateSpecs | undefined;
  const hasSpecs = !!specs && typeof specs === "object" && Object.keys(specs).length > 0 && !!specs.page_format;

  return {
    audit_id: raw.id,
    manuscript_id: "",
    status: raw.status,
    error_message: raw.error_message,
    engine: raw.engine,
    overall_score: raw.score_overall ?? 0,
    summary: { critical_errors: criticalErrors, warnings, status },
    modules: {
      geometry_and_layout: { pass: failedChecks.length === 0, checks },
      anonymization: { pass: leaks.length === 0, leaks_found: leaks },
      citation_crosscheck: {
        pass: cite.pass ?? (uncited.length === 0 && missing.length === 0),
        total_cited: cite.total_cited ?? 0,
        uncited_references: uncited,
        missing_citations: missing,
      },
    },
    template_specs: hasSpecs ? specs : undefined,
    annotated_pdf_s3_key: raw.annotated_pdf_s3_key || undefined,
    original_pdf_s3_key: raw.original_pdf_s3_key || undefined,
    fixed_layout: raw.fixed_layout || undefined,
    ai_engine: raw.ai_engine,
    ai_mode: raw.ai_mode,
  };
}
