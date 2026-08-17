package repositories

import (
	"context"
	"fmt"

	"go-gym-track/internal/models"

	"github.com/jackc/pgx/v5/pgxpool"
)

type MuscleRepository struct {
	db *pgxpool.Pool
}

func NewMuscleRepository(db *pgxpool.Pool) *MuscleRepository {
	return &MuscleRepository{
		db: db,
	}
}

func (r *MuscleRepository) GetAll(
	ctx context.Context,
) ([]models.Muscle, error) {
	const query = `
		SELECT id, name
		FROM public.muscles
		ORDER BY name
	`

	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("query muscles: %w", err)
	}
	defer rows.Close()

	muscles := make([]models.Muscle, 0)

	for rows.Next() {
		muscle := models.Muscle{
			Workouts: make([]models.Workout, 0),
		}

		if err := rows.Scan(
			&muscle.ID,
			&muscle.Name,
		); err != nil {
			return nil, fmt.Errorf("scan muscle: %w", err)
		}

		muscles = append(muscles, muscle)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate muscles: %w", err)
	}

	return muscles, nil
}

func (r *MuscleRepository) Create(
	ctx context.Context,
	name string,
) (models.Muscle, error) {
	const query = `
		INSERT INTO public.muscles (name)
		VALUES ($1)
		RETURNING id, name
	`

	muscle := models.Muscle{
		Workouts: make([]models.Workout, 0),
	}

	err := r.db.QueryRow(
		ctx,
		query,
		name,
	).Scan(
		&muscle.ID,
		&muscle.Name,
	)
	if err != nil {
		return models.Muscle{}, fmt.Errorf("create muscle: %w", err)
	}

	return muscle, nil
}
