package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type TokenService struct {
	issuer   string
	audience string
	key      []byte
	ttl      time.Duration
}

func NewTokenService(issuer, audience, signingKey string, ttl time.Duration) *TokenService {
	return &TokenService{
		issuer:   issuer,
		audience: audience,
		key:      []byte(signingKey),
		ttl:      ttl,
	}
}

func (s *TokenService) IssueAccessToken(userID string) (string, time.Time, error) {
	now := time.Now().UTC()
	expiresAt := now.Add(s.ttl)
	jti, err := randomToken(16)
	if err != nil {
		return "", time.Time{}, err
	}

	claims := jwt.RegisteredClaims{
		Issuer:    s.issuer,
		Subject:   userID,
		Audience:  jwt.ClaimStrings{s.audience},
		ExpiresAt: jwt.NewNumericDate(expiresAt),
		NotBefore: jwt.NewNumericDate(now),
		IssuedAt:  jwt.NewNumericDate(now),
		ID:        jti,
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString(s.key)
	if err != nil {
		return "", time.Time{}, fmt.Errorf("sign access token: %w", err)
	}
	return signed, expiresAt, nil
}

func (s *TokenService) ParseAccessToken(value string) (string, error) {
	claims := &jwt.RegisteredClaims{}
	token, err := jwt.ParseWithClaims(
		value,
		claims,
		func(token *jwt.Token) (any, error) {
			if token.Method != jwt.SigningMethodHS256 {
				return nil, fmt.Errorf("unexpected signing method")
			}
			return s.key, nil
		},
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
		jwt.WithIssuer(s.issuer),
		jwt.WithAudience(s.audience),
		jwt.WithExpirationRequired(),
	)
	if err != nil || !token.Valid || claims.Subject == "" || claims.ID == "" {
		return "", fmt.Errorf("invalid access token")
	}
	return claims.Subject, nil
}

func NewRefreshToken() (string, []byte, error) {
	token, err := randomToken(32)
	if err != nil {
		return "", nil, err
	}
	return token, HashRefreshToken(token), nil
}

func HashRefreshToken(token string) []byte {
	hash := sha256.Sum256([]byte(token))
	return hash[:]
}

func randomToken(size int) (string, error) {
	value := make([]byte, size)
	if _, err := rand.Read(value); err != nil {
		return "", fmt.Errorf("generate secure token: %w", err)
	}
	return base64.RawURLEncoding.EncodeToString(value), nil
}
