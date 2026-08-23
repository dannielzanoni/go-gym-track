package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

type rateEntry struct {
	count     int
	windowEnd time.Time
}

func RateLimit(maxRequests int, window time.Duration) gin.HandlerFunc {
	var mutex sync.Mutex
	entries := make(map[string]rateEntry)

	return func(c *gin.Context) {
		now := time.Now()
		key := c.ClientIP()

		mutex.Lock()
		entry := entries[key]
		if entry.windowEnd.Before(now) {
			entry = rateEntry{windowEnd: now.Add(window)}
		}
		entry.count++
		entries[key] = entry
		allowed := entry.count <= maxRequests
		if len(entries) > 10_000 {
			for currentKey, current := range entries {
				if current.windowEnd.Before(now) {
					delete(entries, currentKey)
				}
			}
		}
		mutex.Unlock()

		if !allowed {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error": gin.H{
					"code":    "rate_limited",
					"message": "too many requests; try again later",
				},
			})
			return
		}
		c.Next()
	}
}
