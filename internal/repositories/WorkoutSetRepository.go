package repositories

import (
	"context"
	"fmt"

	"go-gym-track/internal/models"

	"github.com/jackc/pgx/v5/pgxpool"
)

type WorkoutSetRepository struct {
	db *pgxpool.Pool
}

func NewWorkoutSetRepository(db *pgxpool.Pool) *WorkoutSetRepository {
	return &WorkoutSetRepository{
		db: db,
	}
}

func (r *WorkoutSetRepository) GetAll(
	ctx context.Context,
) ([]models.Set, error) {
	const query = `
		SELECT id, workout_id, done, reps, weight, created_at
		FROM public.workout_sets
		ORDER BY created_at DESC
	`

	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("query workout sets: %w", err)
	}
	defer rows.Close()

	workoutSets := make([]models.Set, 0)

	for rows.Next() {
		workoutSet := newWorkoutSet()

		if err := rows.Scan(
			&workoutSet.ID,
			&workoutSet.WorkoutID,
			&workoutSet.Done,
			&workoutSet.Reps,
			&workoutSet.Weight,
			&workoutSet.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan workout set: %w", err)
		}

		workoutSets = append(workoutSets, workoutSet)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate workout sets: %w", err)
	}

	return workoutSets, nil
}

func (r *WorkoutSetRepository) GetByID(
	ctx context.Context,
	id string,
) (models.Set, error) {
	const query = `
		SELECT id, workout_id, done, reps, weight, created_at
		FROM public.workout_sets
		WHERE id = $1
	`

	workoutSet := newWorkoutSet()

	err := r.db.QueryRow(ctx, query, id).Scan(
		&workoutSet.ID,
		&workoutSet.WorkoutID,
		&workoutSet.Done,
		&workoutSet.Reps,
		&workoutSet.Weight,
		&workoutSet.CreatedAt,
	)
	if err != nil {
		return models.Set{}, fmt.Errorf("get workout set by id: %w", err)
	}

	return workoutSet, nil
}

func (r *WorkoutSetRepository) Create(
	ctx context.Context,
	workoutID string,
	done bool,
	reps int,
	weight float64,
) (models.Set, error) {
	const query = `
		INSERT INTO public.workout_sets (workout_id, done, reps, weight)
		VALUES ($1, $2, $3, $4)
		RETURNING id, workout_id, done, reps, weight, created_at
	`

	workoutSet := newWorkoutSet()

	err := r.db.QueryRow(
		ctx,
		query,
		workoutID,
		done,
		reps,
		weight,
	).Scan(
		&workoutSet.ID,
		&workoutSet.WorkoutID,
		&workoutSet.Done,
		&workoutSet.Reps,
		&workoutSet.Weight,
		&workoutSet.CreatedAt,
	)
	if err != nil {
		return models.Set{}, fmt.Errorf("create workout set: %w", err)
	}

	return workoutSet, nil
}

func newWorkoutSet() models.Set {
	return models.Set{
		HistoryRepsAndWeight: make([]models.HistoryRepsAndWeight, 0),
	}
}
