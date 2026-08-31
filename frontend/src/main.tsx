import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import { Toaster } from "sonner"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { App } from "@/App"
import { GymProvider } from "@/context/gym-context"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AuthProvider } from "@/features/auth/context/auth-context"
import { ThemeProvider, useTheme } from "@/features/preferences/theme-context"
import "@/i18n"
import "@/index.css"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
    mutations: { retry: 0 },
  },
})

function RootContent() {
  const { theme } = useTheme()

  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <GymProvider>
            <TooltipProvider>
              <App />
              <Toaster theme={theme} richColors position="top-center" />
            </TooltipProvider>
          </GymProvider>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  )
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <RootContent />
    </ThemeProvider>
  </StrictMode>,
)
