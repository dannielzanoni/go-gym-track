package handlers

import (
	"net/http"

	"go-gym-track/internal/apperror"
	"go-gym-track/internal/middleware"
	"go-gym-track/internal/repositories"

	"github.com/gin-gonic/gin"
)

type ExerciseHandler struct {
	repository *repositories.ExerciseRepository
}

func NewExerciseHandler(repository *repositories.ExerciseRepository) *ExerciseHandler {
	return &ExerciseHandler{repository: repository}
}

type createExerciseRequest struct {
	Name string                        `json:"name" binding:"required"`
	Sets []repositories.NewExerciseSet `json:"sets"`
}

func (h *ExerciseHandler) Create(c *gin.Context) {
	muscleID := c.Param("muscleId")
	if !validID(muscleID) {
		respondError(c, apperror.ErrValidation)
		return
	}
	var request createExerciseRequest
	if !bindJSON(c, &request) {
		return
	}
	exercise, err := h.repository.Create(c.Request.Context(), middleware.UserID(c), muscleID, request.Name, request.Sets)
	if err != nil {
		respondError(c, err)
		return
	}
	respondData(c, http.StatusCreated, exercise)
}

func (h *ExerciseHandler) Update(c *gin.Context) {
	id := c.Param("exerciseId")
	if !validID(id) {
		respondError(c, apperror.ErrValidation)
		return
	}
	var request nameRequest
	if !bindJSON(c, &request) {
		return
	}
	exercise, err := h.repository.Update(c.Request.Context(), middleware.UserID(c), id, request.Name)
	if err != nil {
		respondError(c, err)
		return
	}
	respondData(c, http.StatusOK, exercise)
}

func (h *ExerciseHandler) Delete(c *gin.Context) {
	id := c.Param("exerciseId")
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

func (h *ExerciseHandler) Reorder(c *gin.Context) {
	muscleID := c.Param("muscleId")
	if !validID(muscleID) {
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
	if err := h.repository.Reorder(c.Request.Context(), middleware.UserID(c), muscleID, request.OrderedIDs); err != nil {
		respondError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}
