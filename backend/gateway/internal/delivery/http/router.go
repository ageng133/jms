package http

import (
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/jms-uts/backend/gateway/internal/delivery/http/handler"
	"github.com/jms-uts/backend/gateway/internal/delivery/http/middleware"
	"github.com/jms-uts/backend/gateway/internal/usecase"
)

func NewRouter(
	healthHandler *handler.HealthHandler,
	authHandler *handler.AuthHandler,
	submissionHandler *handler.SubmissionHandler,
	authUsecase usecase.AuthUsecase,
) *gin.Engine {
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(gin.Logger())

	// IP Rate Limiting Guard (600 req/min, burst 100)
	rateLimiter := middleware.NewRateLimiter(600, 100)
	r.Use(rateLimiter.Middleware())

	// Configure CORS for Next.js frontend
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000", "http://127.0.0.1:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Healthcheck
	r.GET("/healthz", healthHandler.HealthCheck)

	api := r.Group("/api/v1")
	{
		api.GET("/health", healthHandler.HealthCheck)
		api.GET("/system/readiness", healthHandler.SystemReadiness)
		api.POST("/ai/copilot", submissionHandler.AskCopilot)

		// Public Auth routes
		auth := api.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
			auth.POST("/google", authHandler.GoogleLogin)
		}

		// Direct Box.com Storage File Upload & Download
		files := api.Group("/files")
		{
			files.PUT("/upload", submissionHandler.DirectFileUpload)
			files.POST("/upload", submissionHandler.DirectFileUpload)
			files.GET("/download", submissionHandler.DirectFileDownload)
		}

		// Protected routes
		protected := api.Group("/")
		protected.Use(middleware.AuthMiddleware(authUsecase))
		{
			// Auth Profile Verification
			protected.GET("/auth/me", authHandler.GetCurrentUser)

			// Manuscripts
			manuscripts := protected.Group("/manuscripts")
			{
				manuscripts.POST("", submissionHandler.CreateDraft)
				manuscripts.GET("", submissionHandler.ListManuscripts)
				manuscripts.GET("/:id", submissionHandler.GetManuscript)
				manuscripts.PATCH("/:id/status", submissionHandler.UpdateStatus)

				// Ingestion 3-step pipeline
				manuscripts.POST("/:id/files/presign", submissionHandler.RequestUploadURL)
				manuscripts.POST("/:id/files/confirm", submissionHandler.ConfirmSubmission)
			}

			// Audits
			audits := protected.Group("/audits")
			{
				audits.GET("/:id", submissionHandler.GetAuditReport)
			}
		}
	}

	return r
}

