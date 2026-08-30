export type CardioActivityType = "treadmill" | "bike" | "football"

export type CardioRecord = {
  id: string
  activityType: CardioActivityType
  durationMinutes: number
  distanceKm: number
  calories: number
  occurredAt: string
  createdAt: string
}

export type CreateCardioRecordInput = {
  activityType: CardioActivityType
  durationMinutes: number
  distanceKm: number
  calories: number
  occurredAt: string
}

export type CardioDaySummary = {
  date: string
  durationMinutes: number
  distanceKm: number
  calories: number
}

export type CardioWeekSummary = {
  weekStart: string
  weekEnd: string
  durationMinutes: number
  distanceKm: number
  calories: number
  days: CardioDaySummary[]
}
