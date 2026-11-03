package handler

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jms-uts/backend/gateway/pkg/response"
)

type HealthHandler struct {
	appName string
}

func NewHealthHandler(appName string) *HealthHandler {
	return &HealthHandler{appName: appName}
}

func (h *HealthHandler) HealthCheck(c *gin.Context) {
	response.Success(c, http.StatusOK, gin.H{
		"service":   h.appName,
		"status":    "HEALTHY",
		"timestamp": time.Now().UTC(),
	})
}

