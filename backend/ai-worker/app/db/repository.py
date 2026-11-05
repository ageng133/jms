import json
from datetime import datetime, timezone
import psycopg2
from psycopg2.extras import RealDictCursor

from app.config import settings
from app.models.audit import AuditReport


class DBRepository:
    def __init__(self):
        self.dsn = settings.postgres_dsn

    def get_connection(self):
        return psycopg2.connect(self.dsn, cursor_factory=RealDictCursor)

    def mark_audit_processing(self, audit_id: str):
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE pre_submission_audits SET status = 'PROCESSING' WHERE id = %s",
                    (audit_id,)
                )
            conn.commit()

    def save_audit_report(self, report: AuditReport, manuscript_id: str):
        now = datetime.now(timezone.utc)
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                # 1. Update pre_submission_audits
                template_specs_json = (
                    json.dumps(report.template_specs.model_dump())
                    if report.template_specs
                    else "{}"
                )
                cur.execute(
                    """
                    UPDATE pre_submission_audits
                    SET status = 'COMPLETED',
                        score_overall = %s,
                        layout_issues = %s::jsonb,
                        citation_issues = %s::jsonb,
                        anonymization_flags = %s::jsonb,
                        template_specs = %s::jsonb,
                        summary = %s::jsonb,
                        engine = %s,
                        annotated_pdf_s3_key = %s,
                        completed_at = %s
                    WHERE id = %s
                    """,
                    (
                        report.overall_score,
                        json.dumps([c.model_dump() for c in report.modules.geometry_and_layout.checks]),
                        json.dumps(report.modules.citation_crosscheck.model_dump(by_alias=True)),
                        json.dumps([l.model_dump() for l in report.modules.anonymization.leaks_found]),
                        template_specs_json,
                        json.dumps({**report.summary.model_dump(), "overall_score": report.overall_score}),
                        "pymupdf-worker",
                        report.annotated_pdf_s3_key,
                        now,
                        report.audit_id,
                    )
                )

                # 2. Update manuscripts status based on audit summary
                next_manuscript_status = (
                    "UNDER_DESK_REVIEW" if report.summary.status == "PASS" else "PRE_CHECK_FAILED"
                )
                cur.execute(
                    """
                    UPDATE manuscripts
                    SET status = %s, updated_at = %s
                    WHERE id = %s
                    """,
                    (next_manuscript_status, now, manuscript_id)
                )
            conn.commit()

    def mark_audit_failed(self, audit_id: str, error_msg: str):
        now = datetime.now(timezone.utc)
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE pre_submission_audits
                    SET status = 'FAILED', error_message = %s, completed_at = %s
                    WHERE id = %s
                    """,
                    (error_msg, now, audit_id)
                )
            conn.commit()

