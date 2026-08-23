import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useAuth } from "@/features/auth/context/auth-context"

export function ProtectedRoute() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === "loading") {
    return <div className="grid min-h-dvh place-items-center bg-background"><div className="h-2 w-28 animate-pulse rounded-full bg-primary/30" aria-label="Carregando sessão" /></div>
  }
  if (status === "anonymous") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}
