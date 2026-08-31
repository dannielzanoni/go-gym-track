import type { TFunction } from "i18next"
import { ApiError } from "@/services/http/api-error"

export function localizedError(error: unknown, t: TFunction, fallbackKey = "errors.generic") {
  if (error instanceof ApiError) {
    return t(`errors.${error.code}`, { defaultValue: t(fallbackKey) })
  }
  return t(fallbackKey)
}
