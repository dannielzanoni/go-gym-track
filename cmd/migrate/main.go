package main

import (
	"context"
	"log"
	"time"

	"go-gym-track/internal/config"
	"go-gym-track/internal/database"
	"go-gym-track/migrations"
)

func main() {
	databaseURL, err := config.DatabaseURL()
	if err != nil {
		log.Fatal(err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	pool, err := database.NewPostgresPool(ctx, databaseURL)
	if err != nil {
		log.Fatal(err)
	}
	defer pool.Close()

	if err := database.RunMigrations(ctx, pool, migrations.Files); err != nil {
		log.Fatal(err)
	}

	log.Print("migrations applied")
}
