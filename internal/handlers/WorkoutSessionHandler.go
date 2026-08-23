package handlers

import (
	"errors"
	"net/http"
	"time"

	"go-gym-track/internal/apperror"
	"go-gym-track/internal/middleware"
	"go-gym-track/internal/repositories"

	"github.com/gin-gonic/gin"
)

type WorkoutSessionHandler struct {
	repository *repositories.WorkoutSessionRepository
}

func NewWorkoutSessionHandler(repository *repositories.WorkoutSessionRepository) *WorkoutSessionHandler {
	return &WorkoutSessionHandler{repository: repository}
}

type startWorkoutSessionRequest struct {
	MuscleID string `json:"muscleId" binding:"required"`
}

type updateSessionSetRequest struct {
	Reps      *int     `json:"reps" binding:"omitempty,min=0"`
	Weight    *float64 `json:"weight" binding:"omitempty,min=0"`
	Completed *bool    `json:"completed"`
}

func (h *WorkoutSessionHandler) Start(c *gin.Context) {
	var request startWorkoutSessionRequest
	if !bindJSON(c, &request) {
		return
	}
	if !validID(request.MuscleID) {
		respondError(c, apperror.ErrValidation)
		return
	}
	session, err := h.repository.Start(c.Request.Context(), middleware.UserID(c), request.MuscleID)
	if err != nil {
		respondError(c, err)
		return
	}
	respondData(c, http.StatusCreated, session)
}

func (h *WorkoutSessionHandler) GetActive(c *gin.Context) {
	muscleID := c.Query("muscleId")
	if !validID(muscleID) {
		respondError(c, apperror.ErrValidation)
		return
	}
	session, err := h.repository.GetActive(c.Request.Context(), middleware.UserID(c), muscleID)
	if err != nil {
		if errors.Is(err, apperror.ErrNotFound) {
			respondData(c, http.StatusOK, nil)
			return
		}
		respondError(c, err)
		return
	}
	respondData(c, http.StatusOK, session)
}

func (h *WorkoutSessionHandler) Get(c *gin.Context) {
	sessionID := c.Param("sessionId")
	if !validID(sessionID) {
		respondError(c, apperror.ErrValidation)
		return
	}
	session, err := h.repository.GetByID(c.Request.Context(), middleware.UserID(c), sessionID)
	if err != nil {
		respondError(c, err)
		return
	}
	respondData(c, http.StatusOK, session)
}

func (h *WorkoutSessionHandler) UpdateSet(c *gin.Context) {
	sessionID := c.Param("sessionId")
	setID := c.Param("sessionSetId")
	if !validID(sessionID) || !validID(setID) {
		respondError(c, apperror.ErrValidation)
		return
	}
	var request updateSessionSetRequest
	if !bindJSON(c, &request) {
		return
	}
	if request.Reps == nil && request.Weight == nil && request.Completed == nil {
		respondError(c, apperror.ErrValidation)
		return
	}
	set, err := h.repository.UpdateSet(c.Request.Context(), middleware.UserID(c), sessionID, setID, repositories.UpdateSessionSet(request))
	if err != nil {
		respondError(c, err)
		return
	}
	respondData(c, http.StatusOK, set)
}

func (h *WorkoutSessionHandler) Complete(c *gin.Context) {
	sessionID := c.Param("sessionId")
	if !validID(sessionID) {
		respondError(c, apperror.ErrValidation)
		return
	}
	session, err := h.repository.Complete(c.Request.Context(), middleware.UserID(c), sessionID)
	if err != nil {
		respondError(c, err)
		return
	}
	respondData(c, http.StatusOK, session)
}

func (h *WorkoutSessionHandler) Cancel(c *gin.Context) {
	sessionID := c.Param("sessionId")
	if !validID(sessionID) {
		respondError(c, apperror.ErrValidation)
		return
	}
	if err := h.repository.Cancel(c.Request.Context(), middleware.UserID(c), sessionID); err != nil {
		respondError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *WorkoutSessionHandler) List(c *gin.Context) {
	var muscleID *string
	if value := c.Query("muscleId"); value != "" {
		if !validID(value) {
			respondError(c, apperror.ErrValidation)
			return
		}
		muscleID = &value
	}
	before, ok := queryTime(c, "cursor")
	if !ok {
		return
	}
	limit := queryLimit(c, 20, 100)
	items, err := h.repository.List(c.Request.Context(), middleware.UserID(c), muscleID, before, limit+1)
	if err != nil {
		respondError(c, err)
		return
	}
	var nextCursor *string
	if len(items) > limit {
		value := items[limit-1].CompletedAt.Format(time.RFC3339Nano)
		nextCursor = &value
		items = items[:limit]
	}
	respondData(c, http.StatusOK, gin.H{"items": items, "nextCursor": nextCursor})
}
