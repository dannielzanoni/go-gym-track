package handlers

import (
	"testing"
	"time"
)

func TestCardioWeekBounds(t *testing.T) {
	location, err := time.LoadLocation("America/Sao_Paulo")
	if err != nil {
		t.Fatal(err)
	}

	tests := []struct {
		name      string
		reference string
		wantStart string
		wantEnd   string
	}{
		{name: "monday", reference: "2026-08-24", wantStart: "2026-08-24", wantEnd: "2026-08-31"},
		{name: "friday", reference: "2026-08-28", wantStart: "2026-08-24", wantEnd: "2026-08-31"},
		{name: "sunday", reference: "2026-08-30", wantStart: "2026-08-24", wantEnd: "2026-08-31"},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			reference, err := time.ParseInLocation("2006-01-02", test.reference, location)
			if err != nil {
				t.Fatal(err)
			}
			start, end := cardioWeekBounds(reference)
			if got := start.Format("2006-01-02"); got != test.wantStart {
				t.Fatalf("start = %s, want %s", got, test.wantStart)
			}
			if got := end.Format("2006-01-02"); got != test.wantEnd {
				t.Fatalf("end = %s, want %s", got, test.wantEnd)
			}
		})
	}
}
