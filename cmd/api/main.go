package main

import (
	"context"
	"log"
	"os"
	"time"

	"go-gym-track/internal/database"
	"go-gym-track/internal/handlers"
	"go-gym-track/internal/repositories"

	"github.com/gin-gonic/gin"
)

func main() {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		log.Fatal("DATABASE_URL is required")
	}

	initContext, cancel := context.WithTimeout(
		context.Background(),
		10*time.Second,
	)

	pool, err := database.NewPostgresPool(
		initContext,
		databaseURL,
	)

	cancel()

	if err != nil {
		log.Fatal(err)
	}

	defer pool.Close()

	muscleRepository := repositories.NewMuscleRepository(pool)
	workoutRepository := repositories.NewWorkoutRepository(pool)
	workoutSetRepository := repositories.NewWorkoutSetRepository(pool)

	muscleHandler := handlers.NewMuscleHandler(muscleRepository)
	workoutHandler := handlers.NewWorkoutHandler(workoutRepository)
	workoutSetHandler := handlers.NewWorkoutSetHandler(workoutSetRepository)

	router := gin.Default()

	router.GET("/muscles", muscleHandler.GetMuscles)
	router.POST("/muscle", muscleHandler.CreateMuscle)

	router.GET("/workouts", workoutHandler.GetWorkouts)
	router.POST("/workout", workoutHandler.CreateWorkout)

	router.GET("/workout_sets", workoutSetHandler.GetWorkoutSets)
	router.GET("/workout_set/:id", workoutSetHandler.GetWorkoutSetByID)
	router.POST("/workout_set", workoutSetHandler.CreateWorkoutSet)

	if err := router.Run("localhost:8080"); err != nil {
		log.Fatalf("start server: %v", err)
	}
}
