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

export interface TemplateSpecs {
  page_format: string;
  page_width_mm: number;
  page_height_mm: number;
  margin_top_mm: number;
  margin_bottom_mm: number;
  margin_left_mm: number;
  margin_right_mm: number;
  column_count: number;
  column_gap_mm?: number;
  is_custom_template?: boolean;
}

export interface FixedLayoutRemediation {
  target_format: string;
  target_margins_mm: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  column_count: number;
  column_gap_mm: number;
  anonymization_fixes?: string[];
  remediation_actions: string[];
  camera_ready_status: string;
  annotated_pdf_key?: string;
  download_key?: string;
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
  template_specs?: TemplateSpecs;
  annotated_pdf_s3_key?: string;
  original_pdf_s3_key?: string;
  ai_engine?: string;
  ai_mode?: "LIVE_GEMINI_AI" | "DETERMINISTIC_LOCAL_RECOVERY";
  fixed_layout?: FixedLayoutRemediation;
}

export type AcademicTier = "S1" | "S2" | "S3" | "LECTURER";

export type CopilotAction =
  | "CHAT"
  | "LATEX_FIX"
  | "BIBTEX_FIX"
  | "DEFENSE_PREDICTION"
  | "MARGIN_EXPLAIN";

export interface AICopilotRequest {
  manuscript_id?: string;
  audit_id?: string;
  prompt: string;
  academic_level: AcademicTier;
  action: CopilotAction;
}

export interface AICopilotResponse {
  response: string;
  academic_level: AcademicTier;
  action: CopilotAction;
  suggested_snippets?: string[];
  defense_predictions?: string[];
  checklist?: string[];
  engine_mode: string;
  timestamp: string;
}

export interface ManuscriptFile {
  id: string;
  manuscript_id: string;
  version: number;
  file_type: FileType;
  file_role?: "MANUSCRIPT" | "TEMPLATE";
  s3_key: string;
  original_filename: string;
  file_size_bytes: number;
  created_at: string;
  audits?: PreSubmissionAudit[];
}

export interface PreSubmissionAudit {
  id: string;
  manuscript_file_id: string;
  template_file_id?: string;
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
  template_specs?: TemplateSpecs;
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

