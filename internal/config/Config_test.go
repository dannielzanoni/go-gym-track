package config

import (
	"strings"
	"testing"
	"time"
)

func setRequiredEnvironment(t *testing.T) {
	t.Helper()
	t.Setenv("DATABASE_URL", "postgresql://user:password@localhost:5432/gymtrack")
	t.Setenv("JWT_SIGNING_KEY", "0123456789abcdef0123456789abcdef")
	t.Setenv("HTTP_ADDR", "")
	t.Setenv("PORT", "")
	t.Setenv("APP_ENV", "")
	t.Setenv("CORS_ALLOWED_ORIGINS", "")
	t.Setenv("JWT_ISSUER", "")
	t.Setenv("JWT_AUDIENCE", "")
	t.Setenv("ACCESS_TOKEN_TTL", "")
	t.Setenv("REFRESH_TOKEN_TTL", "")
	t.Setenv("COOKIE_SECURE", "")
	t.Setenv("RUN_MIGRATIONS", "")
}

func TestLoadUsesRenderPort(t *testing.T) {
	setRequiredEnvironment(t)
	t.Setenv("PORT", "10000")

	got, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	if got.HTTPAddr != "0.0.0.0:10000" {
		t.Fatalf("HTTPAddr = %q, want 0.0.0.0:10000", got.HTTPAddr)
	}
}

func TestLoadDefaults(t *testing.T) {
	setRequiredEnvironment(t)

	got, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	if got.HTTPAddr != "localhost:8080" || got.AccessTokenTTL != 15*time.Minute || got.RefreshTokenTTL != 30*24*time.Hour {
		t.Fatalf("Load() returned unexpected defaults: %+v", got)
	}
	if len(got.AllowedOrigins) != 1 || got.AllowedOrigins[0] != "http://localhost:5173" {
		t.Fatalf("AllowedOrigins = %v", got.AllowedOrigins)
	}
}

func TestLoadRejectsInvalidSecurityConfiguration(t *testing.T) {
	tests := []struct {
		name    string
		prepare func(*testing.T)
		want    string
	}{
		{name: "short signing key", prepare: func(t *testing.T) { t.Setenv("JWT_SIGNING_KEY", "short") }, want: "JWT_SIGNING_KEY"},
		{name: "non-positive access ttl", prepare: func(t *testing.T) { t.Setenv("ACCESS_TOKEN_TTL", "0s") }, want: "ACCESS_TOKEN_TTL"},
		{name: "insecure production cookie", prepare: func(t *testing.T) { t.Setenv("APP_ENV", "production") }, want: "COOKIE_SECURE"},
		{name: "invalid render port", prepare: func(t *testing.T) { t.Setenv("PORT", "invalid") }, want: "PORT"},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			setRequiredEnvironment(t)
			test.prepare(t)
			_, err := Load()
			if err == nil || !strings.Contains(err.Error(), test.want) {
				t.Fatalf("Load() error = %v, want error containing %q", err, test.want)
			}
		})
	}
}
