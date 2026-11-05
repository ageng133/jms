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

// AuthMiddleware requires an `Authorization: Bearer <jwt>` header.
func AuthMiddleware(authUsecase usecase.AuthUsecase) gin.HandlerFunc {
	return authMiddleware(authUsecase, false)
}

// AuthMiddlewareAllowQueryToken additionally accepts `?token=<jwt>`.
// Only use it for GET endpoints that are opened by the browser directly
// (e.g. an <iframe> or download link) where headers cannot be set.
func AuthMiddlewareAllowQueryToken(authUsecase usecase.AuthUsecase) gin.HandlerFunc {
	return authMiddleware(authUsecase, true)
}

func authMiddleware(authUsecase usecase.AuthUsecase, allowQueryToken bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Pass preflight OPTIONS requests without auth check
		if c.Request.Method == "OPTIONS" {
			c.Next()
			return
		}

		authHeader := c.GetHeader("Authorization")
		var tokenString string

		if authHeader != "" {
			parts := strings.Split(authHeader, " ")
			if len(parts) == 2 && strings.EqualFold(parts[0], "Bearer") {
				tokenString = parts[1]
			} else {
				response.Unauthorized(c, "Invalid Authorization header format. Expected 'Bearer <token>'")
				c.Abort()
				return
			}
		} else if allowQueryToken {
			tokenString = c.Query("token")
		}

		if tokenString == "" {
			response.Unauthorized(c, "Authorization header is required. Please sign in or pass 'Authorization: Bearer <jwt>'")
			c.Abort()
			return
		}

		claims, err := authUsecase.ValidateToken(tokenString)
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
		userRole, ok := roleVal.(domain.Role)
		if !exists || !ok {
			response.Forbidden(c, "Access denied: missing role")
			c.Abort()
			return
		}

		for _, r := range roles {
			if userRole == r {
				c.Next()
				return
			}
		}

		response.Forbidden(c, "Access denied: insufficient permissions")
		c.Abort()
	}
}
