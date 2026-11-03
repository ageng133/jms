package config

import (
	"fmt"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	App      AppConfig
	Postgres PostgresConfig
	Redis    RedisConfig
	S3       S3Config
	JWT      JWTConfig
}

type AppConfig struct {
	Env  string
	Port string
	Name string
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
	// Try loading from .env if present (ignore error if not present in prod)
	_ = godotenv.Load(".env", "../.env", "../../.env")

	expiryHours, err := strconv.Atoi(getEnv("JWT_EXPIRY_HOURS", "72"))
	if err != nil {
		expiryHours = 72
	}

	redisDB, _ := strconv.Atoi(getEnv("REDIS_DB", "0"))
	s3UseSSL, _ := strconv.ParseBool(getEnv("S3_USE_SSL", "false"))

	return &Config{
		App: AppConfig{
			Env:  getEnv("APP_ENV", "development"),
			Port: getEnv("APP_PORT", "8080"),
			Name: getEnv("APP_NAME", "JMS Gateway API"),
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
		JWT: JWTConfig{
			Secret:      getEnv("JWT_SECRET", "super-secret-jwt-key-for-development-change-in-production"),
			ExpiryHours: expiryHours,
		},
	}, nil
}

func getEnv(key, defaultVal string) string {
	if val, ok := os.LookupEnv(key); ok && val != "" {
		return val
	}
	return defaultVal
}

