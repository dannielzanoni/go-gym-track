import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { authService } from "@/features/auth/api/auth-service"
import type { LoginInput, RegisterInput, User } from "@/features/auth/types"
import { apiClient } from "@/services/http/api-client"

type AuthStatus = "loading" | "authenticated" | "anonymous"

type AuthContextValue = {
  user: User | null
  status: AuthStatus
  login: (input: LoginInput) => Promise<void>
  register: (input: RegisterInput) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<AuthStatus>("loading")

  const refresh = useCallback(async () => {
    try {
      const session = await authService.refresh()
      apiClient.setAccessToken(session.accessToken)
      setUser(session.user)
      setStatus("authenticated")
      return true
    } catch {
      apiClient.setAccessToken(null)
      queryClient.clear()
      setUser(null)
      setStatus("anonymous")
      return false
    }
  }, [queryClient])

  useEffect(() => {
    apiClient.setRefreshHandler(refresh)
    const bootstrap = window.setTimeout(() => void refresh(), 0)
    return () => {
      window.clearTimeout(bootstrap)
      apiClient.setRefreshHandler(null)
    }
  }, [refresh])

  async function login(input: LoginInput) {
    const session = await authService.login(input)
    queryClient.clear()
    apiClient.setAccessToken(session.accessToken)
    setUser(session.user)
    setStatus("authenticated")
  }

  async function register(input: RegisterInput) {
    const session = await authService.register(input)
    queryClient.clear()
    apiClient.setAccessToken(session.accessToken)
    setUser(session.user)
    setStatus("authenticated")
  }

  async function logout() {
    try {
      await authService.logout()
    } finally {
      apiClient.setAccessToken(null)
      setUser(null)
      setStatus("anonymous")
      queryClient.clear()
    }
  }

  const value = { user, status, login, register, logout }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth deve ser usado dentro de AuthProvider")
  return context
}
