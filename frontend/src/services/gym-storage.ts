import { initialState } from "@/data/seed"
import type { GymState } from "@/types/gym"

const STORAGE_KEY = "my-gymtrack-app:v1"

function cloneSeed() {
  return structuredClone(initialState)
}

export const gymStorage = {
  load(): GymState {
    if (typeof window === "undefined") return cloneSeed()

    try {
      const saved = window.localStorage.getItem(STORAGE_KEY)
      if (!saved) return cloneSeed()
      const parsed = JSON.parse(saved) as GymState
      if (parsed.version !== 1 || !Array.isArray(parsed.muscles)) return cloneSeed()
      return parsed
    } catch {
      return cloneSeed()
    }
  },

  save(state: GymState) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  },
}
