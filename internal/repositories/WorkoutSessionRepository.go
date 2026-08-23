package repositories

import (
	"context"
	"errors"
	"fmt"
	"time"

	"go-gym-track/internal/apperror"
	"go-gym-track/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type UpdateSessionSet struct {
	Reps      *int
	Weight    *float64
	Completed *bool
}

type WorkoutSessionRepository struct {
	db *pgxpool.Pool
}

func NewWorkoutSessionRepository(db *pgxpool.Pool) *WorkoutSessionRepository {
	return &WorkoutSessionRepository{db: db}
}

func (r *WorkoutSessionRepository) Start(ctx context.Context, userID, muscleID string) (models.WorkoutSession, error) {
	if active, err := r.GetActive(ctx, userID, muscleID); err == nil {
		return active, nil
	} else if !errors.Is(err, apperror.ErrNotFound) {
		return models.WorkoutSession{}, err
	}

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return models.WorkoutSession{}, fmt.Errorf("begin workout session: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var session models.WorkoutSession
	err = tx.QueryRow(ctx, `
		INSERT INTO public.workout_sessions (user_id, muscle_id, muscle_name, status)
		SELECT $1, id, name, 'active'
		FROM public.muscles
		WHERE id = $2 AND user_id = $1
		RETURNING id, muscle_id, muscle_name, status, started_at, completed_at
	`, userID, muscleID).Scan(&session.ID, &session.MuscleID, &session.MuscleName, &session.Status, &session.StartedAt, &session.CompletedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.WorkoutSession{}, apperror.ErrNotFound
	}
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			_ = tx.Rollback(ctx)
			return r.GetActive(ctx, userID, muscleID)
		}
		return models.WorkoutSession{}, fmt.Errorf("create workout session: %w", err)
	}

	if _, err := tx.Exec(ctx, `
		INSERT INTO public.workout_session_sets (
			session_id, user_id, exercise_id, exercise_set_id, exercise_name,
			exercise_position, set_number, reps, weight
		)
		SELECT $1, e.user_id, e.id, es.id, e.name,
		       e.position, es.position + 1, es.target_reps, es.target_weight
		FROM public.exercises e
		JOIN public.exercise_sets es ON es.exercise_id = e.id AND es.user_id = e.user_id
		WHERE e.user_id = $2 AND e.muscle_id = $3
		ORDER BY e.position, es.position
	`, session.ID, userID, muscleID); err != nil {
		return models.WorkoutSession{}, fmt.Errorf("snapshot workout session sets: %w", err)
	}
	sets, err := getSessionSets(ctx, tx, userID, session.ID)
	if err != nil {
		return models.WorkoutSession{}, err
	}
	session.Sets = sets
	if err := tx.Commit(ctx); err != nil {
		return models.WorkoutSession{}, fmt.Errorf("commit workout session: %w", err)
	}
	return session, nil
}

func (r *WorkoutSessionRepository) GetActive(ctx context.Context, userID, muscleID string) (models.WorkoutSession, error) {
	return r.get(ctx, r.db, userID, `
		SELECT id, muscle_id, muscle_name, status, started_at, completed_at
		FROM public.workout_sessions
		WHERE user_id = $1 AND muscle_id = $2 AND status = 'active'
	`, muscleID)
}

func (r *WorkoutSessionRepository) GetByID(ctx context.Context, userID, id string) (models.WorkoutSession, error) {
	return r.get(ctx, r.db, userID, `
		SELECT id, muscle_id, muscle_name, status, started_at, completed_at
		FROM public.workout_sessions
		WHERE user_id = $1 AND id = $2
	`, id)
}

func (r *WorkoutSessionRepository) get(ctx context.Context, querier sessionQuerier, userID, query, value string) (models.WorkoutSession, error) {
	var session models.WorkoutSession
	err := querier.QueryRow(ctx, query, userID, value).Scan(&session.ID, &session.MuscleID, &session.MuscleName, &session.Status, &session.StartedAt, &session.CompletedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.WorkoutSession{}, apperror.ErrNotFound
	}
	if err != nil {
		return models.WorkoutSession{}, fmt.Errorf("get workout session: %w", err)
	}
	sets, err := getSessionSets(ctx, querier, userID, session.ID)
	if err != nil {
		return models.WorkoutSession{}, err
	}
	session.Sets = sets
	return session, nil
}

