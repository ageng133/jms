package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
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

