package repositories

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"go-gym-track/internal/apperror"
	"go-gym-track/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type MuscleRepository struct {
	db *pgxpool.Pool
}

func NewMuscleRepository(db *pgxpool.Pool) *MuscleRepository {
	return &MuscleRepository{db: db}
}

func (r *MuscleRepository) GetAll(ctx context.Context, userID string) ([]models.Muscle, error) {
	rows, err := r.db.Query(ctx, `
		SELECT m.id, m.name, m.position, MAX(ws.completed_at) AS last_workout_at
		FROM public.muscles m
		LEFT JOIN public.workout_sessions ws
		  ON ws.muscle_id = m.id AND ws.user_id = m.user_id AND ws.status = 'completed'
		WHERE m.user_id = $1
		GROUP BY m.id, m.name, m.position
		ORDER BY m.position
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("query muscles: %w", err)
	}
	defer rows.Close()

	muscles := make([]models.Muscle, 0)
	for rows.Next() {
		muscle := models.Muscle{Exercises: make([]models.Exercise, 0)}
		if err := rows.Scan(&muscle.ID, &muscle.Name, &muscle.Position, &muscle.LastWorkoutAt); err != nil {
			return nil, fmt.Errorf("scan muscle: %w", err)
		}
		muscles = append(muscles, muscle)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate muscles: %w", err)
	}
	return muscles, nil
}

func (r *MuscleRepository) Create(ctx context.Context, userID, name string) (models.Muscle, error) {
	name = strings.TrimSpace(name)
	if name == "" || len(name) > 100 {
		return models.Muscle{}, fmt.Errorf("%w: invalid muscle name", apperror.ErrValidation)
	}

	muscle := models.Muscle{Exercises: make([]models.Exercise, 0)}
	err := r.db.QueryRow(ctx, `
		INSERT INTO public.muscles (user_id, name, position)
		SELECT $1, $2, COALESCE(MAX(position) + 1, 0)
		FROM public.muscles
		WHERE user_id = $1
		RETURNING id, name, position
	`, userID, name).Scan(&muscle.ID, &muscle.Name, &muscle.Position)
	if err != nil {
		return models.Muscle{}, fmt.Errorf("create muscle: %w", err)
	}
	return muscle, nil
}

func (r *MuscleRepository) Update(ctx context.Context, userID, id, name string) (models.Muscle, error) {
	name = strings.TrimSpace(name)
	if name == "" || len(name) > 100 {
		return models.Muscle{}, fmt.Errorf("%w: invalid muscle name", apperror.ErrValidation)
	}

	muscle := models.Muscle{Exercises: make([]models.Exercise, 0)}
	err := r.db.QueryRow(ctx, `
		UPDATE public.muscles
		SET name = $3, updated_at = now()
		WHERE id = $1 AND user_id = $2
		RETURNING id, name, position
	`, id, userID, name).Scan(&muscle.ID, &muscle.Name, &muscle.Position)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.Muscle{}, apperror.ErrNotFound
	}
	if err != nil {
		return models.Muscle{}, fmt.Errorf("update muscle: %w", err)
	}
	return muscle, nil
}

func (r *MuscleRepository) Delete(ctx context.Context, userID, id string) error {
	result, err := r.db.Exec(ctx, `DELETE FROM public.muscles WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		return fmt.Errorf("delete muscle: %w", err)
	}
	if result.RowsAffected() == 0 {
		return apperror.ErrNotFound
	}
	if _, err := r.db.Exec(ctx, `
		WITH ordered AS (
			SELECT id, row_number() OVER (ORDER BY position) - 1 AS new_position
			FROM public.muscles
			WHERE user_id = $1
		)
		UPDATE public.muscles m
		SET position = ordered.new_position, updated_at = now()
		FROM ordered
		WHERE m.id = ordered.id
	`, userID); err != nil {
		return fmt.Errorf("normalize muscle positions: %w", err)
	}
	return nil
}

func (r *MuscleRepository) Reorder(ctx context.Context, userID string, orderedIDs []string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin muscle reorder: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var count int
	if err := tx.QueryRow(ctx, `SELECT count(*) FROM public.muscles WHERE user_id = $1`, userID).Scan(&count); err != nil {
		return fmt.Errorf("count muscles: %w", err)
	}
	if count != len(orderedIDs) {
		return fmt.Errorf("%w: orderedIds must contain every muscle", apperror.ErrValidation)
	}
	for position, id := range orderedIDs {
		result, err := tx.Exec(ctx, `
			UPDATE public.muscles SET position = $3, updated_at = now()
			WHERE id = $1 AND user_id = $2
		`, id, userID, position)
		if err != nil {
			return fmt.Errorf("reorder muscle: %w", err)
		}
		if result.RowsAffected() != 1 {
			return fmt.Errorf("%w: invalid muscle in orderedIds", apperror.ErrValidation)
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit muscle reorder: %w", err)
	}
	return nil
}
