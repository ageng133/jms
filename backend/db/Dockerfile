FROM postgres:16-alpine

# Pre-bake SQL migrations and dev seed data into PostgreSQL init directory
COPY migrations/000001_init_schema.up.sql /docker-entrypoint-initdb.d/001_init_schema.sql
COPY migrations/000002_add_template_support.up.sql /docker-entrypoint-initdb.d/002_add_template_support.sql
COPY migrations/000003_audit_summary_engine.up.sql /docker-entrypoint-initdb.d/003_audit_summary_engine.sql
COPY seeds/001_seed_dev_data.sql /docker-entrypoint-initdb.d/004_seed_dev_data.sql

EXPOSE 5432

