-- 000003_audit_summary_engine.down.sql
ALTER TABLE pre_submission_audits
DROP COLUMN IF EXISTS template_preset,
DROP COLUMN IF EXISTS engine,
DROP COLUMN IF EXISTS summary;
