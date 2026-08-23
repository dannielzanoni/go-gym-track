package repositories

import (
	"context"
	"fmt"

	"go-gym-track/internal/models"

	"github.com/jackc/pgx/v5/pgxpool"
)

type TrainingPlanRepository struct {
	db *pgxpool.Pool
}

func NewTrainingPlanRepository(db *pgxpool.Pool) *TrainingPlanRepository {
	return &TrainingPlanRepository{db: db}
}

func (r *TrainingPlanRepository) Get(ctx context.Context, userID string) (models.TrainingPlan, error) {
	muscles, err := NewMuscleRepository(r.db).GetAll(ctx, userID)
	if err != nil {
		return models.TrainingPlan{}, err
	}
	muscleIndexes := make(map[string]int, len(muscles))
	for index := range muscles {
		muscleIndexes[muscles[index].ID] = index
	}

	type exerciseLocation struct{ muscle, exercise int }
	exerciseIndexes := make(map[string]exerciseLocation)
	rows, err := r.db.Query(ctx, `
		SELECT id, muscle_id, name, position
		FROM public.exercises
		WHERE user_id = $1
		ORDER BY muscle_id, position
	`, userID)
	if err != nil {
		return models.TrainingPlan{}, fmt.Errorf("query training plan exercises: %w", err)
	}
	for rows.Next() {
		var exercise models.Exercise
		exercise.Sets = make([]models.ExerciseSet, 0)
		if err := rows.Scan(&exercise.ID, &exercise.MuscleID, &exercise.Name, &exercise.Position); err != nil {
			rows.Close()
			return models.TrainingPlan{}, fmt.Errorf("scan training plan exercise: %w", err)
		}
		muscleIndex, exists := muscleIndexes[exercise.MuscleID]
		if !exists {
			continue
		}
		muscles[muscleIndex].Exercises = append(muscles[muscleIndex].Exercises, exercise)
		exerciseIndexes[exercise.ID] = exerciseLocation{muscle: muscleIndex, exercise: len(muscles[muscleIndex].Exercises) - 1}
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return models.TrainingPlan{}, fmt.Errorf("iterate training plan exercises: %w", err)
	}
	rows.Close()

	type setLocation struct{ muscle, exercise, set int }
	setIndexes := make(map[string]setLocation)
	rows, err = r.db.Query(ctx, `
		SELECT id, exercise_id, position, target_reps, target_weight
		FROM public.exercise_sets
		WHERE user_id = $1
		ORDER BY exercise_id, position
	`, userID)
	if err != nil {
		return models.TrainingPlan{}, fmt.Errorf("query training plan sets: %w", err)
	}
	for rows.Next() {
		var set models.ExerciseSet
		set.History = make([]models.SetHistory, 0)
		if err := rows.Scan(&set.ID, &set.ExerciseID, &set.Position, &set.TargetReps, &set.TargetWeight); err != nil {
			rows.Close()
			return models.TrainingPlan{}, fmt.Errorf("scan training plan set: %w", err)
		}
		location, exists := exerciseIndexes[set.ExerciseID]
		if !exists {
			continue
		}
		exercise := &muscles[location.muscle].Exercises[location.exercise]
		exercise.Sets = append(exercise.Sets, set)
		setIndexes[set.ID] = setLocation{
			muscle:   location.muscle,
			exercise: location.exercise,
			set:      len(exercise.Sets) - 1,
		}
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return models.TrainingPlan{}, fmt.Errorf("iterate training plan sets: %w", err)
	}
	rows.Close()

	rows, err = r.db.Query(ctx, `
		SELECT exercise_set_id, completed_at, reps, weight
		FROM (
			SELECT exercise_set_id, completed_at, reps, weight,
			       row_number() OVER (PARTITION BY exercise_set_id ORDER BY completed_at DESC) AS rank
			FROM public.workout_session_sets
			WHERE user_id = $1 AND completed = true AND exercise_set_id IS NOT NULL
		) history
		WHERE rank <= 8
		ORDER BY exercise_set_id, completed_at
	`, userID)
	if err != nil {
		return models.TrainingPlan{}, fmt.Errorf("query training plan history: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var setID string
		var item models.SetHistory
		if err := rows.Scan(&setID, &item.Date, &item.Reps, &item.Weight); err != nil {
			return models.TrainingPlan{}, fmt.Errorf("scan training plan history: %w", err)
		}
		if location, exists := setIndexes[setID]; exists {
			set := &muscles[location.muscle].Exercises[location.exercise].Sets[location.set]
			set.History = append(set.History, item)
		}
	}
	if err := rows.Err(); err != nil {
		return models.TrainingPlan{}, fmt.Errorf("iterate training plan history: %w", err)
	}
	return models.TrainingPlan{Muscles: muscles}, nil
}
