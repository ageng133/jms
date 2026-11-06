package config

import (
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	App           AppConfig
	Postgres      PostgresConfig
	Redis         RedisConfig
	S3            S3Config
	Box           BoxConfig
	GoogleAI      GoogleAIConfig
	JWT           JWTConfig
	Auth          AuthConfig
	AuditEngine   AuditEngineConfig
	StorageDriver string // "box" or "minio" or "local"
	EnableRedis   bool
}

type AuditEngineConfig struct {
	// WorkerURL of the Python PyMuPDF worker (python -m app.server). Empty disables it.
	WorkerURL   string
	WorkerToken string
	// Timeout for a whole audit job.
	Timeout time.Duration
	// Reshape (scripts/remediate_pdf.py) runs after a successful audit when enabled.
	ReshapeEnabled bool
	ReshapePython  string // empty = auto-detect ai-worker .venv, then python3/python
	ReshapeScript  string // empty = auto-detect scripts/remediate_pdf.py
}

const defaultJWTSecret = "super-secret-jwt-key-for-development-change-in-production"

type AuthConfig struct {
	// GoogleClientID is the OAuth Web Client ID; ID tokens must have it as audience.
	GoogleClientID string
	// AllowDemoLogin enables unverified email-only sign-in (local demos only).
	AllowDemoLogin bool
	// AdminEmails / EditorEmails are provisioned with that role on first sign-in.
	AdminEmails  []string
	EditorEmails []string
}

type BoxConfig struct {
	ClientID         string
	ClientSecret     string
	DeveloperToken   string
	FolderID         string
	UploadURL        string
	BaseURL          string
	LocalFallbackDir string
}

type GoogleAIConfig struct {
	APIKey  string
	Model   string
	BaseURL string
}

type AppConfig struct {
	Env  string
	Port string
	Name string
	// PublicURL is the gateway origin reachable from the browser (used in upload URLs).
	PublicURL string
	// AllowedOrigins for CORS (frontend origins).
	AllowedOrigins []string
	// MaxUploadBytes caps a single uploaded file.
	MaxUploadBytes int64
}

func (a AppConfig) IsDevelopment() bool {
	return a.Env == "" || a.Env == "development" || a.Env == "dev" || a.Env == "local"
}

type PostgresConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	DBName   string
	SSLMode  string
}

func (p PostgresConfig) DSN() string {
	return fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		p.Host, p.Port, p.User, p.Password, p.DBName, p.SSLMode)
}

type RedisConfig struct {
	Host       string
	Port       string
	Password   string
	DB         int
	AuditQueue string
}

func (r RedisConfig) Addr() string {
	return fmt.Sprintf("%s:%s", r.Host, r.Port)
}

type S3Config struct {
	Endpoint   string
	Region     string
	BucketName string
	AccessKey  string
	SecretKey  string
	UseSSL     bool
}

type JWTConfig struct {
	Secret      string
	ExpiryHours int
}

