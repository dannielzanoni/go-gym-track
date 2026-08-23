package services

import "testing"

func TestValidateRegistration(t *testing.T) {
	tests := []struct {
		name        string
		email       string
		displayName string
		password    string
		wantError   bool
	}{
		{name: "valid", email: "user@example.com", displayName: "Daniel", password: "password-123", wantError: false},
		{name: "invalid email", email: "not-an-email", displayName: "Daniel", password: "password-123", wantError: true},
		{name: "short name", email: "user@example.com", displayName: "D", password: "password-123", wantError: true},
		{name: "short password", email: "user@example.com", displayName: "Daniel", password: "short", wantError: true},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			err := validateRegistration(test.email, test.displayName, test.password)
			if (err != nil) != test.wantError {
				t.Fatalf("validateRegistration() error = %v, wantError = %v", err, test.wantError)
			}
		})
	}
}
