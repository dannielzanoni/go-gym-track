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

var validCardioTypes = map[string]bool{
	"treadmill": true,
	"bike":      true,
	"football":  true,
}

type CardioRepository struct {
	db *pgxpool.Pool
}

func NewCardioRepository(db *pgxpool.Pool) *CardioRepository {
	return &CardioRepository{db: db}
}

func (r *CardioRepository) Create(
	ctx context.Context,
	userID, activityType string,
	durationMinutes int,
	distanceKM float64,
	calories int,
	occurredAt time.Time,
) (models.CardioRecord, error) {
	if !validCardioTypes[activityType] || durationMinutes <= 0 || distanceKM < 0 || calories < 0 || occurredAt.IsZero() {
		return models.CardioRecord{}, fmt.Errorf("%w: invalid cardio record", apperror.ErrValidation)
	}

	var record models.CardioRecord
	err := r.db.QueryRow(ctx, `
		INSERT INTO public.cardio_records (
			user_id, activity_type, duration_minutes, distance_km, calories, occurred_at
		)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, activity_type, duration_minutes, distance_km, calories, occurred_at, created_at
	`, userID, activityType, durationMinutes, distanceKM, calories, occurredAt).Scan(
		&record.ID,
		&record.ActivityType,
		&record.DurationMinutes,
		&record.DistanceKM,
		&record.Calories,
		&record.OccurredAt,
		&record.CreatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.CardioRecord{}, apperror.ErrNotFound
	}
	if err != nil {
		return models.CardioRecord{}, fmt.Errorf("create cardio record: %w", err)
	}
	return record, nil
}

func (r *CardioRepository) List(ctx context.Context, userID string, from, to *time.Time, limit int) ([]models.CardioRecord, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, activity_type, duration_minutes, distance_km, calories, occurred_at, created_at
		FROM public.cardio_records
		WHERE user_id = $1
		  AND ($2::timestamptz IS NULL OR occurred_at >= $2)
		  AND ($3::timestamptz IS NULL OR occurred_at < $3)
		ORDER BY occurred_at DESC, created_at DESC
		LIMIT $4
	`, userID, from, to, limit)
	if err != nil {
		return nil, fmt.Errorf("list cardio records: %w", err)
	}
	defer rows.Close()

	records := make([]models.CardioRecord, 0)
	for rows.Next() {
		var record models.CardioRecord
		if err := rows.Scan(
			&record.ID,
			&record.ActivityType,
			&record.DurationMinutes,
			&record.DistanceKM,
			&record.Calories,
			&record.OccurredAt,
			&record.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan cardio record: %w", err)
		}
		records = append(records, record)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate cardio records: %w", err)
	}
	return records, nil
}

func (r *CardioRepository) WeeklySummary(
	ctx context.Context,
	userID string,
	weekStart, weekEnd time.Time,
	timezone string,
) (models.CardioWeekSummary, error) {
	rows, err := r.db.Query(ctx, `
		SELECT to_char(occurred_at AT TIME ZONE $4, 'YYYY-MM-DD') AS local_date,
		       COALESCE(sum(duration_minutes), 0)::integer,
		       COALESCE(sum(distance_km), 0)::double precision,
		       COALESCE(sum(calories), 0)::integer
		FROM public.cardio_records
		WHERE user_id = $1 AND occurred_at >= $2 AND occurred_at < $3
		GROUP BY local_date
		ORDER BY local_date
	`, userID, weekStart, weekEnd, timezone)
	if err != nil {
		return models.CardioWeekSummary{}, fmt.Errorf("summarize weekly cardio: %w", err)
	}
	defer rows.Close()

	byDate := make(map[string]models.CardioDaySummary, 7)
	for rows.Next() {
		var day models.CardioDaySummary
		if err := rows.Scan(&day.Date, &day.DurationMinutes, &day.DistanceKM, &day.Calories); err != nil {
			return models.CardioWeekSummary{}, fmt.Errorf("scan weekly cardio summary: %w", err)
		}
		byDate[day.Date] = day
	}
	if err := rows.Err(); err != nil {
		return models.CardioWeekSummary{}, fmt.Errorf("iterate weekly cardio summary: %w", err)
	}

	summary := models.CardioWeekSummary{
		WeekStart: weekStart.Format("2006-01-02"),
		WeekEnd:   weekEnd.AddDate(0, 0, -1).Format("2006-01-02"),
		Days:      make([]models.CardioDaySummary, 0, 7),
	}
	for day := weekStart; day.Before(weekEnd); day = day.AddDate(0, 0, 1) {
		date := day.Format("2006-01-02")
		daily := byDate[date]
		daily.Date = date
		summary.Days = append(summary.Days, daily)
		summary.DurationMinutes += daily.DurationMinutes
		summary.DistanceKM += daily.DistanceKM
		summary.Calories += daily.Calories
	}
	return summary, nil
}
