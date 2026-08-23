import { ApiError } from "@/services/http/api-error"

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown
  auth?: boolean
  retryAuth?: boolean
}

type ErrorBody = {
  error?: {
    code?: string
    message?: string
    details?: unknown
  }
}

const baseURL = (import.meta.env.VITE_API_URL || "/api/v1").replace(/\/$/, "")

let accessToken: string | null = null
let refreshHandler: (() => Promise<boolean>) | null = null
let refreshRequest: Promise<boolean> | null = null

async function parseError(response: Response) {
  let body: ErrorBody = {}
  try {
    body = await response.json() as ErrorBody
  } catch {
    // An empty or non-JSON error body still becomes a typed ApiError.
  }
  return new ApiError(
    response.status,
    body.error?.code ?? "request_failed",
    body.error?.message ?? `Request failed with status ${response.status}`,
    body.error?.details,
  )
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, auth = true, retryAuth = true, headers, ...requestInit } = options
  const requestHeaders = new Headers(headers)
  requestHeaders.set("Accept", "application/json")
  if (body !== undefined) requestHeaders.set("Content-Type", "application/json")
  if (auth && accessToken) requestHeaders.set("Authorization", `Bearer ${accessToken}`)

  const response = await fetch(`${baseURL}${path}`, {
    ...requestInit,
    headers: requestHeaders,
    credentials: "include",
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (response.status === 401 && auth && retryAuth && refreshHandler) {
    refreshRequest ??= refreshHandler().finally(() => { refreshRequest = null })
    if (await refreshRequest) return request<T>(path, { ...options, retryAuth: false })
  }

  if (!response.ok) throw await parseError(response)
  if (response.status === 204) return undefined as T
  const envelope = await response.json() as { data: T }
  return envelope.data
}

export const apiClient = {
  request,
  setAccessToken(token: string | null) {
    accessToken = token
  },
  setRefreshHandler(handler: (() => Promise<boolean>) | null) {
    refreshHandler = handler
  },
}
