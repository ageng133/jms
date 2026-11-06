package postgres

import (
	"log"

	"github.com/jms-uts/backend/gateway/config"
	"github.com/jms-uts/backend/gateway/internal/domain"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func NewDB(cfg *config.PostgresConfig) (*gorm.DB, error) {
	db, err := gorm.Open(postgres.Open(cfg.DSN()), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return nil, err
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}

	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)

	log.Println("[Postgres] Successfully connected to database:", cfg.DBName)

	// Zero-touch automated schema migration and types initialization
	_ = db.Exec(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`).Error
	_ = db.Exec(`DO $$ BEGIN
		IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
			CREATE TYPE user_role AS ENUM ('AUTHOR', 'EDITOR', 'REVIEWER', 'ADMIN');
		END IF;
		IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'manuscript_status') THEN
			CREATE TYPE manuscript_status AS ENUM ('DRAFT', 'PRE_CHECK_PENDING', 'PRE_CHECK_FAILED', 'UNDER_DESK_REVIEW', 'IN_PEER_REVIEW', 'REVISION_REQUIRED', 'ACCEPTED', 'REJECTED');
		END IF;
		IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'file_type') THEN
			CREATE TYPE file_type AS ENUM ('DOCX', 'PDF', 'LATEX_ZIP');
		END IF;
		IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_status') THEN
			CREATE TYPE audit_status AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');
		END IF;
	END $$;`).Error

	if err := db.AutoMigrate(&domain.User{}, &domain.Manuscript{}, &domain.ManuscriptFile{}, &domain.PreSubmissionAudit{}); err != nil {
		log.Printf("[Postgres] AutoMigrate warning: %v", err)
	}

	// Seed demo accounts if users table is empty
	var userCount int64
	db.Model(&domain.User{}).Count(&userCount)
	if userCount == 0 {
		hash := "$2a$10$jbUwx49Nw0R6QfFw./LV/uIbWwPiljItNP28tM5LNxxjXldjtGzJO" // password: password123
		db.Exec(`INSERT INTO users (id, email, password_hash, full_name, affiliation, role, created_at, updated_at) VALUES 
			('11111111-1111-1111-1111-111111111111', 'author@jms.org', ?, 'Dr. Alice Smith', 'MIT Department of Computer Science', 'AUTHOR', NOW(), NOW()),
			('22222222-2222-2222-2222-222222222222', 'editor@jms.org', ?, 'Prof. Robert Davis', 'IEEE Computer Society', 'EDITOR', NOW(), NOW()),
			('44444444-4444-4444-4444-444444444444', 'admin@jms.org', ?, 'Sysadmin JMS', 'JMS Publishing Foundation', 'ADMIN', NOW(), NOW())
			ON CONFLICT (email) DO NOTHING`, hash, hash, hash)
		log.Println("[Postgres] Seeded default demo users (author@jms.org, editor@jms.org, admin@jms.org)")
	}

	return db, nil
}

