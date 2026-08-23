import { apiClient } from "@/services/http/api-client"
import type { WorkoutSession, WorkoutSessionSet } from "@/types/gym"

export type UpdateSessionSetInput = Partial<Pick<WorkoutSessionSet, "reps" | "weight" | "completed">>

export const workoutService = {
  start(muscleId: string) {
    return apiClient.request<WorkoutSession>("/workout-sessions", { method: "POST", body: { muscleId } })
  },
  getActive(muscleId: string, signal?: AbortSignal) {
    return apiClient.request<WorkoutSession | null>(`/workout-sessions/active?muscleId=${encodeURIComponent(muscleId)}`, { signal })
  },
  get(id: string, signal?: AbortSignal) {
    return apiClient.request<WorkoutSession>(`/workout-sessions/${id}`, { signal })
  },
  updateSet(sessionId: string, setId: string, input: UpdateSessionSetInput) {
    return apiClient.request<WorkoutSessionSet>(`/workout-sessions/${sessionId}/sets/${setId}`, { method: "PATCH", body: input })
  },
  complete(sessionId: string) {
    return apiClient.request<WorkoutSession>(`/workout-sessions/${sessionId}/complete`, { method: "POST" })
  },
  cancel(sessionId: string) {
    return apiClient.request<void>(`/workout-sessions/${sessionId}`, { method: "DELETE" })
  },
}
