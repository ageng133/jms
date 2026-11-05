import { Manuscript, PreSubmissionAuditReport } from "@/types/jms";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  if (!localStorage.getItem("jms_auth_explicit")) {
    localStorage.removeItem("jms_token");
    localStorage.removeItem("jms_user");
    return null;
  }
  return localStorage.getItem("jms_token");
}

export function isAuthenticated(): boolean {
  return !!getStoredToken();
}

export async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const token = getStoredToken();
  if (!token) {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("jms:auth-required"));
    }
    throw new Error("Authentication required. Please sign in with Google to continue.");
  }

  const headers = new Headers(options.headers || {});
  
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  // If token is expired or unauthorized, clear token and notify UI
  if (res.status === 401 && typeof window !== "undefined") {
    logout();
    window.dispatchEvent(new CustomEvent("jms:auth-required"));
    throw new Error("Session expired or unauthorized. Please sign in with Google to continue.");
  }

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json?.error?.message || json?.error?.details || "API request failed");
  }
  return json.data;
}

export interface GoogleLoginPayload {
  email?: string;
  full_name?: string;
  role?: string;
  affiliation?: string;
  google_id?: string;
  credential?: string;
  id_token?: string;
}

// 0. Auth & Google Sign-In
export async function loginWithGoogle(
  payload: GoogleLoginPayload
): Promise<{ token: string; user: any }> {
  const res = await fetch(`${API_BASE}/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json?.error?.message || "Google authentication failed");
  }
  if (typeof window !== "undefined") {
    localStorage.setItem("jms_token", json.data.token);
    localStorage.setItem("jms_user", JSON.stringify(json.data.user));
    localStorage.setItem("jms_auth_explicit", "true");
    window.dispatchEvent(new CustomEvent("jms:auth-changed"));
  }
  return json.data;
}

export async function fetchCurrentUser(): Promise<any> {
  return fetchWithAuth("/auth/me");
}

export function getCurrentUser() {
  if (typeof window === "undefined") return null;
  // Guard against legacy auto-seeded mock sessions: only accept explicit user logins
  if (!localStorage.getItem("jms_auth_explicit")) {
    localStorage.removeItem("jms_token");
    localStorage.removeItem("jms_user");
    return null;
  }
  const raw = localStorage.getItem("jms_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function logout() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("jms_token");
    localStorage.removeItem("jms_user");
    localStorage.removeItem("jms_auth_explicit");
    window.dispatchEvent(new CustomEvent("jms:auth-changed"));
  }
}

// 1. Manuscript operations
export async function createDraftManuscript(payload: {
  title: string;
  abstract: string;
  keywords: string[];
}): Promise<Manuscript> {
  return fetchWithAuth("/manuscripts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listManuscripts(): Promise<Manuscript[]> {
  return fetchWithAuth("/manuscripts");
}

export async function getManuscript(id: string): Promise<Manuscript> {
  return fetchWithAuth(`/manuscripts/${id}`);
}

export async function updateManuscriptStatus(
  id: string,
  status: string
): Promise<{ id: string; status: string }> {
  return fetchWithAuth(`/manuscripts/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export interface FileMetadataInput {
  s3_key: string;
  file_type: "PDF" | "DOCX" | "LATEX_ZIP";
  original_filename: string;
  file_size_bytes: number;
  file_role?: "MANUSCRIPT" | "TEMPLATE";
}

export interface ConfirmSubmissionInput {
  s3_key?: string;
  file_type?: "PDF" | "DOCX" | "LATEX_ZIP";
  original_filename?: string;
  file_size_bytes?: number;
  draft_file?: FileMetadataInput;
  template_file?: FileMetadataInput;
}

// 2. 3-Step Ingestion Pipeline
// Step 1: Request S3 Presigned PUT URL
export async function requestUploadPresign(
  manuscriptId: string,
  filename: string,
  fileType: "PDF" | "DOCX" | "LATEX_ZIP",
  fileRole: "MANUSCRIPT" | "TEMPLATE" = "MANUSCRIPT"
): Promise<{
  s3_key: string;
  upload_url: string;
  file_type: string;
  file_role: string;
  expires_in_sec: number;
}> {
  return fetchWithAuth(`/manuscripts/${manuscriptId}/files/presign`, {
    method: "POST",
    body: JSON.stringify({ filename, file_type: fileType, file_role: fileRole }),
  });
}

// Step 2: Directly upload file bytes to S3/MinIO
export async function uploadDirectToS3(uploadUrl: string, file: File): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type || "application/pdf",
    },
    body: file,
  });

  if (!res.ok) {
    throw new Error(`Direct S3 upload failed with status ${res.status}`);
  }
}

// Step 3: Confirm file metadata in Gateway & dispatch Redis AI audit job
export async function confirmSubmission(
  manuscriptId: string,
  payload: ConfirmSubmissionInput
): Promise<{
  audit_id: string;
  file_id: string;
  template_file_id?: string;
  manuscript_id: string;
  status: string;
  audit_status: string;
  queued_at: string;
}> {
  return fetchWithAuth(`/manuscripts/${manuscriptId}/files/confirm`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// 3. Query Audit Report
export async function getAuditReport(auditId: string): Promise<PreSubmissionAuditReport> {
  return fetchWithAuth(`/audits/${auditId}`);
}

