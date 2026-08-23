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

type ExerciseSetRepository struct {
	db *pgxpool.Pool
}

func NewExerciseSetRepository(db *pgxpool.Pool) *ExerciseSetRepository {
	return &ExerciseSetRepository{db: db}
}

func (r *ExerciseSetRepository) Create(ctx context.Context, userID, exerciseID string, targetReps int, targetWeight float64) (models.ExerciseSet, error) {
	if targetReps < 0 || targetWeight < 0 {
		return models.ExerciseSet{}, fmt.Errorf("%w: reps and weight cannot be negative", apperror.ErrValidation)
	}
	set := models.ExerciseSet{ExerciseID: exerciseID, History: make([]models.SetHistory, 0)}
	err := r.db.QueryRow(ctx, `
		INSERT INTO public.exercise_sets (user_id, exercise_id, position, target_reps, target_weight)
		SELECT $1, $2, COALESCE(MAX(es.position) + 1, 0), $3, $4
		FROM public.exercises e
		LEFT JOIN public.exercise_sets es ON es.exercise_id = e.id
		WHERE e.id = $2 AND e.user_id = $1
		GROUP BY e.id
		RETURNING id, position, target_reps, target_weight
	`, userID, exerciseID, targetReps, targetWeight).Scan(&set.ID, &set.Position, &set.TargetReps, &set.TargetWeight)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.ExerciseSet{}, apperror.ErrNotFound
	}
	if err != nil {
		return models.ExerciseSet{}, fmt.Errorf("create exercise set: %w", err)
	}
	return set, nil
}

func (r *ExerciseSetRepository) Update(ctx context.Context, userID, id string, targetReps int, targetWeight float64) (models.ExerciseSet, error) {
	if targetReps < 0 || targetWeight < 0 {
		return models.ExerciseSet{}, fmt.Errorf("%w: reps and weight cannot be negative", apperror.ErrValidation)
	}
	set := models.ExerciseSet{History: make([]models.SetHistory, 0)}
	err := r.db.QueryRow(ctx, `
		UPDATE public.exercise_sets
		SET target_reps = $3, target_weight = $4, updated_at = now()
		WHERE id = $1 AND user_id = $2
		RETURNING id, exercise_id, position, target_reps, target_weight
	`, id, userID, targetReps, targetWeight).Scan(&set.ID, &set.ExerciseID, &set.Position, &set.TargetReps, &set.TargetWeight)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.ExerciseSet{}, apperror.ErrNotFound
	}
	if err != nil {
		return models.ExerciseSet{}, fmt.Errorf("update exercise set: %w", err)
	}
	return set, nil
}

func (r *ExerciseSetRepository) Delete(ctx context.Context, userID, id string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin exercise set deletion: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var exerciseID string
	if err := tx.QueryRow(ctx, `DELETE FROM public.exercise_sets WHERE id = $1 AND user_id = $2 RETURNING exercise_id`, id, userID).Scan(&exerciseID); errors.Is(err, pgx.ErrNoRows) {
		return apperror.ErrNotFound
	} else if err != nil {
		return fmt.Errorf("delete exercise set: %w", err)
	}
	if _, err := tx.Exec(ctx, `
		WITH ordered AS (
			SELECT id, row_number() OVER (ORDER BY position) - 1 AS new_position
			FROM public.exercise_sets WHERE exercise_id = $1 AND user_id = $2
		)
		UPDATE public.exercise_sets es
		SET position = ordered.new_position, updated_at = now()
		FROM ordered WHERE es.id = ordered.id
	`, exerciseID, userID); err != nil {
		return fmt.Errorf("normalize exercise set positions: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit exercise set deletion: %w", err)
	}
	return nil
}

func (r *ExerciseSetRepository) Reorder(ctx context.Context, userID, exerciseID string, orderedIDs []string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin exercise set reorder: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()
	var count int
	if err := tx.QueryRow(ctx, `SELECT count(*) FROM public.exercise_sets WHERE user_id = $1 AND exercise_id = $2`, userID, exerciseID).Scan(&count); err != nil {
		return fmt.Errorf("count exercise sets: %w", err)
	}
	if count != len(orderedIDs) {
		return fmt.Errorf("%w: orderedIds must contain every set", apperror.ErrValidation)
	}
	for position, id := range orderedIDs {
		result, err := tx.Exec(ctx, `
			UPDATE public.exercise_sets SET position = $4, updated_at = now()
			WHERE id = $1 AND user_id = $2 AND exercise_id = $3
		`, id, userID, exerciseID, position)
		if err != nil {
			return fmt.Errorf("reorder exercise set: %w", err)
		}
		if result.RowsAffected() != 1 {
			return fmt.Errorf("%w: invalid set in orderedIds", apperror.ErrValidation)
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit exercise set reorder: %w", err)
	}
	return nil
}

func (r *ExerciseSetRepository) History(ctx context.Context, userID, setID string, before *time.Time, limit int) ([]models.SetHistory, error) {
	rows, err := r.db.Query(ctx, `
		SELECT wss.completed_at, wss.reps, wss.weight
		FROM public.workout_session_sets wss
		JOIN public.exercise_sets es ON es.id = wss.exercise_set_id AND es.user_id = wss.user_id
		WHERE wss.user_id = $1 AND wss.exercise_set_id = $2 AND wss.completed = true
		  AND ($3::timestamptz IS NULL OR wss.completed_at < $3)
		ORDER BY wss.completed_at DESC LIMIT $4
	`, userID, setID, before, limit)
	if err != nil {
		return nil, fmt.Errorf("query exercise set history: %w", err)
	}
	defer rows.Close()
	history := make([]models.SetHistory, 0)
	for rows.Next() {
		var item models.SetHistory
		if err := rows.Scan(&item.Date, &item.Reps, &item.Weight); err != nil {
			return nil, fmt.Errorf("scan exercise set history: %w", err)
		}
		history = append(history, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate exercise set history: %w", err)
	}
	return history, nil
}
