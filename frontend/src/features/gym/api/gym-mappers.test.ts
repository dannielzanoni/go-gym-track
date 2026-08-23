import { describe, expect, it } from "vitest"
import { mapMuscle } from "@/features/gym/api/gym-mappers"

describe("mapMuscle", () => {
  it("converts API target fields to the UI model", () => {
    const result = mapMuscle({
      id: "muscle-id",
      name: "Peito",
      position: 0,
      lastWorkoutAt: "2026-08-22T12:00:00Z",
      exercises: [{
        id: "exercise-id",
        name: "Supino reto",
        position: 0,
        sets: [{
          id: "set-id",
          position: 0,
          targetReps: 10,
          targetWeight: 32.5,
          history: [{ date: "2026-08-20T12:00:00Z", reps: 9, weight: 30 }],
        }],
      }],
    })

    expect(result.exercises[0].sets[0]).toEqual({
      id: "set-id",
      position: 0,
      reps: 10,
      weight: 32.5,
      completed: false,
      history: [{ date: "2026-08-20T12:00:00Z", reps: 9, weight: 30 }],
    })
  })
})