func LoadConfig() (*Config, error) {
	// Load .env files if present (current, parent, grandparent dirs).
	// godotenv.Load never replaces a variable that is already set, so real
	// environment variables (docker-compose, shell, CI) win over .env, and
	// the nearest .env wins over the ones further up.
	for _, envFile := range []string{".env", "../.env", "../../.env"} {
		_ = godotenv.Load(envFile)
	}

	expiryHours, err := strconv.Atoi(getEnv("JWT_EXPIRY_HOURS", "72"))
	if err != nil {
		expiryHours = 72
	}

	redisDB, _ := strconv.Atoi(getEnv("REDIS_DB", "0"))
	s3UseSSL, _ := strconv.ParseBool(getEnv("S3_USE_SSL", "false"))
	enableRedis, _ := strconv.ParseBool(getEnv("ENABLE_REDIS", "false"))
	reshapeEnabled, _ := strconv.ParseBool(getEnv("RESHAPE_ENABLED", "true"))

	appEnv := getEnv("APP_ENV", "development")
	appPort := getEnv("APP_PORT", "8080")
	app := AppConfig{
		Env:            appEnv,
		Port:           appPort,
		Name:           getEnv("APP_NAME", "JMS Gateway API"),
		PublicURL:      getEnv("GATEWAY_PUBLIC_URL", "http://localhost:"+appPort),
		AllowedOrigins: splitList(getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")),
	}
	maxUploadMB, err := strconv.Atoi(getEnv("MAX_UPLOAD_MB", "35"))
	if err != nil || maxUploadMB <= 0 {
		maxUploadMB = 50
	}
	app.MaxUploadBytes = int64(maxUploadMB) << 20

	// Demo login + the demo editor account are only on by default in development.
	demoDefault, adminDefault := "false", ""
	if app.IsDevelopment() {
		demoDefault, adminDefault = "true", "editor.google@uts.edu.au"
	}
	allowDemo, _ := strconv.ParseBool(getEnv("AUTH_DEMO_LOGIN", demoDefault))

	auditTimeoutSec, err := strconv.Atoi(getEnv("AUDIT_TIMEOUT_SECONDS", "300"))
	if err != nil || auditTimeoutSec <= 0 {
		auditTimeoutSec = 300
	}

	jwtSecret := getEnv("JWT_SECRET", defaultJWTSecret)
	if !app.IsDevelopment() && (jwtSecret == defaultJWTSecret || len(jwtSecret) < 32) {
		return nil, errors.New("JWT_SECRET must be set to a random value of at least 32 characters outside development")
	}

	return &Config{
		App: app,
		Auth: AuthConfig{
			GoogleClientID: getEnv("GOOGLE_CLIENT_ID", ""),
			AllowDemoLogin: allowDemo,
			AdminEmails:    splitList(getEnv("ADMIN_EMAILS", adminDefault)),
			EditorEmails:   splitList(getEnv("EDITOR_EMAILS", "")),
		},
		AuditEngine: AuditEngineConfig{
			WorkerURL:   getEnv("AUDIT_ENGINE_URL", "http://127.0.0.1:8090"),
			WorkerToken: getEnv("AUDIT_ENGINE_TOKEN", ""),
			Timeout:     time.Duration(auditTimeoutSec) * time.Second,

			ReshapeEnabled: reshapeEnabled,
			ReshapePython:  getEnv("RESHAPE_PYTHON", ""),
			ReshapeScript:  getEnv("RESHAPE_SCRIPT", ""),
		},
		Postgres: PostgresConfig{
			Host:     getEnv("POSTGRES_HOST", "localhost"),
			Port:     getEnv("POSTGRES_PORT", "5432"),
			User:     getEnv("POSTGRES_USER", "jms_user"),
			Password: getEnv("POSTGRES_PASSWORD", "jms_password"),
			DBName:   getEnv("POSTGRES_DB", "jms_db"),
			SSLMode:  getEnv("POSTGRES_SSLMODE", "disable"),
		},
		Redis: RedisConfig{
			Host:       getEnv("REDIS_HOST", "localhost"),
			Port:       getEnv("REDIS_PORT", "6379"),
			Password:   getEnv("REDIS_PASSWORD", ""),
			DB:         redisDB,
			AuditQueue: getEnv("REDIS_AUDIT_QUEUE", "queue:ai_audit"),
		},
		S3: S3Config{
			Endpoint:   getEnv("S3_ENDPOINT", "localhost:9000"),
			Region:     getEnv("S3_REGION", "us-east-1"),
			BucketName: getEnv("S3_BUCKET_NAME", "jms-manuscripts"),
			AccessKey:  getEnv("S3_ACCESS_KEY", "minioadmin"),
			SecretKey:  getEnv("S3_SECRET_KEY", "minioadmin"),
			UseSSL:     s3UseSSL,
		},
		Box: BoxConfig{
			ClientID:         getEnv("BOX_CLIENT_ID", ""),
			ClientSecret:     getEnv("BOX_CLIENT_SECRET", ""),
			DeveloperToken:   getEnv("BOX_DEVELOPER_TOKEN", ""),
			FolderID:         getEnv("BOX_FOLDER_ID", "0"),
			UploadURL:        getEnv("BOX_UPLOAD_URL", "https://upload.box.com/api/2.0/files/content"),
			BaseURL:          getEnv("BOX_BASE_URL", "https://api.box.com/2.0"),
			LocalFallbackDir: getEnv("BOX_LOCAL_FALLBACK_DIR", "./storage/box"),
		},
		GoogleAI: GoogleAIConfig{
			APIKey:  getEnv("GEMINI_API_KEY", getEnv("GOOGLE_AI_APIKEY", getEnv("GOOGLE_API_KEY", ""))),
			Model:   getEnv("GEMINI_MODEL", "gemini-3.5-flash"),
			BaseURL: getEnv("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta"),
		},
		JWT: JWTConfig{
			Secret:      jwtSecret,
			ExpiryHours: expiryHours,
		},
		StorageDriver: getEnv("STORAGE_DRIVER", "box"),
		EnableRedis:   enableRedis,
	}, nil
}

func splitList(v string) []string {
	var out []string
	for _, item := range strings.Split(v, ",") {
		if item = strings.TrimSpace(item); item != "" {
			out = append(out, item)
		}
	}
	return out
}

func getEnv(key, defaultVal string) string {
	if val, ok := os.LookupEnv(key); ok && val != "" {
		return val
	}
	return defaultVal
}
