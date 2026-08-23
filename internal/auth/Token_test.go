package auth

import (
	"bytes"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const testSigningKey = "0123456789abcdef0123456789abcdef"

func TestTokenServiceIssueAndParse(t *testing.T) {
	service := NewTokenService("test-issuer", "test-audience", testSigningKey, time.Minute)
	token, expiresAt, err := service.IssueAccessToken("user-id")
	if err != nil {
		t.Fatalf("IssueAccessToken() error = %v", err)
	}
	if !expiresAt.After(time.Now()) {
		t.Fatalf("expiresAt = %v, expected a future instant", expiresAt)
	}

	userID, err := service.ParseAccessToken(token)
	if err != nil {
		t.Fatalf("ParseAccessToken() error = %v", err)
	}
	if userID != "user-id" {
		t.Fatalf("ParseAccessToken() = %q, want user-id", userID)
	}
}

func TestTokenServiceRejectsWrongAudienceAndAlgorithm(t *testing.T) {
	issuer := NewTokenService("test-issuer", "other-audience", testSigningKey, time.Minute)
	token, _, err := issuer.IssueAccessToken("user-id")
	if err != nil {
		t.Fatalf("IssueAccessToken() error = %v", err)
	}
	validator := NewTokenService("test-issuer", "test-audience", testSigningKey, time.Minute)
	if _, err := validator.ParseAccessToken(token); err == nil {
		t.Fatal("ParseAccessToken() accepted a token for another audience")
	}

	now := time.Now()
	claims := jwt.RegisteredClaims{
		Issuer: "test-issuer", Subject: "user-id", Audience: jwt.ClaimStrings{"test-audience"},
		ExpiresAt: jwt.NewNumericDate(now.Add(time.Minute)), NotBefore: jwt.NewNumericDate(now),
		IssuedAt: jwt.NewNumericDate(now), ID: "token-id",
	}
	wrongAlgorithm, err := jwt.NewWithClaims(jwt.SigningMethodHS512, claims).SignedString([]byte(testSigningKey))
	if err != nil {
		t.Fatalf("sign HS512 token: %v", err)
	}
	if _, err := validator.ParseAccessToken(wrongAlgorithm); err == nil {
		t.Fatal("ParseAccessToken() accepted an unexpected signing algorithm")
	}
}

func TestRefreshTokensAreRandomAndHashed(t *testing.T) {
	firstToken, firstHash, err := NewRefreshToken()
	if err != nil {
		t.Fatalf("NewRefreshToken() error = %v", err)
	}
	secondToken, secondHash, err := NewRefreshToken()
	if err != nil {
		t.Fatalf("NewRefreshToken() error = %v", err)
	}
	if firstToken == secondToken || bytes.Equal(firstHash, secondHash) {
		t.Fatal("NewRefreshToken() returned duplicate values")
	}
	if !bytes.Equal(firstHash, HashRefreshToken(firstToken)) {
		t.Fatal("HashRefreshToken() is not deterministic")
	}
}
