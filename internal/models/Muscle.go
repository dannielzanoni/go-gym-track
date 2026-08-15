package models

import "time"

type Muscle struct {
	ID       string    `json:"id"`
	Name     string    `json:"name"`
	Workouts []Workout `json:"workouts"`
}

type Workout struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Sets []Set  `json:"sets"`
}

type Set struct {
	ID                   string                 `json:"id"`
	Done                 bool                   `json:"done"`
	Reps                 int                    `json:"rep"`
	Weight               float64                `json:"weight"`
	HistoryRepsAndWeight []HistoryRepsAndWeight `json:"historyRepsAndWeights"`
}

type HistoryRepsAndWeight struct {
	ID     string    `json:"id"`
	IdSet  string    `json:"idSet"`
	Date   time.Time `json:"date"`
	Reps   int       `json:"reps"`
	Weight float64   `json:"weight"`
}

var Muscles = []Muscle{}
