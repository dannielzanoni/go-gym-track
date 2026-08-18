package repositories

import (
	"context"
	"fmt"
	"go-gym-track/internal/models"

	"github.com/jackc/pgx/v5/pgxpool"
)

type WorkoutRepository struct {
	db *pgxpool.Pool
}

func NewWorkoutRepository(db *pgxpool.Pool) *WorkoutRepository {
	return &WorkoutRepository{
		db: db,
	}
}

func (r *WorkoutRepository) GetAll(
	ctx context.Context,
) ([]models.Workout, error) {
	const query = `
		SELECT id, muscle_id, name, created_at
		FROM public.workouts
		ORDER BY name
	`

	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("query workouts: %w", err)
	}
	defer rows.Close()

	workouts := make([]models.Workout, 0)

	for rows.Next() {
		workout := models.Workout{
			Sets: make([]models.Set, 0),
		}

		if err := rows.Scan(
			&workout.ID,
			&workout.MuscleID,
			&workout.Name,
			&workout.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan workout: %w", err)
		}

		workouts = append(workouts, workout)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate workouts: %w", err)
	}

	return workouts, nil
}

func (r *WorkoutRepository) Create(
	ctx context.Context,
	muscleID string,
	name string,
) (models.Workout, error) {
	const query = `
		INSERT INTO public.workouts (muscle_id, name)
		VALUES ($1, $2)
		RETURNING id, muscle_id, name, created_at
	`

	workout := models.Workout{
		Sets: make([]models.Set, 0),
	}

	err := r.db.QueryRow(
		ctx,
		query,
		muscleID,
		name,
	).Scan(
		&workout.ID,
		&workout.MuscleID,
		&workout.Name,
		&workout.CreatedAt,
	)
	if err != nil {
		return models.Workout{}, fmt.Errorf(
			"create workout: %w",
			err,
		)
	}

	return workout, nil
}
