package handlers

import (
	"net/http"
	"time"
	_ "time/tzdata"

	"go-gym-track/internal/apperror"
	"go-gym-track/internal/middleware"
	"go-gym-track/internal/repositories"

	"github.com/gin-gonic/gin"
)

type CardioHandler struct {
	repository *repositories.CardioRepository
}

func NewCardioHandler(repository *repositories.CardioRepository) *CardioHandler {
	return &CardioHandler{repository: repository}
}

type createCardioRecordRequest struct {
	ActivityType    string    `json:"activityType" binding:"required,oneof=treadmill bike football"`
	DurationMinutes int       `json:"durationMinutes" binding:"required,min=1"`
	DistanceKM      float64   `json:"distanceKm" binding:"min=0"`
	Calories        int       `json:"calories" binding:"min=0"`
	OccurredAt      time.Time `json:"occurredAt" binding:"required"`
}

func (h *CardioHandler) Create(c *gin.Context) {
	var request createCardioRecordRequest
	if !bindJSON(c, &request) {
		return
	}
	record, err := h.repository.Create(
		c.Request.Context(),
		middleware.UserID(c),
		request.ActivityType,
		request.DurationMinutes,
		request.DistanceKM,
		request.Calories,
		request.OccurredAt,
	)
	if err != nil {
		respondError(c, err)
		return
	}
	respondData(c, http.StatusCreated, record)
}

func (h *CardioHandler) List(c *gin.Context) {
	from, ok := queryTime(c, "from")
	if !ok {
		return
	}
	to, ok := queryTime(c, "to")
	if !ok {
		return
	}
	limit := queryLimit(c, 100, 500)
	records, err := h.repository.List(c.Request.Context(), middleware.UserID(c), from, to, limit)
	if err != nil {
		respondError(c, err)
		return
	}
	respondData(c, http.StatusOK, records)
}

func (h *CardioHandler) Weekly(c *gin.Context) {
	timezone := c.DefaultQuery("timezone", "America/Sao_Paulo")
	if len(timezone) > 64 {
		respondError(c, apperror.ErrValidation)
		return
	}
	location, err := time.LoadLocation(timezone)
	if err != nil {
		respondError(c, apperror.ErrValidation)
		return
	}

	reference := time.Now().In(location)
	if value := c.Query("date"); value != "" {
		reference, err = time.ParseInLocation("2006-01-02", value, location)
		if err != nil {
			respondError(c, apperror.ErrValidation)
			return
		}
	}
	weekStart, weekEnd := cardioWeekBounds(reference)
	summary, err := h.repository.WeeklySummary(
		c.Request.Context(),
		middleware.UserID(c),
		weekStart,
		weekEnd,
		timezone,
	)
	if err != nil {
		respondError(c, err)
		return
	}
	respondData(c, http.StatusOK, summary)
}

func cardioWeekBounds(reference time.Time) (time.Time, time.Time) {
	daysSinceMonday := (int(reference.Weekday()) + 6) % 7
	weekStart := time.Date(reference.Year(), reference.Month(), reference.Day()-daysSinceMonday, 0, 0, 0, 0, reference.Location())
	return weekStart, weekStart.AddDate(0, 0, 7)
}