func (r *WorkoutSessionRepository) UpdateSet(ctx context.Context, userID, sessionID, setID string, input UpdateSessionSet) (models.WorkoutSessionSet, error) {
	if input.Reps != nil && *input.Reps < 0 || input.Weight != nil && *input.Weight < 0 {
		return models.WorkoutSessionSet{}, fmt.Errorf("%w: reps and weight cannot be negative", apperror.ErrValidation)
	}
	var set models.WorkoutSessionSet
	err := r.db.QueryRow(ctx, `
		UPDATE public.workout_session_sets wss
		SET reps = COALESCE($4, wss.reps), weight = COALESCE($5, wss.weight),
		    completed = COALESCE($6, wss.completed),
		    completed_at = CASE
		      WHEN $6::boolean IS NULL THEN wss.completed_at
		      WHEN $6 THEN COALESCE(wss.completed_at, now()) ELSE NULL END,
		    updated_at = now()
		FROM public.workout_sessions ws
		WHERE wss.id = $1 AND wss.session_id = $2 AND wss.user_id = $3
		  AND ws.id = wss.session_id AND ws.user_id = wss.user_id AND ws.status = 'active'
		RETURNING wss.id, wss.exercise_id, wss.exercise_set_id, wss.exercise_name,
		          wss.exercise_position, wss.set_number, wss.reps, wss.weight,
		          wss.completed, wss.completed_at
	`, setID, sessionID, userID, input.Reps, input.Weight, input.Completed).Scan(
		&set.ID, &set.ExerciseID, &set.ExerciseSetID, &set.ExerciseName,
		&set.ExercisePosition, &set.SetNumber, &set.Reps, &set.Weight,
		&set.Completed, &set.CompletedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.WorkoutSessionSet{}, apperror.ErrNotFound
	}
	if err != nil {
		return models.WorkoutSessionSet{}, fmt.Errorf("update workout session set: %w", err)
	}
	return set, nil
}

