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

type NewExerciseSet struct {
	TargetReps   int
	TargetWeight float64
}

type ExerciseRepository struct {
	db *pgxpool.Pool
}

func NewExerciseRepository(db *pgxpool.Pool) *ExerciseRepository {
	return &ExerciseRepository{db: db}
}

func (r *ExerciseRepository) Create(
	ctx context.Context,
	userID, muscleID, name string,
	sets []NewExerciseSet,
) (models.Exercise, error) {
	name = strings.TrimSpace(name)
	if name == "" || len(name) > 120 {
		return models.Exercise{}, fmt.Errorf("%w: invalid exercise name", apperror.ErrValidation)
	}

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return models.Exercise{}, fmt.Errorf("begin exercise creation: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	exercise := models.Exercise{MuscleID: muscleID, Sets: make([]models.ExerciseSet, 0, len(sets))}
	err = tx.QueryRow(ctx, `
		INSERT INTO public.exercises (user_id, muscle_id, name, position)
		SELECT $1, $2, $3, COALESCE(MAX(e.position) + 1, 0)
		FROM public.muscles m
		LEFT JOIN public.exercises e ON e.muscle_id = m.id
		WHERE m.id = $2 AND m.user_id = $1
		GROUP BY m.id
		RETURNING id, name, position
	`, userID, muscleID, name).Scan(&exercise.ID, &exercise.Name, &exercise.Position)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.Exercise{}, apperror.ErrNotFound
	}
	if err != nil {
		return models.Exercise{}, fmt.Errorf("create exercise: %w", err)
	}

	for position, set := range sets {
		if set.TargetReps < 0 || set.TargetWeight < 0 {
			return models.Exercise{}, fmt.Errorf("%w: reps and weight cannot be negative", apperror.ErrValidation)
		}
		created := models.ExerciseSet{ExerciseID: exercise.ID, History: make([]models.SetHistory, 0)}
		if err := tx.QueryRow(ctx, `
			INSERT INTO public.exercise_sets (user_id, exercise_id, position, target_reps, target_weight)
			VALUES ($1, $2, $3, $4, $5)
			RETURNING id, position, target_reps, target_weight
		`, userID, exercise.ID, position, set.TargetReps, set.TargetWeight).Scan(
			&created.ID,
			&created.Position,
			&created.TargetReps,
			&created.TargetWeight,
		); err != nil {
			return models.Exercise{}, fmt.Errorf("create initial exercise set: %w", err)
		}
		exercise.Sets = append(exercise.Sets, created)
	}

	if err := tx.Commit(ctx); err != nil {
		return models.Exercise{}, fmt.Errorf("commit exercise creation: %w", err)
	}
	return exercise, nil
}

func (r *ExerciseRepository) Update(ctx context.Context, userID, id, name string) (models.Exercise, error) {
	name = strings.TrimSpace(name)
	if name == "" || len(name) > 120 {
		return models.Exercise{}, fmt.Errorf("%w: invalid exercise name", apperror.ErrValidation)
	}

	exercise := models.Exercise{Sets: make([]models.ExerciseSet, 0)}
	err := r.db.QueryRow(ctx, `
		UPDATE public.exercises
		SET name = $3, updated_at = now()
		WHERE id = $1 AND user_id = $2
		RETURNING id, muscle_id, name, position
	`, id, userID, name).Scan(&exercise.ID, &exercise.MuscleID, &exercise.Name, &exercise.Position)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.Exercise{}, apperror.ErrNotFound
	}
	if err != nil {
		return models.Exercise{}, fmt.Errorf("update exercise: %w", err)
	}
	return exercise, nil
}

func (r *ExerciseRepository) Delete(ctx context.Context, userID, id string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin exercise deletion: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var muscleID string
	if err := tx.QueryRow(ctx, `
		DELETE FROM public.exercises
		WHERE id = $1 AND user_id = $2
		RETURNING muscle_id
	`, id, userID).Scan(&muscleID); errors.Is(err, pgx.ErrNoRows) {
		return apperror.ErrNotFound
	} else if err != nil {
		return fmt.Errorf("delete exercise: %w", err)
	}

	if _, err := tx.Exec(ctx, `
		WITH ordered AS (
			SELECT id, row_number() OVER (ORDER BY position) - 1 AS new_position
			FROM public.exercises
			WHERE muscle_id = $1 AND user_id = $2
		)
		UPDATE public.exercises e
		SET position = ordered.new_position, updated_at = now()
		FROM ordered
		WHERE e.id = ordered.id
	`, muscleID, userID); err != nil {
		return fmt.Errorf("normalize exercise positions: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit exercise deletion: %w", err)
	}
	return nil
}

func (r *ExerciseRepository) Reorder(ctx context.Context, userID, muscleID string, orderedIDs []string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin exercise reorder: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var count int
	if err := tx.QueryRow(ctx, `
		SELECT count(*) FROM public.exercises WHERE user_id = $1 AND muscle_id = $2
	`, userID, muscleID).Scan(&count); err != nil {
		return fmt.Errorf("count exercises: %w", err)
	}
	if count != len(orderedIDs) {
		return fmt.Errorf("%w: orderedIds must contain every exercise", apperror.ErrValidation)
	}
	for position, id := range orderedIDs {
		result, err := tx.Exec(ctx, `
			UPDATE public.exercises SET position = $4, updated_at = now()
			WHERE id = $1 AND user_id = $2 AND muscle_id = $3
		`, id, userID, muscleID, position)
		if err != nil {
			return fmt.Errorf("reorder exercise: %w", err)
		}
		if result.RowsAffected() != 1 {
			return fmt.Errorf("%w: invalid exercise in orderedIds", apperror.ErrValidation)
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit exercise reorder: %w", err)
	}
	return nil
}
