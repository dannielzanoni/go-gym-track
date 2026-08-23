package middleware

import (
	"net/http"
	"strings"

	"go-gym-track/internal/auth"

	"github.com/gin-gonic/gin"
)

const userIDKey = "authenticatedUserID"

func Authenticate(tokens *auth.TokenService) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := strings.TrimSpace(c.GetHeader("Authorization"))
		parts := strings.SplitN(header, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") || strings.TrimSpace(parts[1]) == "" {
			abortUnauthorized(c)
			return
		}

		userID, err := tokens.ParseAccessToken(strings.TrimSpace(parts[1]))
		if err != nil {
			abortUnauthorized(c)
			return
		}
		c.Set(userIDKey, userID)
		c.Next()
	}
}

func UserID(c *gin.Context) string {
	value, _ := c.Get(userIDKey)
	userID, _ := value.(string)
	return userID
}

func abortUnauthorized(c *gin.Context) {
	c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
		"error": gin.H{
			"code":    "unauthorized",
			"message": "authentication is required",
		},
	})
}
