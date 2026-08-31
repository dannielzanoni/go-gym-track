package services

import (
	"context"
	"fmt"
	"net/mail"
	"strings"
	"time"
	"unicode/utf8"

	"go-gym-track/internal/apperror"
	"go-gym-track/internal/auth"
	"go-gym-track/internal/models"
	"go-gym-track/internal/repositories"

	"github.com/google/uuid"
)

type AuthResult struct {
	User             models.User
	AccessToken      string
	AccessExpiresAt  time.Time
	RefreshToken     string
	RefreshExpiresAt time.Time
	Persistent       bool
}

type AuthService struct {
	users      *repositories.UserRepository
	sessions   *repositories.RefreshSessionRepository
	passwords  auth.PasswordHasher
	tokens     *auth.TokenService
	refreshTTL time.Duration
}

func NewAuthService(
	users *repositories.UserRepository,
	sessions *repositories.RefreshSessionRepository,
	tokens *auth.TokenService,
	refreshTTL time.Duration,
) *AuthService {
	return &AuthService{
		users:      users,
		sessions:   sessions,
		passwords:  auth.PasswordHasher{},
		tokens:     tokens,
		refreshTTL: refreshTTL,
	}
}

func (s *AuthService) Register(ctx context.Context, email, displayName, password string) (AuthResult, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	displayName = strings.TrimSpace(displayName)
	if err := validateRegistration(email, displayName, password); err != nil {
		return AuthResult{}, err
	}

	passwordHash, err := s.passwords.Hash(password)
	if err != nil {
		return AuthResult{}, err
	}
	user, err := s.users.Create(ctx, email, displayName, passwordHash)
	if err != nil {
		return AuthResult{}, err
	}
	return s.startSession(ctx, user, true)
}

func (s *AuthService) Login(ctx context.Context, email, password string, rememberMe bool) (AuthResult, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	user, err := s.users.GetByEmail(ctx, email)
	if err != nil {
		return AuthResult{}, apperror.ErrUnauthorized
	}
	valid, err := s.passwords.Verify(password, user.PasswordHash)
	if err != nil || !valid {
		return AuthResult{}, apperror.ErrUnauthorized
	}
	return s.startSession(ctx, user, rememberMe)
}

func (s *AuthService) Refresh(ctx context.Context, refreshToken string) (AuthResult, error) {
	if refreshToken == "" {
		return AuthResult{}, apperror.ErrUnauthorized
	}
	newToken, newHash, err := auth.NewRefreshToken()
	if err != nil {
		return AuthResult{}, err
	}
	now := time.Now().UTC()
	refreshExpiresAt := now.Add(s.refreshTTL)
	user, persistent, err := s.sessions.Rotate(
		ctx,
		auth.HashRefreshToken(refreshToken),
		uuid.NewString(),
		newHash,
		refreshExpiresAt,
	)
	if err != nil {
		return AuthResult{}, err
	}
	accessToken, accessExpiresAt, err := s.tokens.IssueAccessToken(user.ID)
	if err != nil {
		return AuthResult{}, err
	}
	return AuthResult{
		User:             user,
		AccessToken:      accessToken,
		AccessExpiresAt:  accessExpiresAt,
		RefreshToken:     newToken,
		RefreshExpiresAt: refreshExpiresAt,
		Persistent:       persistent,
	}, nil
}

func (s *AuthService) Logout(ctx context.Context, refreshToken string) error {
	if refreshToken == "" {
		return nil
	}
	return s.sessions.RevokeFamilyByToken(ctx, auth.HashRefreshToken(refreshToken))
}

func (s *AuthService) Me(ctx context.Context, userID string) (models.User, error) {
	return s.users.GetByID(ctx, userID)
}

func (s *AuthService) startSession(ctx context.Context, user models.User, persistent bool) (AuthResult, error) {
	refreshToken, refreshHash, err := auth.NewRefreshToken()
	if err != nil {
		return AuthResult{}, err
	}
	now := time.Now().UTC()
	refreshExpiresAt := now.Add(s.refreshTTL)
	sessionID := uuid.NewString()
	if err := s.sessions.Create(
		ctx,
		sessionID,
		uuid.NewString(),
		user.ID,
		refreshHash,
		refreshExpiresAt,
		persistent,
	); err != nil {
		return AuthResult{}, err
	}
	accessToken, accessExpiresAt, err := s.tokens.IssueAccessToken(user.ID)
	if err != nil {
		return AuthResult{}, err
	}
	return AuthResult{
		User:             user,
		AccessToken:      accessToken,
		AccessExpiresAt:  accessExpiresAt,
		RefreshToken:     refreshToken,
		RefreshExpiresAt: refreshExpiresAt,
		Persistent:       persistent,
	}, nil
}

func validateRegistration(email, displayName, password string) error {
	address, err := mail.ParseAddress(email)
	if err != nil || !strings.EqualFold(address.Address, email) || len(email) > 254 {
		return fmt.Errorf("%w: invalid email", apperror.ErrValidation)
	}
	if utf8.RuneCountInString(displayName) < 2 || utf8.RuneCountInString(displayName) > 80 {
		return fmt.Errorf("%w: display name must contain 2 to 80 characters", apperror.ErrValidation)
	}
	if len(password) < 8 || len(password) > 128 {
		return fmt.Errorf("%w: password must contain 8 to 128 characters", apperror.ErrValidation)
	}
	return nil
}
