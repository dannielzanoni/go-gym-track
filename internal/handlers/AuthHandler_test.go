package handlers

import (
	"testing"
	"time"
)

func TestRefreshCookieMaxAge(t *testing.T) {
	ttl := 30 * 24 * time.Hour
	if got := refreshCookieMaxAge(ttl, false); got != 0 {
		t.Fatalf("session cookie max age = %d, want 0", got)
	}
	if got := refreshCookieMaxAge(ttl, true); got != int(ttl.Seconds()) {
		t.Fatalf("persistent cookie max age = %d, want %d", got, int(ttl.Seconds()))
	}
}
