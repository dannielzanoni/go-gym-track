import { apiClient } from "@/services/http/api-client"
import type { CardioRecord, CreateCardioRecordInput } from "@/features/cardio/types"

type ListCardioParams = {
  from?: string
  to?: string
  limit?: number
  signal?: AbortSignal
}

export const cardioService = {
  list({ from, to, limit = 100, signal }: ListCardioParams = {}) {
    const params = new URLSearchParams({ limit: String(limit) })
    if (from) params.set("from", from)
    if (to) params.set("to", to)
    return apiClient.request<CardioRecord[]>(`/cardio-records?${params}`, { signal })
  },
  create(input: CreateCardioRecordInput) {
    return apiClient.request<CardioRecord>("/cardio-records", { method: "POST", body: input })
  },
}
