// Package googleauth verifies Google Identity Services ID tokens locally
// against Google's published JWKS signing keys (RS256).
package googleauth

import (
	"context"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"net/http"
	"regexp"
	"strconv"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jms-uts/backend/gateway/internal/domain"
)

const DefaultJWKSURL = "https://www.googleapis.com/oauth2/v3/certs"

var validIssuers = map[string]bool{
	"accounts.google.com":         true,
	"https://accounts.google.com": true,
}

type Verifier struct {
	clientID   string
	jwksURL    string
	httpClient *http.Client

	mu        sync.RWMutex
	keys      map[string]*rsa.PublicKey
	expiresAt time.Time
}

// NewVerifier returns a verifier that only accepts tokens issued for clientID.
func NewVerifier(clientID string) *Verifier {
	return NewVerifierWithJWKS(clientID, DefaultJWKSURL, &http.Client{Timeout: 10 * time.Second})
}

// NewVerifierWithJWKS allows overriding the JWKS endpoint (used by tests).
func NewVerifierWithJWKS(clientID, jwksURL string, httpClient *http.Client) *Verifier {
	return &Verifier{clientID: clientID, jwksURL: jwksURL, httpClient: httpClient}
}

type googleClaims struct {
	Email         string `json:"email"`
	EmailVerified any    `json:"email_verified"` // bool or "true"/"false"
	Name          string `json:"name"`
	HD            string `json:"hd"`
	jwt.RegisteredClaims
}

func (v *Verifier) Verify(ctx context.Context, rawToken string) (*domain.GoogleIdentity, error) {
	if v.clientID == "" {
		return nil, errors.New("google sign-in is not configured (GOOGLE_CLIENT_ID missing)")
	}

	claims := &googleClaims{}
	_, err := jwt.ParseWithClaims(rawToken, claims,
		func(t *jwt.Token) (interface{}, error) {
			kid, _ := t.Header["kid"].(string)
			if kid == "" {
				return nil, errors.New("token has no kid header")
			}
			return v.key(ctx, kid)
		},
		jwt.WithValidMethods([]string{"RS256"}),
		jwt.WithAudience(v.clientID),
		jwt.WithExpirationRequired(),
		jwt.WithIssuedAt(),
		jwt.WithLeeway(30*time.Second),
	)
	if err != nil {
		return nil, fmt.Errorf("invalid google id token: %w", err)
	}

	if !validIssuers[claims.Issuer] {
		return nil, fmt.Errorf("invalid google id token: unexpected issuer %q", claims.Issuer)
	}
	if claims.Email == "" {
		return nil, errors.New("invalid google id token: no email claim")
	}

	return &domain.GoogleIdentity{
		Subject:       claims.Subject,
		Email:         claims.Email,
		EmailVerified: parseBool(claims.EmailVerified),
		Name:          claims.Name,
		HostedDomain:  claims.HD,
	}, nil
}

func parseBool(v any) bool {
	switch b := v.(type) {
	case bool:
		return b
	case string:
		parsed, _ := strconv.ParseBool(b)
		return parsed
	}
	return false
}

// key returns the public key for kid, refreshing the JWKS cache when it is
// expired or the kid is unknown (Google rotates keys periodically).
func (v *Verifier) key(ctx context.Context, kid string) (*rsa.PublicKey, error) {
	v.mu.RLock()
	k, ok := v.keys[kid]
	fresh := time.Now().Before(v.expiresAt)
	v.mu.RUnlock()
	if ok && fresh {
		return k, nil
	}

	if err := v.refresh(ctx); err != nil {
		if ok { // serve stale key rather than failing hard on a transient network error
			return k, nil
		}
		return nil, err
	}

	v.mu.RLock()
	defer v.mu.RUnlock()
	if k, ok := v.keys[kid]; ok {
		return k, nil
	}
	return nil, fmt.Errorf("unknown signing key %q", kid)
}

var maxAgeRe = regexp.MustCompile(`max-age=(\d+)`)

func (v *Verifier) refresh(ctx context.Context) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, v.jwksURL, nil)
	if err != nil {
		return err
	}
	resp, err := v.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("fetch google jwks: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("fetch google jwks: status %d", resp.StatusCode)
	}

	var body struct {
		Keys []struct {
			Kid string `json:"kid"`
			Kty string `json:"kty"`
			N   string `json:"n"`
			E   string `json:"e"`
		} `json:"keys"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return fmt.Errorf("decode google jwks: %w", err)
	}

	keys := make(map[string]*rsa.PublicKey, len(body.Keys))
	for _, k := range body.Keys {
		if k.Kty != "RSA" {
			continue
		}
		nBytes, err1 := base64.RawURLEncoding.DecodeString(k.N)
		eBytes, err2 := base64.RawURLEncoding.DecodeString(k.E)
		if err1 != nil || err2 != nil {
			continue
		}
		keys[k.Kid] = &rsa.PublicKey{
			N: new(big.Int).SetBytes(nBytes),
			E: int(new(big.Int).SetBytes(eBytes).Int64()),
		}
	}
	if len(keys) == 0 {
		return errors.New("google jwks contained no usable keys")
	}

	ttl := time.Hour
	if m := maxAgeRe.FindStringSubmatch(resp.Header.Get("Cache-Control")); m != nil {
		if secs, err := strconv.Atoi(m[1]); err == nil && secs > 0 {
			ttl = time.Duration(secs) * time.Second
		}
	}

	v.mu.Lock()
	v.keys = keys
	v.expiresAt = time.Now().Add(ttl)
	v.mu.Unlock()
	return nil
}
