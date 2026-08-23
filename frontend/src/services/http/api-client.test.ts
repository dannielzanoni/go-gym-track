import { beforeEach, describe, expect, it, vi } from "vitest"
import { ApiError } from "@/services/http/api-error"
import { apiClient } from "@/services/http/api-client"

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal("fetch", fetchMock)
  apiClient.setAccessToken(null)
  apiClient.setRefreshHandler(null)
})

describe("apiClient", () => {
  it("unwraps successful data envelopes", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ data: { id: "resource-id" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }))

    await expect(apiClient.request<{ id: string }>("/resource")).resolves.toEqual({ id: "resource-id" })
  })

  it("returns the API error contract", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({
      error: { code: "validation_error", message: "invalid request" },
    }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    }))

    const request = apiClient.request("/resource")
    await expect(request).rejects.toBeInstanceOf(ApiError)
    await expect(request).rejects.toMatchObject({ status: 400, code: "validation_error", message: "invalid request" })
  })

  it("uses one refresh for concurrent unauthorized requests and retries once", async () => {
    fetchMock.mockImplementation(async (_input, init) => {
      const authorization = new Headers(init?.headers).get("Authorization")
      if (authorization === "Bearer renewed-token") {
        return new Response(JSON.stringify({ data: { ok: true } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      }
      return new Response(JSON.stringify({ error: { code: "unauthorized", message: "expired" } }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    })

    let finishRefresh: ((value: boolean) => void) | undefined
    const refresh = vi.fn(() => new Promise<boolean>((resolve) => { finishRefresh = resolve }))
    apiClient.setAccessToken("expired-token")
    apiClient.setRefreshHandler(refresh)

    const first = apiClient.request<{ ok: boolean }>("/first")
    const second = apiClient.request<{ ok: boolean }>("/second")
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
    apiClient.setAccessToken("renewed-token")
    finishRefresh?.(true)

    await expect(Promise.all([first, second])).resolves.toEqual([{ ok: true }, { ok: true }])
    expect(refresh).toHaveBeenCalledTimes(1)
  })
})
