package googleauth

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"math/big"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const testClientID = "test-client.apps.googleusercontent.com"

func newTestJWKS(t *testing.T, key *rsa.PrivateKey, kid string) *httptest.Server {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "public, max-age=600")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"keys": []map[string]string{{
				"kid": kid,
				"kty": "RSA",
				"alg": "RS256",
				"n":   base64.RawURLEncoding.EncodeToString(key.N.Bytes()),
				"e":   base64.RawURLEncoding.EncodeToString(big.NewInt(int64(key.E)).Bytes()),
			}},
		})
	}))
	t.Cleanup(srv.Close)
	return srv
}

func signToken(t *testing.T, key *rsa.PrivateKey, kid string, claims jwt.MapClaims) string {
	t.Helper()
	tok := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	tok.Header["kid"] = kid
	s, err := tok.SignedString(key)
	if err != nil {
		t.Fatal(err)
	}
	return s
}

func validClaims() jwt.MapClaims {
	now := time.Now()
	return jwt.MapClaims{
		"iss":            "https://accounts.google.com",
		"aud":            testClientID,
		"sub":            "1234567890",
		"email":          "prof.connor@uts.edu.au",
		"email_verified": true,
		"name":           "Prof. Sarah Connor",
		"hd":             "uts.edu.au",
		"iat":            now.Unix(),
		"exp":            now.Add(time.Hour).Unix(),
	}
}

func TestVerifier(t *testing.T) {
	googleKey, _ := rsa.GenerateKey(rand.Reader, 2048)
	attackerKey, _ := rsa.GenerateKey(rand.Reader, 2048)
	srv := newTestJWKS(t, googleKey, "kid-1")
	v := NewVerifierWithJWKS(testClientID, srv.URL, srv.Client())
	ctx := context.Background()

	t.Run("valid token", func(t *testing.T) {
		id, err := v.Verify(ctx, signToken(t, googleKey, "kid-1", validClaims()))
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if id.Email != "prof.connor@uts.edu.au" || !id.EmailVerified || id.HostedDomain != "uts.edu.au" {
			t.Errorf("unexpected identity: %+v", id)
		}
	})

	reject := map[string]string{}

	reject["signed by attacker key"] = signToken(t, attackerKey, "kid-1", validClaims())

	c := validClaims()
	c["aud"] = "some-other-app"
	reject["wrong audience"] = signToken(t, googleKey, "kid-1", c)

	c = validClaims()
	c["iss"] = "https://evil.example.com"
	reject["wrong issuer"] = signToken(t, googleKey, "kid-1", c)

	c = validClaims()
	c["exp"] = time.Now().Add(-time.Hour).Unix()
	reject["expired"] = signToken(t, googleKey, "kid-1", c)

	reject["unknown kid"] = signToken(t, googleKey, "kid-unknown", validClaims())

	reject["unsigned forgery"] = "eyJhbGciOiJSUzI1NiJ9.eyJlbWFpbCI6ImFAYi5jIn0.mockSignatureBytes"

	for name, tok := range reject {
		if _, err := v.Verify(ctx, tok); err == nil {
			t.Errorf("%s: expected rejection", name)
		}
	}
}

func TestVerifierWithoutClientID(t *testing.T) {
	v := NewVerifierWithJWKS("", "http://127.0.0.1:0", http.DefaultClient)
	if _, err := v.Verify(context.Background(), "a.b.c"); err == nil {
		t.Fatal("expected error when GOOGLE_CLIENT_ID is not configured")
	}
}
