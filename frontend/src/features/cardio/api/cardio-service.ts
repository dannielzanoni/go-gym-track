import { apiClient } from "@/services/http/api-client"
import type { CardioRecord, CardioWeekSummary, CreateCardioRecordInput } from "@/features/cardio/types"

type ListCardioParams = {
  limit?: number
  signal?: AbortSignal
}

type WeeklyCardioParams = {
  date: string
  timezone: string
  signal?: AbortSignal
}

export const cardioService = {
  list({ limit = 100, signal }: ListCardioParams = {}) {
    const params = new URLSearchParams({ limit: String(limit) })
    return apiClient.request<CardioRecord[]>(`/cardio-records?${params}`, { signal })
  },
  weekly({ date, timezone, signal }: WeeklyCardioParams) {
    const params = new URLSearchParams({ date, timezone })
    return apiClient.request<CardioWeekSummary>(`/cardio-records/weekly?${params}`, { signal })
  },
  create(input: CreateCardioRecordInput) {
    return apiClient.request<CardioRecord>("/cardio-records", { method: "POST", body: input })
  },
}
