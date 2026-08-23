package repositories

import (
	"context"
	"errors"
	"fmt"

	"go-gym-track/internal/apperror"
	"go-gym-track/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type UserRepository struct {
	db *pgxpool.Pool
}

func NewUserRepository(db *pgxpool.Pool) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) Create(ctx context.Context, email, displayName, passwordHash string) (models.User, error) {
	var user models.User
	err := r.db.QueryRow(ctx, `
		INSERT INTO public.users (email, display_name, password_hash)
		VALUES ($1, $2, $3)
		RETURNING id, email, display_name, password_hash, created_at, updated_at
	`, email, displayName, passwordHash).Scan(
		&user.ID,
		&user.Email,
		&user.DisplayName,
		&user.PasswordHash,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return models.User{}, fmt.Errorf("%w: email already registered", apperror.ErrConflict)
		}
		return models.User{}, fmt.Errorf("create user: %w", err)
	}
	return user, nil
}

func (r *UserRepository) GetByEmail(ctx context.Context, email string) (models.User, error) {
	return r.get(ctx, `
		SELECT id, email, display_name, password_hash, created_at, updated_at
		FROM public.users
		WHERE lower(email) = lower($1)
	`, email)
}

func (r *UserRepository) GetByID(ctx context.Context, id string) (models.User, error) {
	return r.get(ctx, `
		SELECT id, email, display_name, password_hash, created_at, updated_at
		FROM public.users
		WHERE id = $1
	`, id)
}

func (r *UserRepository) get(ctx context.Context, query string, value string) (models.User, error) {
	var user models.User
	err := r.db.QueryRow(ctx, query, value).Scan(
		&user.ID,
		&user.Email,
		&user.DisplayName,
		&user.PasswordHash,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.User{}, apperror.ErrNotFound
	}
	if err != nil {
		return models.User{}, fmt.Errorf("get user: %w", err)
	}
	return user, nil
}
