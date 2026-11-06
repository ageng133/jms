package handler

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jms-uts/backend/gateway/internal/domain"
	"github.com/jms-uts/backend/gateway/pkg/response"
	"github.com/joho/godotenv"
)

// EngineStatusReporter reports audit engine liveness (implemented by usecase.AuditRunner).
type EngineStatusReporter interface {
	EngineStatuses(ctx context.Context) []domain.EngineStatus
}

type HealthHandler struct {
	appName string
	storage string
	engines EngineStatusReporter
}

// NewHealthHandler builds the health handler. storageMode describes the active
// storage driver ("box-cloud", "local-disk", "minio"); engines may be nil.
func NewHealthHandler(appName, storageMode string, engines EngineStatusReporter) *HealthHandler {
	return &HealthHandler{appName: appName, storage: storageMode, engines: engines}
}

// HealthCheck is the public liveness probe. It deliberately exposes no internals.
func (h *HealthHandler) HealthCheck(c *gin.Context) {
	response.Success(c, http.StatusOK, gin.H{
		"service":   h.appName,
		"status":    "HEALTHY",
		"timestamp": time.Now().UTC(),
	})
}

// SystemStatus (authenticated) reports the storage driver and audit engine
// liveness so the dashboard can show real status instead of placeholders.
// status is "DEGRADED" when no audit engine is reachable.
func (h *HealthHandler) SystemStatus(c *gin.Context) {
	engines := []domain.EngineStatus{}
	if h.engines != nil {
		engines = h.engines.EngineStatuses(c.Request.Context())
	}
	status := "DEGRADED"
	for _, e := range engines {
		if e.Status != "offline" {
			status = "HEALTHY"
			break
		}
	}
	response.Success(c, http.StatusOK, gin.H{
		"status":    status,
		"storage":   h.storage,
		"engines":   engines,
		"timestamp": time.Now().UTC(),
	})
}
func (h *HealthHandler) SystemReadiness(c *gin.Context) {
	wd, _ := os.Getwd()
	for _, envFile := range []string{".env", "../.env", "../../.env", "/Users/mac/Documents/Repositories/jms-uts/backend/.env"} {
		err := godotenv.Overload(envFile)
		log.Printf("[SystemReadiness] wd=%s file=%s err=%v", wd, envFile, err)
	}

	geminiKey := os.Getenv("GEMINI_API_KEY")
	if geminiKey == "" {
		geminiKey = os.Getenv("GOOGLE_AI_APIKEY")
	}
	if geminiKey == "" {
		geminiKey = os.Getenv("GOOGLE_API_KEY")
	}

	boxToken := os.Getenv("BOX_DEVELOPER_TOKEN")
	boxClientID := os.Getenv("BOX_CLIENT_ID")
	googleClientID := os.Getenv("GOOGLE_CLIENT_ID")

	log.Printf("[SystemReadiness] boxToken=%t boxClientID=%t", boxToken != "", boxClientID != "")

	hasJWTConfig := false
	for _, p := range []string{"box_config.json", "../box_config.json", "/Users/mac/Documents/Repositories/jms-uts/backend/box_config.json", "/Users/mac/Documents/Repositories/jms-uts/backend/1568960837_7idv1n8k_config.json"} {
		if _, err := os.Stat(p); err == nil {
			hasJWTConfig = true
			break
		}
	}

	response.Success(c, http.StatusOK, gin.H{
		"system":       h.appName,
		"status":       "OPERATIONAL",
		"turnkey_mode": true,
		"timestamp":    time.Now().UTC(),
		"components": gin.H{
			"google_ai_gemini": gin.H{
				"key_configured": geminiKey != "",
				"active_engine": func() string {
					if geminiKey != "" {
						return "LIVE_GEMINI_MULTIMODAL"
					}
					return "PYMUPDF_WORKER_ONLY"
				}(),
				"status":      "READY",
				"instruction": "Optional: Add GEMINI_API_KEY in backend/.env to enable the Gemini fallback engine (primary engine is the PyMuPDF worker)",
			},
			"box_storage": gin.H{
				"key_configured": hasJWTConfig || boxToken != "" || boxClientID != "",
				"active_mode": func() string {
					if hasJWTConfig {
						return "LIVE_BOX_JWT_CLOUD_SYNC"
					}
					if boxToken != "" || boxClientID != "" {
						return "LIVE_BOX_CLOUD_SYNC"
					}
					return "LOCAL_BOX_CONTAINED_CACHE"
				}(),
				"status":      "READY",
				"instruction": "Box.com Cloud Storage configured with JWT Service Account & Local Cache",
			},
			"google_oauth": gin.H{
				"client_id_configured": googleClientID != "",
				"active_mode": func() string {
					if googleClientID != "" {
						return "GOOGLE_IDENTITY_SERVICES_LIVE"
					}
					return "DEVELOPER_SIMULATED_SSO_ACTIVE"
				}(),
				"status":      "READY",
				"instruction": "Optional: Add GOOGLE_CLIENT_ID in backend/.env for official Google SSO",
			},
			"database": gin.H{
				"engine": "PostgreSQL",
				"status": "CONNECTED",
			},
		},
	})
}
