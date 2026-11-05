package http

import (
	"fmt"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/jms-uts/backend/gateway/internal/delivery/http/handler"
	"github.com/jms-uts/backend/gateway/internal/delivery/http/middleware"
	"github.com/jms-uts/backend/gateway/internal/domain"
	"github.com/jms-uts/backend/gateway/internal/usecase"
)

func NewRouter(
	healthHandler *handler.HealthHandler,
	authHandler *handler.AuthHandler,
	submissionHandler *handler.SubmissionHandler,
	authUsecase usecase.AuthUsecase,
	allowedOrigins []string,
) *gin.Engine {
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(gin.LoggerWithFormatter(redactedLogFormatter))

	if len(allowedOrigins) == 0 {
		allowedOrigins = []string{"http://localhost:3000", "http://127.0.0.1:3000"}
	}

	// IP Rate Limiting Guard (600 req/min, burst 100)
	rateLimiter := middleware.NewRateLimiter(600, 100)
	r.Use(rateLimiter.Middleware())

	// Configure CORS for Next.js frontend
	r.Use(cors.New(cors.Config{
		AllowOrigins:     allowedOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Healthcheck
	r.GET("/healthz", healthHandler.HealthCheck)

	authRequired := middleware.AuthMiddleware(authUsecase)
	editorsOnly := middleware.RequireRoles(domain.RoleEditor, domain.RoleAdmin)

	api := r.Group("/api/v1")
	{
		api.GET("/health", healthHandler.HealthCheck)
		api.GET("/system/readiness", healthHandler.SystemReadiness)
		api.GET("/system/status", authRequired, healthHandler.SystemStatus)
		api.POST("/ai/copilot", submissionHandler.AskCopilot)

		// Public Auth routes
		auth := api.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
			auth.POST("/google", authHandler.GoogleLogin)
			auth.GET("/me", authRequired, authHandler.GetCurrentUser)
		}

		// Box / local storage proxy. Authenticated + per-object ownership checks.
		files := api.Group("/files")
		{
			files.PUT("/upload", authRequired, submissionHandler.DirectFileUpload)
			files.POST("/upload", authRequired, submissionHandler.DirectFileUpload)
			// Download is opened by <iframe>/<a>, so ?token= is accepted here only.
			files.GET("/download", middleware.AuthMiddlewareAllowQueryToken(authUsecase), submissionHandler.DirectFileDownload)
		}

		// Manuscripts
		manuscripts := api.Group("/manuscripts", authRequired)
		{
			manuscripts.POST("", submissionHandler.CreateDraft)
			manuscripts.GET("", submissionHandler.ListManuscripts)
			manuscripts.GET("/:id", submissionHandler.GetManuscript)
			manuscripts.PATCH("/:id/status", editorsOnly, submissionHandler.UpdateStatus)

			// Ingestion 3-step pipeline
			manuscripts.POST("/:id/files/presign", submissionHandler.RequestUploadURL)
			manuscripts.POST("/:id/files/confirm", submissionHandler.ConfirmSubmission)
		}

		// Built-in journal template presets
		api.GET("/templates", authRequired, submissionHandler.ListTemplatePresets)

		// Audits
		audits := api.Group("/audits", authRequired)
		{
			audits.GET("/:id", submissionHandler.GetAuditReport)
		}
	}

	return r
}

// redactedLogFormatter mirrors gin's default access log but drops the query
// string, so JWTs passed as ?token= never end up in log files.
func redactedLogFormatter(p gin.LogFormatterParams) string {
	path := p.Path
	if i := strings.IndexByte(path, '?'); i >= 0 {
		path = path[:i]
	}
	return fmt.Sprintf("[GIN] %v | %3d | %13v | %15s | %-7s %s %s\n",
		p.TimeStamp.Format("2006/01/02 - 15:04:05"),
		p.StatusCode,
		p.Latency,
		p.ClientIP,
		p.Method,
		path,
		p.ErrorMessage,
	)
}
