import type { ExerciseDTO, ExerciseSetDTO, MuscleDTO } from "@/features/gym/api/gym-contracts"
import type { Exercise, ExerciseSet, Muscle } from "@/types/gym"

export function mapExerciseSet(set: ExerciseSetDTO): ExerciseSet {
  return {
    id: set.id,
    position: set.position,
    reps: set.targetReps,
    weight: set.targetWeight,
    completed: false,
    history: set.history ?? [],
  }
}

export function mapExercise(exercise: ExerciseDTO): Exercise {
  return {
    id: exercise.id,
    name: exercise.name,
    position: exercise.position,
    sets: (exercise.sets ?? []).map(mapExerciseSet),
  }
}

export function mapMuscle(muscle: MuscleDTO): Muscle {
  return {
    id: muscle.id,
    name: muscle.name,
    position: muscle.position,
    lastWorkoutAt: muscle.lastWorkoutAt,
    exercises: (muscle.exercises ?? []).map(mapExercise),
  }
}
