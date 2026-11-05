package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jms-uts/backend/gateway/pkg/response"
)

type clientBucket struct {
	tokens     float64
	lastRefill time.Time
}

type RateLimiter struct {
	mu           sync.Mutex
	clients      map[string]*clientBucket
	ratePerSec   float64
	burst        float64
	lastClean    time.Time
	cleanupEvery time.Duration
}

func NewRateLimiter(requestsPerMinute int, burst int) *RateLimiter {
	rate := float64(requestsPerMinute) / 60.0
	return &RateLimiter{
		clients:      make(map[string]*clientBucket),
		ratePerSec:   rate,
		burst:        float64(burst),
		lastClean:    time.Now(),
		cleanupEvery: 5 * time.Minute,
	}
}

func (rl *RateLimiter) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		path := c.Request.URL.Path

		// Skip health and readiness probes
		if path == "/healthz" || path == "/api/v1/health" || path == "/api/v1/system/readiness" {
			c.Next()
			return
		}

		ip := c.ClientIP()
		if ip == "" {
			ip = "unknown"
		}

		rl.mu.Lock()
		now := time.Now()

		// Periodic cleanup of idle IPs
		if now.Sub(rl.lastClean) > rl.cleanupEvery {
			for k, b := range rl.clients {
				if now.Sub(b.lastRefill) > 10*time.Minute {
					delete(rl.clients, k)
				}
			}
			rl.lastClean = now
		}

		b, exists := rl.clients[ip]
		if !exists {
			b = &clientBucket{
				tokens:     rl.burst,
				lastRefill: now,
			}
			rl.clients[ip] = b
		} else {
			// Refill tokens based on elapsed time
			elapsed := now.Sub(b.lastRefill).Seconds()
			b.tokens += elapsed * rl.ratePerSec
			if b.tokens > rl.burst {
				b.tokens = rl.burst
			}
			b.lastRefill = now
		}

		if b.tokens >= 1.0 {
			b.tokens -= 1.0
			rl.mu.Unlock()
			c.Next()
			return
		}

		rl.mu.Unlock()

		c.Header("Retry-After", "5")
		c.Header("X-RateLimit-Limit", "120")
		c.Header("X-RateLimit-Remaining", "0")
		c.Abort()
		response.Error(c, http.StatusTooManyRequests, "RATE_LIMIT_EXCEEDED", "Too many requests. Please slow down and try again.", "")
	}
}
