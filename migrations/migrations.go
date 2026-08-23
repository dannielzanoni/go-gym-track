package migrations

import "embed"

// Files contains the SQL migrations shipped with the API binary.
//
//go:embed *.sql
var Files embed.FS
