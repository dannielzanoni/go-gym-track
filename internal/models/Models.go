package models

import "time"

type User struct {
	ID           string    `json:"id"`
	Email        string    `json:"email"`
	DisplayName  string    `json:"displayName"`
	PasswordHash string    `json:"-"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

type SetHistory struct {
	Date   time.Time `json:"date"`
	Reps   int       `json:"reps"`
	Weight float64   `json:"weight"`
}

type ExerciseSet struct {
	ID           string       `json:"id"`
	ExerciseID   string       `json:"exerciseId,omitempty"`
	Position     int          `json:"position"`
	TargetReps   int          `json:"targetReps"`
	TargetWeight float64      `json:"targetWeight"`
	History      []SetHistory `json:"history"`
}

type Exercise struct {
	ID       string        `json:"id"`
	MuscleID string        `json:"muscleId,omitempty"`
	Name     string        `json:"name"`
	Position int           `json:"position"`
	Sets     []ExerciseSet `json:"sets"`
}

type Muscle struct {
	ID            string     `json:"id"`
	Name          string     `json:"name"`
	Position      int        `json:"position"`
	LastWorkoutAt *time.Time `json:"lastWorkoutAt"`
	Exercises     []Exercise `json:"exercises"`
}

type TrainingPlan struct {
	Muscles []Muscle `json:"muscles"`
}

type WorkoutSessionSet struct {
	ID               string     `json:"id"`
	ExerciseID       *string    `json:"exerciseId"`
	ExerciseSetID    *string    `json:"exerciseSetId"`
	ExerciseName     string     `json:"exerciseName"`
	ExercisePosition int        `json:"exercisePosition"`
	SetNumber        int        `json:"setNumber"`
	Reps             int        `json:"reps"`
	Weight           float64    `json:"weight"`
	Completed        bool       `json:"completed"`
	CompletedAt      *time.Time `json:"completedAt"`
}

type WorkoutSession struct {
	ID          string              `json:"id"`
	MuscleID    *string             `json:"muscleId"`
	MuscleName  string              `json:"muscleName"`
	Status      string              `json:"status"`
	StartedAt   time.Time           `json:"startedAt"`
	CompletedAt *time.Time          `json:"completedAt"`
	Sets        []WorkoutSessionSet `json:"sets"`
}

type WorkoutSessionSummary struct {
	ID            string    `json:"id"`
	MuscleID      *string   `json:"muscleId"`
	MuscleName    string    `json:"muscleName"`
	CompletedAt   time.Time `json:"completedAt"`
	CompletedSets int       `json:"completedSets"`
}

type CardioRecord struct {
	ID              string    `json:"id"`
	ActivityType    string    `json:"activityType"`
	DurationMinutes int       `json:"durationMinutes"`
	DistanceKM      float64   `json:"distanceKm"`
	Calories        int       `json:"calories"`
	OccurredAt      time.Time `json:"occurredAt"`
	CreatedAt       time.Time `json:"createdAt"`
}
