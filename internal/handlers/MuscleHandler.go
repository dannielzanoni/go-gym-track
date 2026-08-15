package handlers

import (
	"go-gym-track/internal/models"
	"net/http"

	"github.com/gin-gonic/gin"
)

func GetMuscles(c *gin.Context) {
	c.JSON(http.StatusOK, models.Muscles)
}

func CreateMuscle(c *gin.Context) {
	var newMuscle models.Muscle

	if err := c.ShouldBindJSON(&newMuscle); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	models.Muscles = append(models.Muscles, newMuscle)

	c.JSON(http.StatusCreated, newMuscle)
}
