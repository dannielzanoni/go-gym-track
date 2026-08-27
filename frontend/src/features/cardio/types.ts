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
