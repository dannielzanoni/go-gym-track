package auth

import (
	"strings"
	"testing"
)

func TestPasswordHasherHashAndVerify(t *testing.T) {
	hasher := PasswordHasher{}
	encoded, err := hasher.Hash("correct horse battery staple")
	if err != nil {
		t.Fatalf("Hash() error = %v", err)
	}
	if !strings.HasPrefix(encoded, "$argon2id$") {
		t.Fatalf("Hash() = %q, expected Argon2id encoding", encoded)
	}

	valid, err := hasher.Verify("correct horse battery staple", encoded)
	if err != nil {
		t.Fatalf("Verify(correct) error = %v", err)
	}
	if !valid {
		t.Fatal("Verify(correct) = false")
	}

	valid, err = hasher.Verify("wrong password", encoded)
	if err != nil {
		t.Fatalf("Verify(wrong) error = %v", err)
	}
	if valid {
		t.Fatal("Verify(wrong) = true")
	}
}

func TestPasswordHasherRejectsMalformedEncoding(t *testing.T) {
	valid, err := (PasswordHasher{}).Verify("password", "$argon2id$invalid")
	if err == nil || valid {
		t.Fatalf("Verify(malformed) = (%v, %v), expected false and error", valid, err)
	}
}
