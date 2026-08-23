package httpserver

import (
	"net/http"
	"time"

	"go-gym-track/internal/auth"
	"go-gym-track/internal/config"
	"go-gym-track/internal/handlers"
	"go-gym-track/internal/middleware"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Handlers struct {
	Auth           *handlers.AuthHandler
	TrainingPlan   *handlers.TrainingPlanHandler
	Muscle         *handlers.MuscleHandler
	Exercise       *handlers.ExerciseHandler
	ExerciseSet    *handlers.ExerciseSetHandler
	WorkoutSession *handlers.WorkoutSessionHandler
}

func NewRouter(appConfig config.Config, pool *pgxpool.Pool, tokens *auth.TokenService, h Handlers) *gin.Engine {
	router := gin.New()
	router.Use(gin.Logger(), gin.Recovery())
	router.Use(func(c *gin.Context) {
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 1<<20)
		c.Next()
	})
	router.Use(cors.New(cors.Config{
		AllowOrigins:     appConfig.AllowedOrigins,
		AllowMethods:     []string{http.MethodGet, http.MethodPost, http.MethodPatch, http.MethodDelete, http.MethodOptions},
		AllowHeaders:     []string{"Authorization", "Content-Type"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))
	router.Use(func(c *gin.Context) {
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("Referrer-Policy", "no-referrer")
		c.Next()
	})

	router.GET("/healthz", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"status": "ok"}) })
	router.GET("/readyz", func(c *gin.Context) {
		if err := pool.Ping(c.Request.Context()); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"status": "unavailable"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "ready"})
	})

	api := router.Group("/api/v1")
	authRateLimit := middleware.RateLimit(20, time.Minute)
	api.POST("/auth/register", authRateLimit, h.Auth.Register)
	api.POST("/auth/login", authRateLimit, h.Auth.Login)
	api.POST("/auth/refresh", authRateLimit, h.Auth.Refresh)
	api.POST("/auth/logout", h.Auth.Logout)

	protected := api.Group("")
	protected.Use(middleware.Authenticate(tokens))
	protected.GET("/auth/me", h.Auth.Me)
	protected.GET("/training-plan", h.TrainingPlan.Get)
	protected.GET("/muscles", h.Muscle.GetAll)
	protected.POST("/muscles", h.Muscle.Create)
	protected.PATCH("/muscles/reorder", h.Muscle.Reorder)
	protected.PATCH("/muscles/:muscleId", h.Muscle.Update)
	protected.DELETE("/muscles/:muscleId", h.Muscle.Delete)
	protected.POST("/muscles/:muscleId/exercises", h.Exercise.Create)
	protected.PATCH("/muscles/:muscleId/exercises/reorder", h.Exercise.Reorder)
	protected.PATCH("/exercises/:exerciseId", h.Exercise.Update)
	protected.DELETE("/exercises/:exerciseId", h.Exercise.Delete)
	protected.POST("/exercises/:exerciseId/sets", h.ExerciseSet.Create)
	protected.PATCH("/exercises/:exerciseId/sets/reorder", h.ExerciseSet.Reorder)
	protected.PATCH("/exercise-sets/:setId", h.ExerciseSet.Update)
	protected.DELETE("/exercise-sets/:setId", h.ExerciseSet.Delete)
	protected.GET("/exercise-sets/:setId/history", h.ExerciseSet.History)
	protected.POST("/workout-sessions", h.WorkoutSession.Start)
	protected.GET("/workout-sessions/active", h.WorkoutSession.GetActive)
	protected.GET("/workout-sessions", h.WorkoutSession.List)
	protected.GET("/workout-sessions/:sessionId", h.WorkoutSession.Get)
	protected.PATCH("/workout-sessions/:sessionId/sets/:sessionSetId", h.WorkoutSession.UpdateSet)
	protected.POST("/workout-sessions/:sessionId/complete", h.WorkoutSession.Complete)
	protected.DELETE("/workout-sessions/:sessionId", h.WorkoutSession.Cancel)

	return router
}
