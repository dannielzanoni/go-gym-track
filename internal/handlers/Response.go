package handlers

import (
	"errors"
	"log"
	"net/http"
	"strings"

	"go-gym-track/internal/apperror"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func respondData(c *gin.Context, status int, data any) {
	c.JSON(status, gin.H{"data": data})
}

func respondError(c *gin.Context, err error) {
	status := http.StatusInternalServerError
	code := "internal_error"
	message := "an unexpected error occurred"

	switch {
	case errors.Is(err, apperror.ErrValidation):
		status, code, message = http.StatusBadRequest, "validation_error", publicMessage(err, apperror.ErrValidation)
	case errors.Is(err, apperror.ErrUnauthorized):
		status, code, message = http.StatusUnauthorized, "invalid_credentials", "invalid email, password, or session"
	case errors.Is(err, apperror.ErrForbidden):
		status, code, message = http.StatusForbidden, "forbidden", "operation is not allowed"
	case errors.Is(err, apperror.ErrNotFound):
		status, code, message = http.StatusNotFound, "not_found", "resource not found"
	case errors.Is(err, apperror.ErrConflict):
		status, code, message = http.StatusConflict, "conflict", publicMessage(err, apperror.ErrConflict)
	case errors.Is(err, apperror.ErrBusinessRule):
		status, code, message = http.StatusUnprocessableEntity, "business_rule", publicMessage(err, apperror.ErrBusinessRule)
	default:
		log.Printf("request failed: %v", err)
	}

	c.JSON(status, gin.H{"error": gin.H{"code": code, "message": message}})
}

func publicMessage(err, marker error) string {
	message := strings.TrimSpace(strings.TrimPrefix(err.Error(), marker.Error()+":"))
	if message == "" || message == err.Error() {
		return marker.Error()
	}
	return message
}

func bindJSON(c *gin.Context, destination any) bool {
	if err := c.ShouldBindJSON(destination); err != nil {
		respondError(c, apperror.ErrValidation)
		return false
	}
	return true
}

func validID(value string) bool {
	_, err := uuid.Parse(value)
	return err == nil
}
