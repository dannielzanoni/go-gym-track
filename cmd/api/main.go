package main

import (
	"go-gym-track/internal/handlers"

	"github.com/gin-gonic/gin"
)

func main() {
	router := gin.Default()

	router.GET("/muscles", handlers.GetMuscles)
	router.POST("/muscles", handlers.CreateMuscle)

	router.Run("localhost:8080")
}
