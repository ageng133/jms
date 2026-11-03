export type UserRole = "AUTHOR" | "EDITOR" | "REVIEWER" | "ADMIN";

export type ManuscriptStatus =
  | "DRAFT"
  | "PRE_CHECK_PENDING"
  | "PRE_CHECK_FAILED"
  | "UNDER_DESK_REVIEW"
  | "IN_PEER_REVIEW"
  | "REVISION_REQUIRED"
  | "ACCEPTED"
  | "REJECTED";

export type FileType = "DOCX" | "PDF" | "LATEX_ZIP";

export type AuditStatus = "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface User {
  id: string;
  email: string;
  full_name: string;
  affiliation?: string;
  orcid_id?: string;
  role: UserRole;
  created_at: string;
}

export interface GeometryCheckItem {
  rule: string;
  expected: string;
  actual: string;
  passed: boolean;
  page: number;
  bbox: [number, number, number, number];
}

export interface AnonymizationLeak {
  type: string;
  leak: string;
  page: number;
}

export interface PreSubmissionAuditReport {
  audit_id: string;
  manuscript_id: string;
  overall_score: number;
  summary: {
    critical_errors: number;
    warnings: number;
    status: "PASS" | "FAIL";
  };
  modules: {
    geometry_and_layout: {
      pass: boolean;
      checks: GeometryCheckItem[];
    };
    anonymization: {
      pass: boolean;
      leaks_found: AnonymizationLeak[];
    };
    citation_crosscheck: {
      pass: boolean;
      total_cited: number;
      uncited_references: string[];
      missing_citations: string[];
    };
  };
  annotated_pdf_s3_key?: string;
}

export interface ManuscriptFile {
  id: string;
  manuscript_id: string;
  version: number;
  file_type: FileType;
  s3_key: string;
  original_filename: string;
  file_size_bytes: number;
  created_at: string;
  audits?: PreSubmissionAudit[];
}

export interface PreSubmissionAudit {
  id: string;
  manuscript_file_id: string;
  status: AuditStatus;
  score_overall?: number;
  layout_issues?: GeometryCheckItem[];
  citation_issues?: {
    pass: boolean;
    total_cited: number;
    uncited_references: string[];
    missing_citations: string[];
  };
  anonymization_flags?: AnonymizationLeak[];
  annotated_pdf_s3_key?: string;
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

export interface Manuscript {
  id: string;
  author_id: string;
  title: string;
  abstract: string;
  keywords: string[];
  status: ManuscriptStatus;
  files?: ManuscriptFile[];
  author?: User;
  created_at: string;
  updated_at: string;
}

