import { mapExercise, mapExerciseSet, mapMuscle } from "@/features/gym/api/gym-mappers"
import type { ExerciseDTO, ExerciseSetDTO, MuscleDTO, TrainingPlanDTO } from "@/features/gym/api/gym-contracts"
import { apiClient } from "@/services/http/api-client"

export type ExerciseSetInput = { targetReps: number; targetWeight: number }

export const gymService = {
  async getTrainingPlan(signal?: AbortSignal) {
    const plan = await apiClient.request<TrainingPlanDTO>("/training-plan", { signal })
    return plan.muscles.map(mapMuscle)
  },
  async createMuscle(name: string) {
    return mapMuscle(await apiClient.request<MuscleDTO>("/muscles", { method: "POST", body: { name } }))
  },
  async updateMuscle(id: string, name: string) {
    return mapMuscle(await apiClient.request<MuscleDTO>(`/muscles/${id}`, { method: "PATCH", body: { name } }))
  },
  deleteMuscle(id: string) {
    return apiClient.request<void>(`/muscles/${id}`, { method: "DELETE" })
  },
  reorderMuscles(orderedIds: string[]) {
    return apiClient.request<void>("/muscles/reorder", { method: "PATCH", body: { orderedIds } })
  },
  async createExercise(muscleId: string, name: string, sets: ExerciseSetInput[]) {
    return mapExercise(await apiClient.request<ExerciseDTO>(`/muscles/${muscleId}/exercises`, { method: "POST", body: { name, sets } }))
  },
  async updateExercise(id: string, name: string) {
    return mapExercise(await apiClient.request<ExerciseDTO>(`/exercises/${id}`, { method: "PATCH", body: { name } }))
  },
  deleteExercise(id: string) {
    return apiClient.request<void>(`/exercises/${id}`, { method: "DELETE" })
  },
  reorderExercises(muscleId: string, orderedIds: string[]) {
    return apiClient.request<void>(`/muscles/${muscleId}/exercises/reorder`, { method: "PATCH", body: { orderedIds } })
  },
  async createExerciseSet(exerciseId: string, input: ExerciseSetInput) {
    return mapExerciseSet(await apiClient.request<ExerciseSetDTO>(`/exercises/${exerciseId}/sets`, { method: "POST", body: input }))
  },
  async updateExerciseSet(id: string, input: ExerciseSetInput) {
    return mapExerciseSet(await apiClient.request<ExerciseSetDTO>(`/exercise-sets/${id}`, { method: "PATCH", body: input }))
  },
  deleteExerciseSet(id: string) {
    return apiClient.request<void>(`/exercise-sets/${id}`, { method: "DELETE" })
  },
  reorderExerciseSets(exerciseId: string, orderedIds: string[]) {
    return apiClient.request<void>(`/exercises/${exerciseId}/sets/reorder`, { method: "PATCH", body: { orderedIds } })
  },
}
