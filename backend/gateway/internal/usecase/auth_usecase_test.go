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

// fakeVerifier stands in for the real Google JWKS verifier.
type fakeVerifier struct {
	identity *domain.GoogleIdentity
	err      error
}

func (f *fakeVerifier) Verify(ctx context.Context, rawToken string) (*domain.GoogleIdentity, error) {
	return f.identity, f.err
}

var testJWT = config.JWTConfig{
	Secret:      "test-secret-key-12345678901234567890",
	ExpiryHours: 24,
}

// forgedGoogleToken builds an unsigned token like the one the old code accepted.
func forgedGoogleToken(email string) string {
	payload, _ := json.Marshal(map[string]interface{}{
		"email":          email,
		"email_verified": true,
		"name":           "Mallory",
		"sub":            "forged",
	})
	return "eyJhbGciOiJSUzI1NiJ9." + base64.RawURLEncoding.EncodeToString(payload) + ".mockSignatureBytes"
}

func TestLoginWithGoogle_DemoPayloadWhenEnabled(t *testing.T) {
	uc := usecase.NewAuthUsecase(newMockUserRepo(), testJWT, usecase.WithDemoLogin(true))

	result, err := uc.LoginWithGoogle(context.Background(), usecase.GoogleLoginDTO{
		Email:       "Researcher@UTS.edu.au ",
		FullName:    "Dr. Test Researcher",
		Affiliation: "UTS Faculty of Engineering & IT",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.User.Email != "researcher@uts.edu.au" {
		t.Errorf("expected normalised email, got %s", result.User.Email)
	}
	if result.User.Role != domain.RoleAuthor {
		t.Errorf("expected AUTHOR, got %s", result.User.Role)
	}

	claims, err := uc.ValidateToken(result.Token)
	if err != nil {
		t.Fatalf("failed to validate generated token: %v", err)
	}
	if claims.Email != "researcher@uts.edu.au" {
		t.Errorf("expected claims email researcher@uts.edu.au, got %s", claims.Email)
	}
}

func TestLoginWithGoogle_DemoPayloadRejectedByDefault(t *testing.T) {
	uc := usecase.NewAuthUsecase(newMockUserRepo(), testJWT)

	_, err := uc.LoginWithGoogle(context.Background(), usecase.GoogleLoginDTO{Email: "anyone@uts.edu.au"})
	if err == nil {
		t.Fatal("expected email-only sign-in to be rejected when demo login is disabled")
	}
}

func TestLoginWithGoogle_RoleComesFromAllowlistOnly(t *testing.T) {
	uc := usecase.NewAuthUsecase(newMockUserRepo(), testJWT,
		usecase.WithDemoLogin(true),
		usecase.WithRoleAllowlists([]string{"chief@uts.edu.au"}, []string{"editor@uts.edu.au"}),
	)

	cases := map[string]domain.Role{
		"chief@uts.edu.au":  domain.RoleAdmin,
		"editor@uts.edu.au": domain.RoleEditor,
		"author@uts.edu.au": domain.RoleAuthor,
	}
	for email, want := range cases {
		res, err := uc.LoginWithGoogle(context.Background(), usecase.GoogleLoginDTO{Email: email})
		if err != nil {
			t.Fatalf("%s: unexpected error: %v", email, err)
		}
		if res.User.Role != want {
			t.Errorf("%s: expected %s, got %s", email, want, res.User.Role)
		}
	}
}

func TestLoginWithGoogle_ForgedTokenRejectedWithoutVerifier(t *testing.T) {
	uc := usecase.NewAuthUsecase(newMockUserRepo(), testJWT, usecase.WithDemoLogin(true))

	_, err := uc.LoginWithGoogle(context.Background(), usecase.GoogleLoginDTO{
		Credential: forgedGoogleToken("editor.google@uts.edu.au"),
	})
	if err == nil {
		t.Fatal("expected unverifiable Google token to be rejected")
	}
}

func TestLoginWithGoogle_VerifierErrorRejected(t *testing.T) {
	uc := usecase.NewAuthUsecase(newMockUserRepo(), testJWT,
		usecase.WithGoogleVerifier(&fakeVerifier{err: errors.New("bad signature")}),
	)

	_, err := uc.LoginWithGoogle(context.Background(), usecase.GoogleLoginDTO{
		Credential: forgedGoogleToken("victim@uts.edu.au"),
	})
	if err == nil {
		t.Fatal("expected token with invalid signature to be rejected")
	}
}

func TestLoginWithGoogle_VerifiedTokenUsesVerifiedIdentity(t *testing.T) {
	repo := newMockUserRepo()
	uc := usecase.NewAuthUsecase(repo, testJWT,
		usecase.WithGoogleVerifier(&fakeVerifier{identity: &domain.GoogleIdentity{
			Subject:       "google-sub-id-998877",
			Email:         "prof.connor@uts.edu.au",
			EmailVerified: true,
			Name:          "Prof. Sarah Connor",
			HostedDomain:  "uts.edu.au",
		}}),
	)

	// Client-supplied email must be ignored in favour of the verified one.
	res, err := uc.LoginWithGoogle(context.Background(), usecase.GoogleLoginDTO{
		Credential: "header.payload.signature",
		Email:      "someone-else@uts.edu.au",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if res.User.Email != "prof.connor@uts.edu.au" {
		t.Errorf("expected verified email, got %s", res.User.Email)
	}
	if res.User.FullName != "Prof. Sarah Connor" {
		t.Errorf("expected verified name, got %s", res.User.FullName)
	}
	if res.User.Role != domain.RoleAuthor {
		t.Errorf("expected AUTHOR (no self-assigned roles), got %s", res.User.Role)
	}
}

func TestLoginWithGoogle_UnverifiedEmailRejected(t *testing.T) {
	uc := usecase.NewAuthUsecase(newMockUserRepo(), testJWT,
		usecase.WithGoogleVerifier(&fakeVerifier{identity: &domain.GoogleIdentity{
			Email:         "x@example.com",
			EmailVerified: false,
		}}),
	)

	_, err := uc.LoginWithGoogle(context.Background(), usecase.GoogleLoginDTO{Credential: "a.b.c"})
	if err == nil {
		t.Fatal("expected unverified Google email to be rejected")
	}
}

func TestRegister_AlwaysAuthor(t *testing.T) {
	uc := usecase.NewAuthUsecase(newMockUserRepo(), testJWT)

	user, err := uc.Register(context.Background(), usecase.RegisterDTO{
		Email:    "new@uts.edu.au",
		Password: "password123",
		FullName: "New Person",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if user.Role != domain.RoleAuthor {
		t.Errorf("expected AUTHOR, got %s", user.Role)
	}
}
