package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jms-uts/backend/gateway/config"
	httpDelivery "github.com/jms-uts/backend/gateway/internal/delivery/http"
	"github.com/jms-uts/backend/gateway/internal/delivery/http/handler"
	"github.com/jms-uts/backend/gateway/internal/domain"
	"github.com/jms-uts/backend/gateway/internal/infrastructure/ai"
	"github.com/jms-uts/backend/gateway/internal/infrastructure/auditengine"
	"github.com/jms-uts/backend/gateway/internal/infrastructure/googleauth"
	"github.com/jms-uts/backend/gateway/internal/infrastructure/postgres"
	"github.com/jms-uts/backend/gateway/internal/infrastructure/redis"
	"github.com/jms-uts/backend/gateway/internal/infrastructure/remediation"
	"github.com/jms-uts/backend/gateway/internal/infrastructure/storage"
	"github.com/jms-uts/backend/gateway/internal/usecase"
)

func main() {
	log.Println("[Gateway] Bootstrapping JMS API Gateway...")

	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("[Gateway] Failed to load config: %v", err)
	}

	// 1. Initialize PostgreSQL
	db, err := postgres.NewDB(&cfg.Postgres)
	if err != nil {
		log.Fatalf("[Gateway] Failed to initialize DB: %v", err)
	}

	// 2. Initialize Storage Client (Default: Box.com Cloud / Local Storage for Lean POC)
	var storageClient domain.StorageClient
	if cfg.StorageDriver == "minio" {
		storageClient, err = storage.NewMinIOStorage(&cfg.S3)
		if err != nil {
			log.Fatalf("[Gateway] Failed to initialize S3 storage client: %v", err)
		}
	} else {
		storageClient, err = storage.NewBoxStorage(&cfg.Box, cfg.App.PublicURL)
		if err != nil {
			log.Fatalf("[Gateway] Failed to initialize Box storage client: %v", err)
		}
	}

	// 3. Initialize Redis Event Publisher (Optional for Lean POC)
	var eventPublisher domain.EventPublisher
	if cfg.EnableRedis {
		publisher, perr := redis.NewEventPublisher(&cfg.Redis)
		if perr != nil {
			// Keep eventPublisher a true nil interface (a typed nil pointer would
			// make the usecase think Redis is on and panic on publish).
			log.Printf("[Gateway] Warning: Redis unavailable (%v); falling back to in-process audits.", perr)
		} else {
			eventPublisher = publisher
		}
	} else {
		log.Println("[Gateway] Redis disabled: audits run in-process (ai-worker HTTP / Gemini).")
	}

	// 4. Initialize Repositories
	userRepo := postgres.NewUserRepository(db)
	manuscriptRepo := postgres.NewManuscriptRepository(db)
	fileRepo := postgres.NewManuscriptFileRepository(db)
	auditRepo := postgres.NewAuditRepository(db)

	// 5. Audit engines, tried in order: PyMuPDF worker, then Gemini fallback.
	var engines []domain.AuditEngine
	if cfg.AuditEngine.WorkerURL != "" {
		engines = append(engines, auditengine.NewWorkerClient(cfg.AuditEngine.WorkerURL, cfg.AuditEngine.WorkerToken, cfg.AuditEngine.Timeout))
	}
	if cfg.GoogleAI.APIKey != "" {
		engines = append(engines, ai.NewGeminiEngine(&cfg.GoogleAI))
	}
	auditRunner := usecase.NewAuditRunner(auditRepo, storageClient, cfg.AuditEngine.Timeout, engines...)
	if cfg.AuditEngine.ReshapeEnabled {
		if rs := remediation.NewScriptRunner(cfg.AuditEngine.ReshapePython, cfg.AuditEngine.ReshapeScript, 2*time.Minute); rs != nil {
			auditRunner.WithRemediator(rs)
			log.Printf("[Gateway] Layout reshape enabled: %s", rs.Describe())
		} else {
			log.Println("[Gateway] Layout reshape disabled: scripts/remediate_pdf.py not found (set RESHAPE_SCRIPT).")
		}
	}
	if names := auditRunner.EngineNames(); len(names) > 0 {
		log.Printf("[Gateway] Audit engines (in fallback order): %v", names)
	} else {
		log.Println("[Gateway] WARNING: no audit engine configured; every audit will FAIL. Set AUDIT_ENGINE_URL or GEMINI_API_KEY.")
	}

	// In-process jobs do not survive a restart: fail them so they never hang in PROCESSING.
	if eventPublisher == nil {
		if n, err := auditRepo.FailUnfinished(context.Background(), "Audit interrupted because the server restarted. Please upload the manuscript again."); err != nil {
			log.Printf("[Gateway] Warning: could not clean up unfinished audits: %v", err)
		} else if n > 0 {
			log.Printf("[Gateway] Marked %d unfinished audit(s) as FAILED after restart.", n)
		}
	}

	// 6. Initialize Usecases
	authOpts := []usecase.AuthOption{
		usecase.WithDemoLogin(cfg.Auth.AllowDemoLogin),
		usecase.WithRoleAllowlists(cfg.Auth.AdminEmails, cfg.Auth.EditorEmails),
	}
	if cfg.Auth.GoogleClientID != "" {
		authOpts = append(authOpts, usecase.WithGoogleVerifier(googleauth.NewVerifier(cfg.Auth.GoogleClientID)))
		log.Println("[Gateway] Google ID token verification enabled.")
	} else {
		log.Println("[Gateway] GOOGLE_CLIENT_ID not set: real Google sign-in is disabled.")
	}
	if cfg.Auth.AllowDemoLogin {
		log.Println("[Gateway] WARNING: AUTH_DEMO_LOGIN is enabled. Anyone can sign in with any email. Do not use in production.")
	}
	authUsecase := usecase.NewAuthUsecase(userRepo, cfg.JWT, authOpts...)
	submissionUsecase := usecase.NewSubmissionUsecase(
		db,
		manuscriptRepo,
		fileRepo,
		auditRepo,
		eventPublisher,
		storageClient,
		auditRunner,
	)

	// 7. Initialize HTTP Handlers
	storageMode := "local-disk"
	switch {
	case cfg.StorageDriver == "minio":
		storageMode = "minio"
	case cfg.Box.DeveloperToken != "":
		storageMode = "box-cloud"
	}
	healthHandler := handler.NewHealthHandler(cfg.App.Name, storageMode, auditRunner)
	authHandler := handler.NewAuthHandler(authUsecase)
	googleAIService := ai.NewGoogleAIService(&cfg.GoogleAI)
	submissionHandler := handler.NewSubmissionHandler(submissionUsecase, storageClient, cfg.App.MaxUploadBytes, googleAIService)

	// 7. Initialize Gin Router
	router := httpDelivery.NewRouter(healthHandler, authHandler, submissionHandler, authUsecase, cfg.App.AllowedOrigins)

	// 8. Server Setup with Graceful Shutdown
	srv := &http.Server{
		Addr:              fmt.Sprintf(":%s", cfg.App.Port),
		Handler:           router,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       120 * time.Second, // large PDF uploads over slow links
		WriteTimeout:      120 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	go func() {
		log.Printf("[Gateway] Server running at http://localhost:%s\n", cfg.App.Port)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("[Gateway] Listen error: %v", err)
		}
	}()

	// Graceful shutdown on SIGINT or SIGTERM
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("[Gateway] Shutting down server gracefully...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("[Gateway] Server forced shutdown: %v", err)
	}

	log.Println("[Gateway] Server exiting cleanly.")
}
