package main

import (
	"context"
	"log"
	"time"

	"go-gym-track/internal/auth"
	"go-gym-track/internal/config"
	"go-gym-track/internal/database"
	"go-gym-track/internal/handlers"
	httpserver "go-gym-track/internal/http"
	"go-gym-track/internal/repositories"
	"go-gym-track/internal/services"
	"go-gym-track/migrations"
)

func main() {
	appConfig, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	pool, err := database.NewPostgresPool(ctx, appConfig.DatabaseURL)
	if err != nil {
		cancel()
		log.Fatal(err)
	}
	if appConfig.RunMigrations {
		if err := database.RunMigrations(ctx, pool, migrations.Files); err != nil {
			cancel()
			pool.Close()
			log.Fatal(err)
		}
	}
	cancel()
	defer pool.Close()

	tokens := auth.NewTokenService(appConfig.JWTIssuer, appConfig.JWTAudience, appConfig.JWTSigningKey, appConfig.AccessTokenTTL)
	userRepository := repositories.NewUserRepository(pool)
	refreshRepository := repositories.NewRefreshSessionRepository(pool)
	authService := services.NewAuthService(userRepository, refreshRepository, tokens, appConfig.RefreshTokenTTL)

	router := httpserver.NewRouter(appConfig, pool, tokens, httpserver.Handlers{
		Auth:           handlers.NewAuthHandler(authService, appConfig.CookieSecure, appConfig.RefreshTokenTTL),
		Cardio:         handlers.NewCardioHandler(repositories.NewCardioRepository(pool)),
		TrainingPlan:   handlers.NewTrainingPlanHandler(repositories.NewTrainingPlanRepository(pool)),
		Muscle:         handlers.NewMuscleHandler(repositories.NewMuscleRepository(pool)),
		Exercise:       handlers.NewExerciseHandler(repositories.NewExerciseRepository(pool)),
		ExerciseSet:    handlers.NewExerciseSetHandler(repositories.NewExerciseSetRepository(pool)),
		WorkoutSession: handlers.NewWorkoutSessionHandler(repositories.NewWorkoutSessionRepository(pool)),
	})

	if err := router.Run(appConfig.HTTPAddr); err != nil {
		log.Fatalf("start server: %v", err)
	}
}
