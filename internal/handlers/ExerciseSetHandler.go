package handlers

import (
	"net/http"
	"strconv"
	"time"

	"go-gym-track/internal/apperror"
	"go-gym-track/internal/middleware"
	"go-gym-track/internal/repositories"

	"github.com/gin-gonic/gin"
)

type ExerciseSetHandler struct {
	repository *repositories.ExerciseSetRepository
}

func NewExerciseSetHandler(repository *repositories.ExerciseSetRepository) *ExerciseSetHandler {
	return &ExerciseSetHandler{repository: repository}
}

type exerciseSetRequest struct {
	TargetReps   int     `json:"targetReps" binding:"min=0"`
	TargetWeight float64 `json:"targetWeight" binding:"min=0"`
}

func (h *ExerciseSetHandler) Create(c *gin.Context) {
	exerciseID := c.Param("exerciseId")
	if !validID(exerciseID) {
		respondError(c, apperror.ErrValidation)
		return
	}
	var request exerciseSetRequest
	if !bindJSON(c, &request) {
		return
	}
	set, err := h.repository.Create(c.Request.Context(), middleware.UserID(c), exerciseID, request.TargetReps, request.TargetWeight)
	if err != nil {
		respondError(c, err)
		return
	}
	respondData(c, http.StatusCreated, set)
}

func (h *ExerciseSetHandler) Update(c *gin.Context) {
	id := c.Param("setId")
	if !validID(id) {
		respondError(c, apperror.ErrValidation)
		return
	}
	var request exerciseSetRequest
	if !bindJSON(c, &request) {
		return
	}
	set, err := h.repository.Update(c.Request.Context(), middleware.UserID(c), id, request.TargetReps, request.TargetWeight)
	if err != nil {
		respondError(c, err)
		return
	}
	respondData(c, http.StatusOK, set)
}

func (h *ExerciseSetHandler) Delete(c *gin.Context) {
	id := c.Param("setId")
	if !validID(id) {
		respondError(c, apperror.ErrValidation)
		return
	}
	if err := h.repository.Delete(c.Request.Context(), middleware.UserID(c), id); err != nil {
		respondError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *ExerciseSetHandler) Reorder(c *gin.Context) {
	exerciseID := c.Param("exerciseId")
	if !validID(exerciseID) {
		respondError(c, apperror.ErrValidation)
		return
	}
	var request reorderRequest
	if !bindJSON(c, &request) {
		return
	}
	if err := validateOrderedIDs(request.OrderedIDs); err != nil {
		respondError(c, err)
		return
	}
	if err := h.repository.Reorder(c.Request.Context(), middleware.UserID(c), exerciseID, request.OrderedIDs); err != nil {
		respondError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *ExerciseSetHandler) History(c *gin.Context) {
	setID := c.Param("setId")
	if !validID(setID) {
		respondError(c, apperror.ErrValidation)
		return
	}
	limit := queryLimit(c, 20, 100)
	before, ok := queryTime(c, "cursor")
	if !ok {
		return
	}
	history, err := h.repository.History(c.Request.Context(), middleware.UserID(c), setID, before, limit+1)
	if err != nil {
		respondError(c, err)
		return
	}
	var nextCursor *string
	if len(history) > limit {
		value := history[limit-1].Date.Format(time.RFC3339Nano)
		nextCursor = &value
		history = history[:limit]
	}
	respondData(c, http.StatusOK, gin.H{"items": history, "nextCursor": nextCursor})
}

func queryLimit(c *gin.Context, fallback, maximum int) int {
	value, err := strconv.Atoi(c.Query("limit"))
	if err != nil || value <= 0 {
		return fallback
	}
	return min(value, maximum)
}

func queryTime(c *gin.Context, name string) (*time.Time, bool) {
	value := c.Query(name)
	if value == "" {
		return nil, true
	}
	parsed, err := time.Parse(time.RFC3339Nano, value)
	if err != nil {
		respondError(c, apperror.ErrValidation)
		return nil, false
	}
	return &parsed, true
}
