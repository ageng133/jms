package usecase

import (
	"context"
	"errors"
	"fmt"
	"strings"
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
	GetUserByID(ctx context.Context, id uuid.UUID) (*domain.User, error)
}

// GoogleLoginDTO is the body of POST /auth/google.
//
// Production path: `credential` (or `id_token`) carries a Google Identity
// Services ID token which is cryptographically verified.
// Demo path (only when demo login is enabled): plain `email`/`full_name`.
//
// The role is NEVER taken from the client; it is resolved server-side from
// the ADMIN_EMAILS / EDITOR_EMAILS allowlists (default AUTHOR).
type GoogleLoginDTO struct {
	Credential  string `json:"credential"`
	IDToken     string `json:"id_token"`
	Email       string `json:"email"`
	FullName    string `json:"full_name"`
	Affiliation string `json:"affiliation"`
}

// RegisterDTO: self-registration always creates an AUTHOR account.
type RegisterDTO struct {
	Email       string  `json:"email" binding:"required,email"`
	Password    string  `json:"password" binding:"required,min=8"`
	FullName    string  `json:"full_name" binding:"required"`
	Affiliation string  `json:"affiliation"`
	OrcidID     *string `json:"orcid_id"`
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
	userRepo       domain.UserRepository
	jwtCfg         config.JWTConfig
	googleVerifier domain.GoogleTokenVerifier
	allowDemoLogin bool
	adminEmails    map[string]bool
	editorEmails   map[string]bool
}

// AuthOption configures optional behaviour of the auth usecase.
type AuthOption func(*authUsecase)

// WithGoogleVerifier enables verified Google ID token sign-in.
func WithGoogleVerifier(v domain.GoogleTokenVerifier) AuthOption {
	return func(a *authUsecase) { a.googleVerifier = v }
}

// WithDemoLogin enables the unverified email-only sign-in used for local demos.
// Never enable this in production: anyone can sign in as any email.
func WithDemoLogin(enabled bool) AuthOption {
	return func(a *authUsecase) { a.allowDemoLogin = enabled }
}

// WithRoleAllowlists sets which emails are provisioned as ADMIN / EDITOR.
func WithRoleAllowlists(adminEmails, editorEmails []string) AuthOption {
	return func(a *authUsecase) {
		a.adminEmails = toEmailSet(adminEmails)
		a.editorEmails = toEmailSet(editorEmails)
	}
}

func NewAuthUsecase(userRepo domain.UserRepository, jwtCfg config.JWTConfig, opts ...AuthOption) AuthUsecase {
	a := &authUsecase{
		userRepo:     userRepo,
		jwtCfg:       jwtCfg,
		adminEmails:  map[string]bool{},
		editorEmails: map[string]bool{},
	}
	for _, opt := range opts {
		opt(a)
	}
	return a
}

func toEmailSet(emails []string) map[string]bool {
	set := make(map[string]bool, len(emails))
	for _, e := range emails {
		if e = normalizeEmail(e); e != "" {
			set[e] = true
		}
	}
	return set
}

func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

// resolveRole decides the role for a newly provisioned account.
func (a *authUsecase) resolveRole(email string) domain.Role {
	switch {
	case a.adminEmails[email]:
		return domain.RoleAdmin
	case a.editorEmails[email]:
		return domain.RoleEditor
	default:
		return domain.RoleAuthor
	}
}

func (a *authUsecase) Register(ctx context.Context, req RegisterDTO) (*domain.User, error) {
	req.Email = normalizeEmail(req.Email)
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
		Role:         domain.RoleAuthor, // privileged roles are never self-assigned
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	if err := a.userRepo.Create(ctx, user); err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return user, nil
}

func (a *authUsecase) Login(ctx context.Context, email, password string) (*AuthResult, error) {
	user, err := a.userRepo.GetByEmail(ctx, normalizeEmail(email))
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
	rawToken := dto.Credential
	if rawToken == "" {
		rawToken = dto.IDToken
	}

	var email, fullName, affiliation string

	if rawToken != "" {
		// Verified path: signature, audience, issuer and expiry are checked.
		if a.googleVerifier == nil {
			return nil, errors.New("google sign-in is not configured on this server")
		}
		identity, err := a.googleVerifier.Verify(ctx, rawToken)
		if err != nil {
			return nil, fmt.Errorf("google sign-in failed: %w", err)
		}
		if !identity.EmailVerified {
			return nil, errors.New("google account email is not verified")
		}
		email = identity.Email
		fullName = identity.Name
		if identity.HostedDomain != "" {
			affiliation = fmt.Sprintf("Google Workspace (%s)", identity.HostedDomain)
		}
	} else {
		// Demo path: unverified email-only sign-in for local testing.
		if !a.allowDemoLogin {
			return nil, errors.New("email-only sign-in is disabled; please use the Google sign-in button")
		}
		email = dto.Email
		fullName = dto.FullName
		affiliation = dto.Affiliation
	}

	email = normalizeEmail(email)
	if email == "" {
		return nil, errors.New("email is required for Google SSO authentication")
	}
	if strings.TrimSpace(fullName) == "" {
		fullName = strings.Split(email, "@")[0]
	}
	if strings.TrimSpace(affiliation) == "" {
		affiliation = "UTS Faculty of Engineering & IT"
	}

	user, err := a.userRepo.GetByEmail(ctx, email)
	if err != nil {
		// First sign-in: provision the account. The role comes from the
		// server-side allowlist only, never from the request body.
		now := time.Now().UTC()
		user = &domain.User{
			ID:           uuid.New(),
			Email:        email,
			PasswordHash: "OAUTH2_GOOGLE_MANAGED",
			FullName:     fullName,
			Affiliation:  affiliation,
			Role:         a.resolveRole(email),
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

func (a *authUsecase) GetUserByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
	return a.userRepo.GetByID(ctx, id)
}
