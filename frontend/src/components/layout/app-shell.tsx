import { Activity, Dumbbell, House, LogOut, Settings2 } from "lucide-react"
import { NavLink, Outlet } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/features/auth/context/auth-context"
import { cn } from "@/lib/utils"

const navigation = [
  { to: "/", label: "Treino", icon: House },
  { to: "/cardio", label: "Cardio", icon: Activity },
  { to: "/muscles", label: "Músculos", icon: Settings2 },
]

export function AppShell() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-dvh w-full min-w-0 overflow-x-clip bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-white/6 bg-background/82 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:h-16 sm:px-6">
          <NavLink to="/" className="flex items-center gap-2.5" aria-label="Ir para o treino">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[0_0_24px_rgba(95,255,145,.18)]">
              <Dumbbell className="size-5" />
            </span>
            <span className="font-display text-lg font-bold tracking-tight">GYM<span className="text-primary">TRACK</span></span>
          </NavLink>

          <Button className="sm:hidden" variant="ghost" size="icon" onClick={() => void logout()} aria-label="Sair"><LogOut /></Button>

          <div className="hidden items-center gap-2 sm:flex">
            <nav className="flex items-center rounded-xl border border-white/6 bg-card/70 p-1" aria-label="Navegação principal">
              {navigation.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) => cn(
                    "flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-medium text-muted-foreground transition-colors",
                    isActive && "bg-white/7 text-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  {label}
                </NavLink>
              ))}
            </nav>
            <span className="max-w-36 truncate px-2 text-xs text-muted-foreground">{user?.displayName}</span>
            <Button variant="ghost" size="icon" onClick={() => void logout()} aria-label="Sair"><LogOut /></Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full min-w-0 max-w-6xl px-3 pb-28 pt-5 min-[380px]:px-4 sm:px-6 sm:pb-12 sm:pt-10">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/8 bg-background/92 px-5 pb-[max(.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl sm:hidden" aria-label="Navegação principal">
        <div className="mx-auto grid max-w-sm grid-cols-3 gap-2">
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => cn(
                "flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold text-muted-foreground",
                isActive && "bg-primary/10 text-primary",
              )}
            >
              <Icon className="size-5" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
