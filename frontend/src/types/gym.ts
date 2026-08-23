export type SetHistory = {
  date: string
  reps: number
  weight: number
}

export type ExerciseSet = {
  id: string
  position: number
  reps: number
  weight: number
  completed: boolean
  history: SetHistory[]
}

export type Exercise = {
  id: string
  name: string
  position: number
  sets: ExerciseSet[]
}

export type Muscle = {
  id: string
  name: string
  position: number
  lastWorkoutAt: string | null
  exercises: Exercise[]
}

export type WorkoutSessionSet = {
  id: string
  exerciseId: string | null
  exerciseSetId: string | null
  exerciseName: string
  exercisePosition: number
  setNumber: number
  reps: number
  weight: number
  completed: boolean
  completedAt: string | null
}

export type WorkoutSession = {
  id: string
  muscleId: string | null
  muscleName: string
  status: "active" | "completed" | "cancelled"
  startedAt: string
  completedAt: string | null
  sets: WorkoutSessionSet[]
}
