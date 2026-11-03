-- 000001_init_schema.down.sql

DROP TABLE IF EXISTS pre_submission_audits;
DROP TABLE IF EXISTS manuscript_files;
DROP TABLE IF EXISTS manuscripts;
DROP TABLE IF EXISTS users;

DROP TYPE IF EXISTS audit_status;
DROP TYPE IF EXISTS file_type;
DROP TYPE IF EXISTS manuscript_status;
DROP TYPE IF EXISTS user_role;

