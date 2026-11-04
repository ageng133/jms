package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jms-uts/backend/gateway/internal/delivery/http/middleware"
	"github.com/jms-uts/backend/gateway/internal/usecase"
	"github.com/jms-uts/backend/gateway/pkg/response"
)

type AuthHandler struct {
	authUsecase usecase.AuthUsecase
}

func NewAuthHandler(authUsecase usecase.AuthUsecase) *AuthHandler {
	return &AuthHandler{authUsecase: authUsecase}
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req usecase.RegisterDTO
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid input data", err.Error())
		return
	}

	user, err := h.authUsecase.Register(c.Request.Context(), req)
	if err != nil {
		response.BadRequest(c, err.Error(), "")
		return
	}

	response.Success(c, http.StatusCreated, user)
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid login credentials", err.Error())
		return
	}

	result, err := h.authUsecase.Login(c.Request.Context(), req.Email, req.Password)
	if err != nil {
		response.Unauthorized(c, err.Error())
		return
	}

	response.Success(c, http.StatusOK, result)
}

func (h *AuthHandler) GoogleLogin(c *gin.Context) {
	var req usecase.GoogleLoginDTO
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid Google sign-in payload", err.Error())
		return
	}

	result, err := h.authUsecase.LoginWithGoogle(c.Request.Context(), req)
	if err != nil {
		response.BadRequest(c, err.Error(), "")
		return
	}

	response.Success(c, http.StatusOK, result)
}

func (h *AuthHandler) GetCurrentUser(c *gin.Context) {
	userIDVal, exists := c.Get(middleware.ContextUserIDKey)
	if !exists {
		response.Unauthorized(c, "Not authenticated")
		return
	}

	userID := userIDVal.(uuid.UUID)
	user, err := h.authUsecase.GetUserByID(c.Request.Context(), userID)
	if err != nil {
		response.Unauthorized(c, "User account not found")
		return
	}

	response.Success(c, http.StatusOK, user)
}

