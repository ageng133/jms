package http

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jms-uts/backend/gateway/config"
	"github.com/jms-uts/backend/gateway/internal/delivery/http/handler"
	"github.com/jms-uts/backend/gateway/internal/domain"
	"github.com/jms-uts/backend/gateway/internal/usecase"
)

var testJWT = config.JWTConfig{Secret: "router-test-secret-0123456789abcdef", ExpiryHours: 1}

func tokenFor(t *testing.T, role domain.Role) string {
	t.Helper()
	claims := &usecase.Claims{
		UserID: uuid.New(),
		Email:  "user@uts.edu.au",
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
		},
	}
	s, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(testJWT.Secret))
	if err != nil {
		t.Fatal(err)
	}
	return s
}

// These requests must be rejected by middleware before any handler runs,
// so the handlers can be built with nil dependencies.
func TestRouterGuards(t *testing.T) {
	gin.SetMode(gin.TestMode)
	authUC := usecase.NewAuthUsecase(nil, testJWT)
	r := NewRouter(
		handler.NewHealthHandler("test", "local-disk", nil),
		handler.NewAuthHandler(authUC),
		handler.NewSubmissionHandler(nil, nil, 0, nil),
		authUC,
		nil,
	)

	author := tokenFor(t, domain.RoleAuthor)
	id := uuid.New().String()

	cases := []struct {
		name, method, path, token string
		want                      int
	}{
		{"anonymous upload", "PUT", "/api/v1/files/upload?key=raw/x/y.pdf", "", http.StatusUnauthorized},
		{"anonymous download", "GET", "/api/v1/files/download?key=raw/x/y.pdf", "", http.StatusUnauthorized},
		{"anonymous audit", "GET", "/api/v1/audits/" + id, "", http.StatusUnauthorized},
		{"anonymous manuscripts", "GET", "/api/v1/manuscripts", "", http.StatusUnauthorized},
		{"author cannot change status", "PATCH", "/api/v1/manuscripts/" + id + "/status", "Bearer " + author, http.StatusForbidden},
		{"query token not accepted on api", "GET", "/api/v1/manuscripts?token=" + author, "", http.StatusUnauthorized},
		{"tampered token", "GET", "/api/v1/auth/me", "Bearer " + author + "x", http.StatusUnauthorized},
	}

	for _, tc := range cases {
		req := httptest.NewRequest(tc.method, tc.path, strings.NewReader(`{"status":"ACCEPTED"}`))
		req.Header.Set("Content-Type", "application/json")
		if tc.token != "" {
			req.Header.Set("Authorization", tc.token)
		}
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		if w.Code != tc.want {
			t.Errorf("%s: expected %d, got %d (%s)", tc.name, tc.want, w.Code, w.Body.String())
		}
	}
}

func TestRedactedLogFormatterDropsQuery(t *testing.T) {
	line := redactedLogFormatter(gin.LogFormatterParams{
		Path:      "/api/v1/files/download?key=a&token=SECRET",
		Method:    "GET",
		TimeStamp: time.Now(),
	})
	if strings.Contains(line, "SECRET") {
		t.Errorf("token leaked into access log: %s", line)
	}
}
