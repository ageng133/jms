package middleware

import (
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/jms-uts/backend/gateway/internal/domain"
	"github.com/jms-uts/backend/gateway/internal/usecase"
	"github.com/jms-uts/backend/gateway/pkg/response"
)

const (
	ContextUserIDKey = "user_id"
	ContextRoleKey   = "user_role"
	ContextEmailKey  = "user_email"
)

func AuthMiddleware(authUsecase usecase.AuthUsecase) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			response.Unauthorized(c, "Authorization header is required")
			c.Abort()
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			response.Unauthorized(c, "Invalid Authorization header format. Expected 'Bearer <token>'")
			c.Abort()
			return
		}

		claims, err := authUsecase.ValidateToken(parts[1])
		if err != nil {
			response.Unauthorized(c, "Invalid or expired token")
			c.Abort()
			return
		}

		c.Set(ContextUserIDKey, claims.UserID)
		c.Set(ContextRoleKey, claims.Role)
		c.Set(ContextEmailKey, claims.Email)
		c.Next()
	}
}

func RequireRoles(roles ...domain.Role) gin.HandlerFunc {
	return func(c *gin.Context) {
		roleVal, exists := c.Get(ContextRoleKey)
		if !exists {
			response.Forbidden(c, "Access denied: missing role")
			c.Abort()
			return
		}

		userRole := roleVal.(domain.Role)
		allowed := false
		for _, r := range roles {
			if userRole == r {
				allowed = true
				break
			}
		}

		if !allowed {
			response.Forbidden(c, "Access denied: insufficient permissions")
			c.Abort()
			return
		}

		c.Next()
	}
}

