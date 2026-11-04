package usecase_test

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/jms-uts/backend/gateway/config"
	"github.com/jms-uts/backend/gateway/internal/domain"
	"github.com/jms-uts/backend/gateway/internal/usecase"
)

type mockUserRepo struct {
	users map[string]*domain.User
}

func newMockUserRepo() *mockUserRepo {
	return &mockUserRepo{
		users: make(map[string]*domain.User),
	}
}

func (m *mockUserRepo) Create(ctx context.Context, user *domain.User) error {
	m.users[user.Email] = user
	return nil
}

func (m *mockUserRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
	for _, u := range m.users {
		if u.ID == id {
			return u, nil
		}
	}
	return nil, errors.New("user not found")
}

func (m *mockUserRepo) GetByEmail(ctx context.Context, email string) (*domain.User, error) {
	u, ok := m.users[email]
	if !ok {
		return nil, errors.New("user not found")
	}
	return u, nil
}

func (m *mockUserRepo) Update(ctx context.Context, user *domain.User) error {
	m.users[user.Email] = user
	return nil
}

func TestLoginWithGoogle_DirectPayload(t *testing.T) {
	repo := newMockUserRepo()
	jwtCfg := config.JWTConfig{
		Secret:      "test-secret-key-12345678901234567890",
		ExpiryHours: 24,
	}
	uc := usecase.NewAuthUsecase(repo, jwtCfg)

	dto := usecase.GoogleLoginDTO{
		Email:       "researcher@uts.edu.au",
		FullName:    "Dr. Test Researcher",
		Role:        domain.RoleAuthor,
		Affiliation: "UTS Faculty of Engineering & IT",
	}

	result, err := uc.LoginWithGoogle(context.Background(), dto)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result.Token == "" {
		t.Fatal("expected non-empty token")
	}

	if result.User.Email != "researcher@uts.edu.au" {
		t.Errorf("expected email researcher@uts.edu.au, got %s", result.User.Email)
	}

	// Validate the issued JWT token
	claims, err := uc.ValidateToken(result.Token)
	if err != nil {
		t.Fatalf("failed to validate generated token: %v", err)
	}
	if claims.Email != "researcher@uts.edu.au" {
		t.Errorf("expected claims email researcher@uts.edu.au, got %s", claims.Email)
	}
}

func TestLoginWithGoogle_WithIDToken(t *testing.T) {
	repo := newMockUserRepo()
	jwtCfg := config.JWTConfig{
		Secret:      "test-secret-key-12345678901234567890",
		ExpiryHours: 24,
	}
	uc := usecase.NewAuthUsecase(repo, jwtCfg)

	// Build a mock Google ID token payload
	claimsMap := map[string]interface{}{
		"email":          "prof.connor@uts.edu.au",
		"email_verified": true,
		"name":           "Prof. Sarah Connor",
		"sub":            "google-sub-id-998877",
		"hd":             "uts.edu.au",
	}
	payloadBytes, _ := json.Marshal(claimsMap)
	mockJWT := "eyJhbGciOiJSUzI1NiJ9." + base64.RawURLEncoding.EncodeToString(payloadBytes) + ".mockSignatureBytes"

	dto := usecase.GoogleLoginDTO{
		Credential: mockJWT,
		Role:       domain.RoleEditor,
	}

	result, err := uc.LoginWithGoogle(context.Background(), dto)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result.User.Email != "prof.connor@uts.edu.au" {
		t.Errorf("expected extracted email prof.connor@uts.edu.au, got %s", result.User.Email)
	}
	if result.User.FullName != "Prof. Sarah Connor" {
		t.Errorf("expected extracted name Prof. Sarah Connor, got %s", result.User.FullName)
	}
	if result.User.Role != domain.RoleEditor {
		t.Errorf("expected role EDITOR, got %s", result.User.Role)
	}
}
