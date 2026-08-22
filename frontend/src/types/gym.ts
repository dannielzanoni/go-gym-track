export type SetHistory = {
  date: string
  reps: number
  weight: number
}

export type ExerciseSet = {
  id: string
  reps: number
  weight: number
  completed: boolean
  history: SetHistory[]
}

export type Exercise = {
  id: string
  name: string
  sets: ExerciseSet[]
}

export type Muscle = {
  id: string
  name: string
  lastWorkoutAt: string | null
  exercises: Exercise[]
}

export type WorkoutSet = {
  exerciseId: string
  exerciseName: string
  setId: string
  setNumber: number
  reps: number
  weight: number
}

export type Workout = {
  id: string
  muscleId: string
  muscleName: string
  completedAt: string
  sets: WorkoutSet[]
}

export type GymState = {
  version: 1
  muscles: Muscle[]
  workouts: Workout[]
}
