-- 000001_init_schema.up.sql
-- PostgreSQL 16+ Schema for Journal Management System (JMS) with AI Pre-Submission Engine

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enumerations
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('AUTHOR', 'EDITOR', 'REVIEWER', 'ADMIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE manuscript_status AS ENUM (
        'DRAFT', 
        'PRE_CHECK_PENDING', 
        'PRE_CHECK_FAILED', 
        'UNDER_DESK_REVIEW', 
        'IN_PEER_REVIEW', 
        'REVISION_REQUIRED', 
        'ACCEPTED', 
        'REJECTED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE file_type AS ENUM ('DOCX', 'PDF', 'LATEX_ZIP');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE audit_status AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    affiliation VARCHAR(255),
    orcid_id VARCHAR(19) CHECK (orcid_id IS NULL OR orcid_id ~ '^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$'),
    role user_role NOT NULL DEFAULT 'AUTHOR',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Manuscripts Table
CREATE TABLE IF NOT EXISTS manuscripts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    abstract TEXT NOT NULL,
    keywords TEXT[] NOT NULL DEFAULT '{}',
    status manuscript_status NOT NULL DEFAULT 'DRAFT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_manuscripts_author ON manuscripts(author_id);
CREATE INDEX IF NOT EXISTS idx_manuscripts_status ON manuscripts(status);

-- 3. Manuscript Files Table (Versioned)
CREATE TABLE IF NOT EXISTS manuscript_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    manuscript_id UUID NOT NULL REFERENCES manuscripts(id) ON DELETE CASCADE,
    version INT NOT NULL DEFAULT 1,
    file_type file_type NOT NULL,
    s3_key TEXT NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_manuscript_file_version UNIQUE (manuscript_id, version, file_type)
);

CREATE INDEX IF NOT EXISTS idx_manuscript_files_manuscript ON manuscript_files(manuscript_id);

-- 4. Pre-Submission Audits Table
CREATE TABLE IF NOT EXISTS pre_submission_audits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    manuscript_file_id UUID NOT NULL REFERENCES manuscript_files(id) ON DELETE CASCADE,
    status audit_status NOT NULL DEFAULT 'QUEUED',
    score_overall INT CHECK (score_overall IS NULL OR (score_overall >= 0 AND score_overall <= 100)),
    layout_issues JSONB NOT NULL DEFAULT '[]'::jsonb,
    citation_issues JSONB NOT NULL DEFAULT '{}'::jsonb,
    anonymization_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
    annotated_pdf_s3_key TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_audits_file ON pre_submission_audits(manuscript_file_id);
CREATE INDEX IF NOT EXISTS idx_audits_status ON pre_submission_audits(status);
