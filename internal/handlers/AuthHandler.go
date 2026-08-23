package handlers

import (
	"net/http"
	"time"

	"go-gym-track/internal/middleware"
	"go-gym-track/internal/services"

	"github.com/gin-gonic/gin"
)

const refreshCookieName = "gymtrack_refresh"

type AuthHandler struct {
	service      *services.AuthService
	cookieSecure bool
	refreshTTL   time.Duration
}

func NewAuthHandler(service *services.AuthService, cookieSecure bool, refreshTTL time.Duration) *AuthHandler {
	return &AuthHandler{service: service, cookieSecure: cookieSecure, refreshTTL: refreshTTL}
}

type registerRequest struct {
	Email       string `json:"email" binding:"required"`
	DisplayName string `json:"displayName" binding:"required"`
	Password    string `json:"password" binding:"required"`
}

type loginRequest struct {
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
}

func (h *AuthHandler) Register(c *gin.Context) {
	var request registerRequest
	if !bindJSON(c, &request) {
		return
	}
	result, err := h.service.Register(c.Request.Context(), request.Email, request.DisplayName, request.Password)
	if err != nil {
		respondError(c, err)
		return
	}
	h.setRefreshCookie(c, result.RefreshToken)
	c.Header("Cache-Control", "no-store")
	respondData(c, http.StatusCreated, authResponse(result))
}

func (h *AuthHandler) Login(c *gin.Context) {
	var request loginRequest
	if !bindJSON(c, &request) {
		return
	}
	result, err := h.service.Login(c.Request.Context(), request.Email, request.Password)
	if err != nil {
		respondError(c, err)
		return
	}
	h.setRefreshCookie(c, result.RefreshToken)
	c.Header("Cache-Control", "no-store")
	respondData(c, http.StatusOK, authResponse(result))
}

func (h *AuthHandler) Refresh(c *gin.Context) {
	refreshToken, _ := c.Cookie(refreshCookieName)
	result, err := h.service.Refresh(c.Request.Context(), refreshToken)
	if err != nil {
		h.clearRefreshCookie(c)
		respondError(c, err)
		return
	}
	h.setRefreshCookie(c, result.RefreshToken)
	c.Header("Cache-Control", "no-store")
	respondData(c, http.StatusOK, authResponse(result))
}

func (h *AuthHandler) Logout(c *gin.Context) {
	refreshToken, _ := c.Cookie(refreshCookieName)
	if err := h.service.Logout(c.Request.Context(), refreshToken); err != nil {
		respondError(c, err)
		return
	}
	h.clearRefreshCookie(c)
	c.Status(http.StatusNoContent)
}

func (h *AuthHandler) Me(c *gin.Context) {
	user, err := h.service.Me(c.Request.Context(), middleware.UserID(c))
	if err != nil {
		respondError(c, err)
		return
	}
	respondData(c, http.StatusOK, user)
}

func (h *AuthHandler) setRefreshCookie(c *gin.Context, token string) {
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(refreshCookieName, token, int(h.refreshTTL.Seconds()), "/api/v1/auth", "", h.cookieSecure, true)
}

func (h *AuthHandler) clearRefreshCookie(c *gin.Context) {
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(refreshCookieName, "", -1, "/api/v1/auth", "", h.cookieSecure, true)
}

func authResponse(result services.AuthResult) gin.H {
	expiresIn := max(0, int(time.Until(result.AccessExpiresAt).Seconds()))
	return gin.H{"user": result.User, "accessToken": result.AccessToken, "expiresIn": expiresIn}
}
