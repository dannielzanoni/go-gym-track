import { apiClient } from "@/services/http/api-client"
import type { AuthSession, LoginInput, RegisterInput, User } from "@/features/auth/types"

export const authService = {
  register(input: RegisterInput) {
    return apiClient.request<AuthSession>("/auth/register", { method: "POST", body: input, auth: false })
  },
  login(input: LoginInput) {
    return apiClient.request<AuthSession>("/auth/login", { method: "POST", body: input, auth: false })
  },
  refresh() {
    return apiClient.request<AuthSession>("/auth/refresh", { method: "POST", auth: false, retryAuth: false })
  },
  logout() {
    return apiClient.request<void>("/auth/logout", { method: "POST", auth: false, retryAuth: false })
  },
  me() {
    return apiClient.request<User>("/auth/me")
  },
}
