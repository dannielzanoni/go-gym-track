package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"go-gym-track/internal/auth"

	"github.com/gin-gonic/gin"
)

func TestAuthenticate(t *testing.T) {
	gin.SetMode(gin.TestMode)
	tokens := auth.NewTokenService("test-issuer", "test-audience", "0123456789abcdef0123456789abcdef", time.Minute)
	accessToken, _, err := tokens.IssueAccessToken("user-id")
	if err != nil {
		t.Fatalf("IssueAccessToken() error = %v", err)
	}

	tests := []struct {
		name       string
		header     string
		wantStatus int
	}{
		{name: "valid bearer", header: "Bearer " + accessToken, wantStatus: http.StatusOK},
		{name: "missing bearer", wantStatus: http.StatusUnauthorized},
		{name: "invalid bearer", header: "Bearer invalid", wantStatus: http.StatusUnauthorized},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			router := gin.New()
			router.Use(Authenticate(tokens))
			router.GET("/protected", func(c *gin.Context) {
				if UserID(c) != "user-id" {
					c.Status(http.StatusInternalServerError)
					return
				}
				c.Status(http.StatusOK)
			})

			request := httptest.NewRequest(http.MethodGet, "/protected", nil)
			request.Header.Set("Authorization", test.header)
			response := httptest.NewRecorder()
			router.ServeHTTP(response, request)
			if response.Code != test.wantStatus {
				t.Fatalf("status = %d, want %d", response.Code, test.wantStatus)
			}
		})
	}
}
