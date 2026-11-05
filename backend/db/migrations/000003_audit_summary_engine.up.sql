-- 000003_audit_summary_engine.up.sql
-- Persist the computed summary (score, critical errors, warnings, PASS/FAIL),
-- which engine produced the audit, and which built-in template preset was used.

ALTER TABLE pre_submission_audits
ADD COLUMN IF NOT EXISTS summary JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE pre_submission_audits
ADD COLUMN IF NOT EXISTS engine VARCHAR(100);

ALTER TABLE pre_submission_audits
ADD COLUMN IF NOT EXISTS template_preset VARCHAR(50);
