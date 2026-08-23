package handlers

import (
	"net/http"

	"go-gym-track/internal/apperror"
	"go-gym-track/internal/middleware"
	"go-gym-track/internal/repositories"

	"github.com/gin-gonic/gin"
)

type MuscleHandler struct {
	repository *repositories.MuscleRepository
}

func NewMuscleHandler(repository *repositories.MuscleRepository) *MuscleHandler {
	return &MuscleHandler{repository: repository}
}

type nameRequest struct {
	Name string `json:"name" binding:"required"`
}

type reorderRequest struct {
	OrderedIDs []string `json:"orderedIds" binding:"required"`
}

func (h *MuscleHandler) GetAll(c *gin.Context) {
	muscles, err := h.repository.GetAll(c.Request.Context(), middleware.UserID(c))
	if err != nil {
		respondError(c, err)
		return
	}
	respondData(c, http.StatusOK, muscles)
}

func (h *MuscleHandler) Create(c *gin.Context) {
	var request nameRequest
	if !bindJSON(c, &request) {
		return
	}
	muscle, err := h.repository.Create(c.Request.Context(), middleware.UserID(c), request.Name)
	if err != nil {
		respondError(c, err)
		return
	}
	respondData(c, http.StatusCreated, muscle)
}

func (h *MuscleHandler) Update(c *gin.Context) {
	id := c.Param("muscleId")
	if !validID(id) {
		respondError(c, apperror.ErrValidation)
		return
	}
	var request nameRequest
	if !bindJSON(c, &request) {
		return
	}
	muscle, err := h.repository.Update(c.Request.Context(), middleware.UserID(c), id, request.Name)
	if err != nil {
		respondError(c, err)
		return
	}
	respondData(c, http.StatusOK, muscle)
}

func (h *MuscleHandler) Delete(c *gin.Context) {
	id := c.Param("muscleId")
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

func (h *MuscleHandler) Reorder(c *gin.Context) {
	var request reorderRequest
	if !bindJSON(c, &request) {
		return
	}
	if err := validateOrderedIDs(request.OrderedIDs); err != nil {
		respondError(c, err)
		return
	}
	if err := h.repository.Reorder(c.Request.Context(), middleware.UserID(c), request.OrderedIDs); err != nil {
		respondError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func validateOrderedIDs(ids []string) error {
	seen := make(map[string]struct{}, len(ids))
	for _, id := range ids {
		if !validID(id) {
			return apperror.ErrValidation
		}
		if _, exists := seen[id]; exists {
			return apperror.ErrValidation
		}
		seen[id] = struct{}{}
	}
	return nil
}
