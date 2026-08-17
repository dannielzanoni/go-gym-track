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
	muscleHandler := handlers.NewMuscleHandler(muscleRepository)

	router := gin.Default()

	router.GET("/muscles", muscleHandler.GetMuscles)
	router.POST("/muscles", muscleHandler.CreateMuscle)

	if err := router.Run("localhost:8080"); err != nil {
		log.Fatalf("start server: %v", err)
	}
}
