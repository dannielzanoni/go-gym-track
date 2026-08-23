package handlers

import (
	"net/http"

	"go-gym-track/internal/middleware"
	"go-gym-track/internal/repositories"

	"github.com/gin-gonic/gin"
)

type TrainingPlanHandler struct {
	repository *repositories.TrainingPlanRepository
}

func NewTrainingPlanHandler(repository *repositories.TrainingPlanRepository) *TrainingPlanHandler {
	return &TrainingPlanHandler{repository: repository}
}

func (h *TrainingPlanHandler) Get(c *gin.Context) {
	plan, err := h.repository.Get(c.Request.Context(), middleware.UserID(c))
	if err != nil {
		respondError(c, err)
		return
	}
	respondData(c, http.StatusOK, plan)
}
