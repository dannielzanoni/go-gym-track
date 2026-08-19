package handlers

import (
	"errors"
	"log"
	"net/http"

	"go-gym-track/internal/repositories"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
)

type WorkoutSetHandler struct {
	repository *repositories.WorkoutSetRepository
}

func NewWorkoutSetHandler(repository *repositories.WorkoutSetRepository) *WorkoutSetHandler {
	return &WorkoutSetHandler{repository: repository}
}

type workoutSetIDParams struct {
	ID string `uri:"id" binding:"required,uuid"`
}

type createWorkoutSetRequest struct {
	WorkoutID string  `json:"workoutId" binding:"required,uuid"`
	Done      bool    `json:"done"`
	Reps      int     `json:"reps"`
	Weight    float64 `json:"weight"`
}

func (h *WorkoutSetHandler) GetWorkoutSets(c *gin.Context) {
	workoutSets, err := h.repository.GetAll(c.Request.Context())
	if err != nil {
		log.Printf("get workout sets: %v", err)

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "could not fetch workout sets",
		})
		return
	}

	c.JSON(http.StatusOK, workoutSets)
}

func (h *WorkoutSetHandler) GetWorkoutSetByID(c *gin.Context) {
	var params workoutSetIDParams

	if err := c.ShouldBindUri(&params); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "id must be a valid UUID",
		})
		return
	}

	workoutSet, err := h.repository.GetByID(
		c.Request.Context(),
		params.ID,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "workout set not found",
			})
			return
		}

		log.Printf("get workout set by id: %v", err)

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "could not fetch workout set",
		})
		return
	}

	c.JSON(http.StatusOK, workoutSet)
}

func (h *WorkoutSetHandler) CreateWorkoutSet(c *gin.Context) {
	var request createWorkoutSetRequest

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "workoutId must be a valid UUID",
		})
		return
	}

	workoutSet, err := h.repository.Create(
		c.Request.Context(),
		request.WorkoutID,
		request.Done,
		request.Reps,
		request.Weight,
	)
	if err != nil {
		log.Printf("create workout set: %v", err)

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "could not create workout set",
		})
		return
	}

	c.JSON(http.StatusCreated, workoutSet)
}
