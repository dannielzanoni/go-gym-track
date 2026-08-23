export type SetHistoryDTO = {
  date: string
  reps: number
  weight: number
}

export type ExerciseSetDTO = {
  id: string
  exerciseId?: string
  position: number
  targetReps: number
  targetWeight: number
  history: SetHistoryDTO[]
}

export type ExerciseDTO = {
  id: string
  muscleId?: string
  name: string
  position: number
  sets: ExerciseSetDTO[]
}

export type MuscleDTO = {
  id: string
  name: string
  position: number
  lastWorkoutAt: string | null
  exercises: ExerciseDTO[]
}

export type TrainingPlanDTO = {
  muscles: MuscleDTO[]
}
