package handlers

import (
	"go-gym-track/internal/repositories"
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

type WorkoutHandler struct {
	repository *repositories.WorkoutRepository
}

func NewWorkoutHandler(repository *repositories.WorkoutRepository) *WorkoutHandler {
	return &WorkoutHandler{repository: repository}
}

type createWorkoutRequest struct {
	MuscleID string `json:"muscleId" binding:"required,uuid"`
	Name     string `json:"name" binding:"required"`
}

func (h *WorkoutHandler) GetWorkouts(c *gin.Context) {
	workouts, err := h.repository.GetAll(c.Request.Context())
	if err != nil {
		log.Printf("get workouts: %v", err)

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "could not fetch workouts",
		})
		return
	}

	c.JSON(http.StatusOK, workouts)
}

func (h *WorkoutHandler) CreateWorkout(c *gin.Context) {
	var request createWorkoutRequest

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "name is required",
		})
		return
	}

	name := strings.TrimSpace(request.Name)
	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "name cannot be empty",
		})
		return
	}
	workout, err := h.repository.Create(
		c.Request.Context(),
		request.MuscleID,
		name,
	)
	if err != nil {
		log.Printf("create workout: %v", err)

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "could not create workout",
		})
		return
	}

	c.JSON(http.StatusCreated, workout)
}
