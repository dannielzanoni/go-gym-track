package config

import (
	"fmt"
	"net"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	DatabaseURL     string
	HTTPAddr        string
	AppEnv          string
	AllowedOrigins  []string
	JWTIssuer       string
	JWTAudience     string
	JWTSigningKey   string
	AccessTokenTTL  time.Duration
	RefreshTokenTTL time.Duration
	CookieSecure    bool
	RunMigrations   bool
}

func Load() (Config, error) {
	databaseURL, err := DatabaseURL()
	if err != nil {
		return Config{}, err
	}
	httpAddr, err := httpAddress()
	if err != nil {
		return Config{}, err
	}

	config := Config{
		DatabaseURL:     databaseURL,
		HTTPAddr:        httpAddr,
		AppEnv:          envOrDefault("APP_ENV", "development"),
		AllowedOrigins:  splitCSV(envOrDefault("CORS_ALLOWED_ORIGINS", "http://localhost:5173")),
		JWTIssuer:       envOrDefault("JWT_ISSUER", "go-gym-track"),
		JWTAudience:     envOrDefault("JWT_AUDIENCE", "go-gym-track-api"),
		JWTSigningKey:   os.Getenv("JWT_SIGNING_KEY"),
		AccessTokenTTL:  15 * time.Minute,
		RefreshTokenTTL: 30 * 24 * time.Hour,
	}

	if value := os.Getenv("ACCESS_TOKEN_TTL"); value != "" {
		config.AccessTokenTTL, err = time.ParseDuration(value)
		if err != nil {
			return Config{}, fmt.Errorf("invalid ACCESS_TOKEN_TTL: %w", err)
		}
	}
	if value := os.Getenv("REFRESH_TOKEN_TTL"); value != "" {
		config.RefreshTokenTTL, err = time.ParseDuration(value)
		if err != nil {
			return Config{}, fmt.Errorf("invalid REFRESH_TOKEN_TTL: %w", err)
		}
	}
	if config.CookieSecure, err = boolEnv("COOKIE_SECURE", false); err != nil {
		return Config{}, err
	}
	if config.RunMigrations, err = boolEnv("RUN_MIGRATIONS", false); err != nil {
		return Config{}, err
	}

	if len(config.JWTSigningKey) < 32 {
		return Config{}, fmt.Errorf("JWT_SIGNING_KEY must contain at least 32 characters")
	}
	if config.AccessTokenTTL <= 0 {
		return Config{}, fmt.Errorf("ACCESS_TOKEN_TTL must be greater than zero")
	}
	if config.RefreshTokenTTL <= 0 {
		return Config{}, fmt.Errorf("REFRESH_TOKEN_TTL must be greater than zero")
	}
	if config.AppEnv == "production" && !config.CookieSecure {
		return Config{}, fmt.Errorf("COOKIE_SECURE must be true in production")
	}

	return config, nil
}

func httpAddress() (string, error) {
	if value := strings.TrimSpace(os.Getenv("HTTP_ADDR")); value != "" {
		return value, nil
	}
	port := strings.TrimSpace(os.Getenv("PORT"))
	if port == "" {
		return "localhost:8080", nil
	}
	parsed, err := strconv.Atoi(port)
	if err != nil || parsed < 1 || parsed > 65535 {
		return "", fmt.Errorf("PORT must be a number between 1 and 65535")
	}
	return net.JoinHostPort("0.0.0.0", port), nil
}

func DatabaseURL() (string, error) {
	value := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	if value == "" {
		return "", fmt.Errorf("DATABASE_URL is required")
	}
	return value, nil
}

func envOrDefault(name, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(name)); value != "" {
		return value
	}
	return fallback
}

func boolEnv(name string, fallback bool) (bool, error) {
	value := strings.TrimSpace(os.Getenv(name))
	if value == "" {
		return fallback, nil
	}
	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return false, fmt.Errorf("invalid %s: %w", name, err)
	}
	return parsed, nil
}

func splitCSV(value string) []string {
	parts := strings.Split(value, ",")
	result := make([]string, 0, len(parts))
	for _, part := range parts {
		if trimmed := strings.TrimSpace(part); trimmed != "" {
			result = append(result, trimmed)
		}
	}
	return result
}
