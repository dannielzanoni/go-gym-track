package repositories

import (
	"context"
	"errors"
	"fmt"
	"time"

	"go-gym-track/internal/apperror"
	"go-gym-track/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type RefreshSessionRepository struct {
	db *pgxpool.Pool
}

func NewRefreshSessionRepository(db *pgxpool.Pool) *RefreshSessionRepository {
	return &RefreshSessionRepository{db: db}
}

func (r *RefreshSessionRepository) Create(
	ctx context.Context,
	id, familyID, userID string,
	tokenHash []byte,
	expiresAt time.Time,
	persistent bool,
) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO public.refresh_sessions (id, family_id, user_id, token_hash, expires_at, persistent)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, id, familyID, userID, tokenHash, expiresAt, persistent)
	if err != nil {
		return fmt.Errorf("create refresh session: %w", err)
	}
	return nil
}

func (r *RefreshSessionRepository) Rotate(
	ctx context.Context,
	oldTokenHash []byte,
	newID string,
	newTokenHash []byte,
	newExpiresAt time.Time,
) (models.User, bool, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return models.User{}, false, fmt.Errorf("begin refresh rotation: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var sessionID string
	var familyID string
	var expiresAt time.Time
	var revokedAt *time.Time
	var persistent bool
	var user models.User
	err = tx.QueryRow(ctx, `
		SELECT rs.id, rs.family_id, rs.expires_at, rs.revoked_at, rs.persistent,
		       u.id, u.email, u.display_name, u.password_hash, u.created_at, u.updated_at
		FROM public.refresh_sessions rs
		JOIN public.users u ON u.id = rs.user_id
		WHERE rs.token_hash = $1
		FOR UPDATE OF rs
	`, oldTokenHash).Scan(
		&sessionID,
		&familyID,
		&expiresAt,
		&revokedAt,
		&persistent,
		&user.ID,
		&user.Email,
		&user.DisplayName,
		&user.PasswordHash,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.User{}, false, apperror.ErrUnauthorized
	}
	if err != nil {
		return models.User{}, false, fmt.Errorf("find refresh session: %w", err)
	}

	now := time.Now().UTC()
	if revokedAt != nil || !expiresAt.After(now) {
		if _, err := tx.Exec(ctx, `
			UPDATE public.refresh_sessions
			SET revoked_at = COALESCE(revoked_at, $2)
			WHERE family_id = $1
		`, familyID, now); err != nil {
			return models.User{}, false, fmt.Errorf("revoke refresh family: %w", err)
		}
		if err := tx.Commit(ctx); err != nil {
			return models.User{}, false, fmt.Errorf("commit refresh revocation: %w", err)
		}
		return models.User{}, false, apperror.ErrUnauthorized
	}

	if _, err := tx.Exec(ctx, `
		UPDATE public.refresh_sessions
		SET revoked_at = $2, last_used_at = $2
		WHERE id = $1
	`, sessionID, now); err != nil {
		return models.User{}, false, fmt.Errorf("revoke rotated refresh session: %w", err)
	}

	if _, err := tx.Exec(ctx, `
		INSERT INTO public.refresh_sessions (
			id, family_id, user_id, token_hash, rotated_from_id, expires_at, persistent
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, newID, familyID, user.ID, newTokenHash, sessionID, newExpiresAt, persistent); err != nil {
		return models.User{}, false, fmt.Errorf("create rotated refresh session: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return models.User{}, false, fmt.Errorf("commit refresh rotation: %w", err)
	}
	return user, persistent, nil
}

func (r *RefreshSessionRepository) RevokeFamilyByToken(ctx context.Context, tokenHash []byte) error {
	_, err := r.db.Exec(ctx, `
		UPDATE public.refresh_sessions
		SET revoked_at = COALESCE(revoked_at, now())
		WHERE family_id = (
			SELECT family_id
			FROM public.refresh_sessions
			WHERE token_hash = $1
		)
	`, tokenHash)
	if err != nil {
		return fmt.Errorf("revoke refresh family: %w", err)
	}
	return nil
}