func (r *WorkoutSessionRepository) Complete(ctx context.Context, userID, sessionID string) (models.WorkoutSession, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return models.WorkoutSession{}, fmt.Errorf("begin workout completion: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var status string
	if err := tx.QueryRow(ctx, `SELECT status FROM public.workout_sessions WHERE id = $1 AND user_id = $2 FOR UPDATE`, sessionID, userID).Scan(&status); errors.Is(err, pgx.ErrNoRows) {
		return models.WorkoutSession{}, apperror.ErrNotFound
	} else if err != nil {
		return models.WorkoutSession{}, fmt.Errorf("lock workout session: %w", err)
	}
	if status != "active" {
		return models.WorkoutSession{}, fmt.Errorf("%w: workout session is not active", apperror.ErrConflict)
	}
	var completedSets int
	if err := tx.QueryRow(ctx, `SELECT count(*) FROM public.workout_session_sets WHERE session_id = $1 AND user_id = $2 AND completed = true`, sessionID, userID).Scan(&completedSets); err != nil {
		return models.WorkoutSession{}, fmt.Errorf("count completed workout sets: %w", err)
	}
	if completedSets < 10 {
		return models.WorkoutSession{}, fmt.Errorf("%w: at least 10 completed sets are required", apperror.ErrBusinessRule)
	}
	if _, err := tx.Exec(ctx, `
		UPDATE public.exercise_sets es
		SET target_reps = wss.reps, target_weight = wss.weight, updated_at = now()
		FROM public.workout_session_sets wss
		WHERE wss.session_id = $1 AND wss.user_id = $2 AND wss.completed = true
		  AND wss.exercise_set_id = es.id AND es.user_id = wss.user_id
	`, sessionID, userID); err != nil {
		return models.WorkoutSession{}, fmt.Errorf("update exercise set targets: %w", err)
	}
	if _, err := tx.Exec(ctx, `UPDATE public.workout_sessions SET status = 'completed', completed_at = now(), updated_at = now() WHERE id = $1 AND user_id = $2`, sessionID, userID); err != nil {
		return models.WorkoutSession{}, fmt.Errorf("complete workout session: %w", err)
	}
	session, err := r.get(ctx, tx, userID, `
		SELECT id, muscle_id, muscle_name, status, started_at, completed_at
		FROM public.workout_sessions WHERE user_id = $1 AND id = $2
	`, sessionID)
	if err != nil {
		return models.WorkoutSession{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return models.WorkoutSession{}, fmt.Errorf("commit workout completion: %w", err)
	}
	return session, nil
}

func (r *WorkoutSessionRepository) Cancel(ctx context.Context, userID, sessionID string) error {
	result, err := r.db.Exec(ctx, `UPDATE public.workout_sessions SET status = 'cancelled', updated_at = now() WHERE id = $1 AND user_id = $2 AND status = 'active'`, sessionID, userID)
	if err != nil {
		return fmt.Errorf("cancel workout session: %w", err)
	}
	if result.RowsAffected() == 0 {
		return apperror.ErrNotFound
	}
	return nil
}

func (r *WorkoutSessionRepository) List(ctx context.Context, userID string, muscleID *string, before *time.Time, limit int) ([]models.WorkoutSessionSummary, error) {
	rows, err := r.db.Query(ctx, `
		SELECT ws.id, ws.muscle_id, ws.muscle_name, ws.completed_at,
		       count(wss.id) FILTER (WHERE wss.completed = true)
		FROM public.workout_sessions ws
		LEFT JOIN public.workout_session_sets wss ON wss.session_id = ws.id
		WHERE ws.user_id = $1 AND ws.status = 'completed'
		  AND ($2::uuid IS NULL OR ws.muscle_id = $2)
		  AND ($3::timestamptz IS NULL OR ws.completed_at < $3)
		GROUP BY ws.id ORDER BY ws.completed_at DESC LIMIT $4
	`, userID, muscleID, before, limit)
	if err != nil {
		return nil, fmt.Errorf("query workout history: %w", err)
	}
	defer rows.Close()
	items := make([]models.WorkoutSessionSummary, 0)
	for rows.Next() {
		var item models.WorkoutSessionSummary
		if err := rows.Scan(&item.ID, &item.MuscleID, &item.MuscleName, &item.CompletedAt, &item.CompletedSets); err != nil {
			return nil, fmt.Errorf("scan workout history: %w", err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate workout history: %w", err)
	}
	return items, nil
}

type sessionQuerier interface {
	QueryRow(context.Context, string, ...any) pgx.Row
	Query(context.Context, string, ...any) (pgx.Rows, error)
}

func getSessionSets(ctx context.Context, querier sessionQuerier, userID, sessionID string) ([]models.WorkoutSessionSet, error) {
	rows, err := querier.Query(ctx, `
		SELECT id, exercise_id, exercise_set_id, exercise_name, exercise_position,
		       set_number, reps, weight, completed, completed_at
		FROM public.workout_session_sets
		WHERE user_id = $1 AND session_id = $2
		ORDER BY exercise_position, set_number
	`, userID, sessionID)
	if err != nil {
		return nil, fmt.Errorf("query workout session sets: %w", err)
	}
	defer rows.Close()
	sets := make([]models.WorkoutSessionSet, 0)
	for rows.Next() {
		var set models.WorkoutSessionSet
		if err := rows.Scan(&set.ID, &set.ExerciseID, &set.ExerciseSetID, &set.ExerciseName, &set.ExercisePosition, &set.SetNumber, &set.Reps, &set.Weight, &set.Completed, &set.CompletedAt); err != nil {
			return nil, fmt.Errorf("scan workout session set: %w", err)
		}
		sets = append(sets, set)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate workout session sets: %w", err)
	}
	return sets, nil
}
