import type { Exercise, ExerciseSet, GymState, Muscle } from "@/types/gym"

const historyDates = ["2026-07-08", "2026-07-15", "2026-07-22", "2026-07-29", "2026-08-05"]

function makeSet(id: string, reps: number, weight: number, variation = 0): ExerciseSet {
  return {
    id,
    reps,
    weight,
    completed: false,
    history: historyDates.map((date, index) => ({
      date: `${date}T18:30:00.000Z`,
      reps: Math.max(6, reps - 2 + Math.min(index, 2) + (variation % 2)),
      weight: Math.max(0, weight - 4 + index),
    })),
  }
}

function makeExercise(slug: string, name: string, sets: number, reps: number, weight: number): Exercise {
  return {
    id: `exercise-${slug}`,
    name,
    sets: Array.from({ length: sets }, (_, index) =>
      makeSet(`set-${slug}-${index + 1}`, Math.max(6, reps - (index > 1 ? 1 : 0)), weight + index * 2, index),
    ),
  }
}

function makeMuscle(id: string, name: string, exercises: Exercise[], lastWorkoutAt: string | null): Muscle {
  return { id, name, exercises, lastWorkoutAt }
}

export const initialState: GymState = {
  version: 1,
  workouts: [],
  muscles: [
    makeMuscle("muscle-peito", "Peito", [
      makeExercise("supino-reto", "Supino reto", 4, 10, 32),
      makeExercise("supino-inclinado", "Supino inclinado", 4, 10, 26),
      makeExercise("crucifixo", "Crucifixo máquina", 4, 12, 42),
    ], "2026-08-05T18:30:00.000Z"),
    makeMuscle("muscle-triceps", "Tríceps", [
      makeExercise("triceps-corda", "Tríceps corda", 4, 12, 28),
      makeExercise("triceps-frances", "Tríceps francês", 4, 10, 18),
      makeExercise("triceps-testa", "Tríceps testa", 3, 10, 20),
    ], "2026-08-04T18:30:00.000Z"),
    makeMuscle("muscle-biceps", "Bíceps", [
      makeExercise("rosca-direta", "Rosca direta", 4, 10, 24),
      makeExercise("rosca-scott", "Rosca Scott", 4, 10, 20),
      makeExercise("rosca-martelo", "Rosca martelo", 3, 12, 14),
    ], "2026-08-02T18:30:00.000Z"),
    makeMuscle("muscle-costas", "Costas", [
      makeExercise("puxada-alta", "Puxada alta", 4, 10, 52),
      makeExercise("remada-baixa", "Remada baixa", 4, 10, 48),
      makeExercise("remada-curvada", "Remada curvada", 4, 8, 44),
    ], "2026-08-07T18:30:00.000Z"),
    makeMuscle("muscle-ombro", "Ombro", [
      makeExercise("desenvolvimento", "Desenvolvimento", 4, 10, 22),
      makeExercise("elevacao-lateral", "Elevação lateral", 4, 12, 10),
      makeExercise("crucifixo-inverso", "Crucifixo inverso", 3, 12, 32),
    ], "2026-08-01T18:30:00.000Z"),
    makeMuscle("muscle-perna", "Perna", [
      makeExercise("agachamento", "Agachamento livre", 4, 8, 70),
      makeExercise("leg-press", "Leg press", 4, 10, 140),
      makeExercise("cadeira-extensora", "Cadeira extensora", 4, 12, 55),
    ], "2026-08-06T18:30:00.000Z"),
  ],
}
