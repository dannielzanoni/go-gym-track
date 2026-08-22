import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { gymStorage } from "@/services/gym-storage"
import type { Exercise, ExerciseSet, GymState, Muscle, Workout } from "@/types/gym"

type GymContextValue = {
  state: GymState
  setMuscles: (updater: (muscles: Muscle[]) => Muscle[]) => void
  updateExercise: (muscleId: string, exercise: Exercise) => void
  updateSet: (muscleId: string, exerciseId: string, set: ExerciseSet) => void
  finishWorkout: (muscleId: string) => Workout | null
}

const GymContext = createContext<GymContextValue | null>(null)

export function GymProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GymState>(() => gymStorage.load())

  useEffect(() => {
    gymStorage.save(state)
  }, [state])

  function setMuscles(updater: (muscles: Muscle[]) => Muscle[]) {
    setState((current) => ({ ...current, muscles: updater(current.muscles) }))
  }

  function updateExercise(muscleId: string, exercise: Exercise) {
    setMuscles((muscles) => muscles.map((muscle) => muscle.id === muscleId
      ? { ...muscle, exercises: muscle.exercises.map((item) => item.id === exercise.id ? exercise : item) }
      : muscle))
  }

  function updateSet(muscleId: string, exerciseId: string, updatedSet: ExerciseSet) {
    setMuscles((muscles) => muscles.map((muscle) => muscle.id === muscleId
      ? {
          ...muscle,
          exercises: muscle.exercises.map((exercise) => exercise.id === exerciseId
            ? { ...exercise, sets: exercise.sets.map((set) => set.id === updatedSet.id ? updatedSet : set) }
            : exercise),
        }
      : muscle))
  }

  function finishWorkout(muscleId: string) {
    const muscle = state.muscles.find((item) => item.id === muscleId)
    if (!muscle) return null

    const completed = muscle.exercises.flatMap((exercise) => exercise.sets
      .map((set, index) => ({ exercise, set, index }))
      .filter(({ set }) => set.completed))
    if (completed.length < 10) return null

    const completedAt = new Date().toISOString()
    const workout: Workout = {
      id: `workout-${Date.now()}`,
      muscleId: muscle.id,
      muscleName: muscle.name,
      completedAt,
      sets: completed.map(({ exercise, set, index }) => ({
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        setId: set.id,
        setNumber: index + 1,
        reps: set.reps,
        weight: set.weight,
      })),
    }

    setState((current) => ({
      ...current,
      workouts: [workout, ...current.workouts],
      muscles: current.muscles.map((item) => item.id === muscleId
        ? {
            ...item,
            lastWorkoutAt: completedAt,
            exercises: item.exercises.map((exercise) => ({
              ...exercise,
              sets: exercise.sets.map((set) => set.completed
                ? {
                    ...set,
                    completed: false,
                    history: [...set.history, { date: completedAt, reps: set.reps, weight: set.weight }],
                  }
                : set),
            })),
          }
        : item),
    }))

    return workout
  }

  const value = { state, setMuscles, updateExercise, updateSet, finishWorkout }

  return <GymContext.Provider value={value}>{children}</GymContext.Provider>
}

export function useGym() {
  const context = useContext(GymContext)
  if (!context) throw new Error("useGym deve ser usado dentro de GymProvider")
  return context
}
