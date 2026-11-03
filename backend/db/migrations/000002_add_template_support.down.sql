-- 000002_add_template_support.down.sql
ALTER TABLE pre_submission_audits
DROP COLUMN IF EXISTS template_specs,
DROP COLUMN IF EXISTS template_file_id;

ALTER TABLE manuscript_files
DROP CONSTRAINT IF EXISTS uq_manuscript_file_role,
ADD CONSTRAINT uq_manuscript_file_version UNIQUE (manuscript_id, version, file_type),
DROP COLUMN IF EXISTS file_role;
