-- 000002_add_template_support.up.sql
-- Add support for journal template file uploads and dynamic comparison

-- 1. Add file_role column to manuscript_files
ALTER TABLE manuscript_files
ADD COLUMN IF NOT EXISTS file_role VARCHAR(50) NOT NULL DEFAULT 'MANUSCRIPT';

-- 2. Update unique constraint on manuscript_files
ALTER TABLE manuscript_files
DROP CONSTRAINT IF EXISTS uq_manuscript_file_version;

ALTER TABLE manuscript_files
ADD CONSTRAINT uq_manuscript_file_role UNIQUE (manuscript_id, version, file_role);

-- 3. Add template_file_id and template_specs to pre_submission_audits
ALTER TABLE pre_submission_audits
ADD COLUMN IF NOT EXISTS template_file_id UUID REFERENCES manuscript_files(id) ON DELETE SET NULL;

ALTER TABLE pre_submission_audits
ADD COLUMN IF NOT EXISTS template_specs JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_audits_template_file ON pre_submission_audits(template_file_id);
