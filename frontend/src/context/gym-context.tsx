import { createContext, useContext, type ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/features/auth/context/auth-context"
import { gymService, type ExerciseSetInput } from "@/features/gym/api/gym-service"
import type { Muscle } from "@/types/gym"

type GymContextValue = {
  muscles: Muscle[]
  loading: boolean
  error: Error | null
  refresh: () => Promise<void>
  createMuscle: (name: string) => Promise<string>
  updateMuscle: (id: string, name: string) => Promise<void>
  deleteMuscle: (id: string) => Promise<void>
  reorderMuscles: (orderedIds: string[]) => Promise<void>
  createExercise: (muscleId: string, name: string, sets: ExerciseSetInput[]) => Promise<void>
  updateExercise: (id: string, name: string) => Promise<void>
  deleteExercise: (id: string) => Promise<void>
  reorderExercises: (muscleId: string, orderedIds: string[]) => Promise<void>
  createExerciseSet: (exerciseId: string, input: ExerciseSetInput) => Promise<void>
  updateExerciseSet: (id: string, input: ExerciseSetInput) => Promise<void>
  deleteExerciseSet: (id: string) => Promise<void>
  reorderExerciseSets: (exerciseId: string, orderedIds: string[]) => Promise<void>
}

const GymContext = createContext<GymContextValue | null>(null)

export function GymProvider({ children }: { children: ReactNode }) {
  const { status, user } = useAuth()
  const query = useQuery({
    queryKey: ["training-plan", user?.id],
    queryFn: ({ signal }) => gymService.getTrainingPlan(signal),
    enabled: status === "authenticated" && Boolean(user),
  })

  async function mutate<T>(operation: () => Promise<T>) {
    const result = await operation()
    await query.refetch()
    return result
  }

  const value: GymContextValue = {
    muscles: query.data ?? [],
    loading: status === "authenticated" && query.isLoading,
    error: query.error,
    refresh: async () => { await query.refetch() },
    createMuscle: async (name) => (await mutate(() => gymService.createMuscle(name))).id,
    updateMuscle: async (id, name) => { await mutate(() => gymService.updateMuscle(id, name)) },
    deleteMuscle: async (id) => { await mutate(() => gymService.deleteMuscle(id)) },
    reorderMuscles: async (orderedIds) => { await mutate(() => gymService.reorderMuscles(orderedIds)) },
    createExercise: async (muscleId, name, sets) => { await mutate(() => gymService.createExercise(muscleId, name, sets)) },
    updateExercise: async (id, name) => { await mutate(() => gymService.updateExercise(id, name)) },
    deleteExercise: async (id) => { await mutate(() => gymService.deleteExercise(id)) },
    reorderExercises: async (muscleId, orderedIds) => { await mutate(() => gymService.reorderExercises(muscleId, orderedIds)) },
    createExerciseSet: async (exerciseId, input) => { await mutate(() => gymService.createExerciseSet(exerciseId, input)) },
    updateExerciseSet: async (id, input) => { await mutate(() => gymService.updateExerciseSet(id, input)) },
    deleteExerciseSet: async (id) => { await mutate(() => gymService.deleteExerciseSet(id)) },
    reorderExerciseSets: async (exerciseId, orderedIds) => { await mutate(() => gymService.reorderExerciseSets(exerciseId, orderedIds)) },
  }

  return <GymContext.Provider value={value}>{children}</GymContext.Provider>
}

export function useGym() {
  const context = useContext(GymContext)
  if (!context) throw new Error("useGym must be used within GymProvider")
  return context
}
