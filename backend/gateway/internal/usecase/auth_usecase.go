package usecase

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jms-uts/backend/gateway/config"
	"github.com/jms-uts/backend/gateway/internal/domain"
	"golang.org/x/crypto/bcrypt"
)

type AuthUsecase interface {
	Register(ctx context.Context, req RegisterDTO) (*domain.User, error)
	Login(ctx context.Context, email, password string) (*AuthResult, error)
	LoginWithGoogle(ctx context.Context, dto GoogleLoginDTO) (*AuthResult, error)
	ValidateToken(tokenString string) (*Claims, error)
}

type GoogleLoginDTO struct {
	Email       string      `json:"email" binding:"required,email"`
	FullName    string      `json:"full_name" binding:"required"`
	GoogleID    string      `json:"google_id"`
	Role        domain.Role `json:"role"`
	Affiliation string      `json:"affiliation"`
}

type RegisterDTO struct {
	Email       string      `json:"email" binding:"required,email"`
	Password    string      `json:"password" binding:"required,min=8"`
	FullName    string      `json:"full_name" binding:"required"`
	Affiliation string      `json:"affiliation"`
	OrcidID     *string     `json:"orcid_id"`
	Role        domain.Role `json:"role" binding:"required,oneof=AUTHOR EDITOR REVIEWER ADMIN"`
}

type AuthResult struct {
	Token     string       `json:"token"`
	ExpiresAt time.Time    `json:"expires_at"`
	User      *domain.User `json:"user"`
}

type Claims struct {
	UserID uuid.UUID   `json:"user_id"`
	Email  string      `json:"email"`
	Role   domain.Role `json:"role"`
	jwt.RegisteredClaims
}

type authUsecase struct {
	userRepo domain.UserRepository
	jwtCfg   config.JWTConfig
}

func NewAuthUsecase(userRepo domain.UserRepository, jwtCfg config.JWTConfig) AuthUsecase {
	return &authUsecase{
		userRepo: userRepo,
		jwtCfg:   jwtCfg,
	}
}

func (a *authUsecase) Register(ctx context.Context, req RegisterDTO) (*domain.User, error) {
	existing, _ := a.userRepo.GetByEmail(ctx, req.Email)
	if existing != nil {
		return nil, errors.New("user with this email already exists")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	now := time.Now().UTC()
	user := &domain.User{
		ID:           uuid.New(),
		Email:        req.Email,
		PasswordHash: string(hashedPassword),
		FullName:     req.FullName,
		Affiliation:  req.Affiliation,
		OrcidID:      req.OrcidID,
		Role:         req.Role,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	if err := a.userRepo.Create(ctx, user); err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return user, nil
}

func (a *authUsecase) Login(ctx context.Context, email, password string) (*AuthResult, error) {
	user, err := a.userRepo.GetByEmail(ctx, email)
	if err != nil {
		return nil, errors.New("invalid email or password")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return nil, errors.New("invalid email or password")
	}

	expiresAt := time.Now().Add(time.Duration(a.jwtCfg.ExpiryHours) * time.Hour)
	claims := &Claims{
		UserID: user.ID,
		Email:  user.Email,
		Role:   user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   user.ID.String(),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(a.jwtCfg.Secret))
	if err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	return &AuthResult{
		Token:     tokenString,
		ExpiresAt: expiresAt,
		User:      user,
	}, nil
}

func (a *authUsecase) LoginWithGoogle(ctx context.Context, dto GoogleLoginDTO) (*AuthResult, error) {
	user, err := a.userRepo.GetByEmail(ctx, dto.Email)
	if err != nil {
		// User does not exist, provision new user
		targetRole := dto.Role
		if targetRole == "" {
			targetRole = domain.RoleAuthor
		}

		now := time.Now().UTC()
		user = &domain.User{
			ID:           uuid.New(),
			Email:        dto.Email,
			PasswordHash: "OAUTH2_GOOGLE_MANAGED",
			FullName:     dto.FullName,
			Affiliation:  dto.Affiliation,
			Role:         targetRole,
			CreatedAt:    now,
			UpdatedAt:    now,
		}

		if err := a.userRepo.Create(ctx, user); err != nil {
			return nil, fmt.Errorf("failed to provision Google user: %w", err)
		}
	}

	expiresAt := time.Now().Add(time.Duration(a.jwtCfg.ExpiryHours) * time.Hour)
	claims := &Claims{
		UserID: user.ID,
		Email:  user.Email,
		Role:   user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   user.ID.String(),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(a.jwtCfg.Secret))
	if err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	return &AuthResult{
		Token:     tokenString,
		ExpiresAt: expiresAt,
		User:      user,
	}, nil
}

func (a *authUsecase) ValidateToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(a.jwtCfg.Secret), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid token")
}

