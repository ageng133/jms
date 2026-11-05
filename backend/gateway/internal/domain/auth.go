package domain

import "context"

// GoogleIdentity is the verified identity extracted from a Google ID token.
type GoogleIdentity struct {
	Subject       string
	Email         string
	EmailVerified bool
	Name          string
	HostedDomain  string
}

// GoogleTokenVerifier verifies a Google Identity Services ID token (signature,
// issuer, audience and expiry) and returns the identity it asserts.
type GoogleTokenVerifier interface {
	Verify(ctx context.Context, rawToken string) (*GoogleIdentity, error)
}
