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
	"github.com/jms-uts/backend/gateway/internal/infrastructure/postgres"
	"github.com/jms-uts/backend/gateway/internal/infrastructure/redis"
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
		storageClient, err = storage.NewBoxStorage(&cfg.Box, cfg.App.Port)
		if err != nil {
			log.Fatalf("[Gateway] Failed to initialize Box storage client: %v", err)
		}
	}

	// 3. Initialize Redis Event Publisher (Optional for Lean POC)
	var eventPublisher domain.EventPublisher
	if cfg.EnableRedis {
		eventPublisher, err = redis.NewEventPublisher(&cfg.Redis)
		if err != nil {
			log.Printf("[Gateway] Warning: Redis disabled or failed: %v", err)
		}
	} else {
		log.Println("[Gateway] Lean POC Mode: Redis disabled. Direct Google AI engine active.")
	}

	// 4. Initialize Repositories
	userRepo := postgres.NewUserRepository(db)
	manuscriptRepo := postgres.NewManuscriptRepository(db)
	fileRepo := postgres.NewManuscriptFileRepository(db)
	auditRepo := postgres.NewAuditRepository(db)

	// 5. Initialize Direct Google AI Service
	googleAIService := ai.NewGoogleAIService(&cfg.GoogleAI, db, storageClient)

	// 6. Initialize Usecases
	authUsecase := usecase.NewAuthUsecase(userRepo, cfg.JWT)
	submissionUsecase := usecase.NewSubmissionUsecase(
		db,
		manuscriptRepo,
		fileRepo,
		auditRepo,
		eventPublisher,
		storageClient,
		googleAIService,
	)

	// 7. Initialize HTTP Handlers
	healthHandler := handler.NewHealthHandler(cfg.App.Name)
	authHandler := handler.NewAuthHandler(authUsecase)
	submissionHandler := handler.NewSubmissionHandler(submissionUsecase, storageClient, googleAIService)

	// 7. Initialize Gin Router
	router := httpDelivery.NewRouter(healthHandler, authHandler, submissionHandler, authUsecase)

	// 8. Server Setup with Graceful Shutdown
	srv := &http.Server{
		Addr:         fmt.Sprintf(":%s", cfg.App.Port),
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
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

