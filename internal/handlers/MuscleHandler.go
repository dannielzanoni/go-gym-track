package handlers

import (
	"go-gym-track/internal/repositories"
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

type MuscleHandler struct {
	repository *repositories.MuscleRepository
}

func NewMuscleHandler(repository *repositories.MuscleRepository) *MuscleHandler {
	return &MuscleHandler{repository: repository}
}

type createMuscleRequest struct {
	Name string `json:"name" binding:"required"`
}

func (h *MuscleHandler) GetMuscles(c *gin.Context) {
	muscles, err := h.repository.GetAll(c.Request.Context())
	if err != nil {
		log.Printf("get muscles: %v", err)

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "could not get muscles",
		})
		return
	}

	c.JSON(http.StatusOK, muscles)
}

func (h *MuscleHandler) CreateMuscle(c *gin.Context) {
	var request createMuscleRequest

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
	muscle, err := h.repository.Create(
		c.Request.Context(),
		name,
	)
	if err != nil {
		log.Printf("create muscle: %v", err)

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "could not create muscle",
		})
		return
	}

	c.JSON(http.StatusCreated, muscle)
}
