import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import { Toaster } from "sonner"
import { App } from "@/App"
import { GymProvider } from "@/context/gym-context"
import { TooltipProvider } from "@/components/ui/tooltip"
import "@/index.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <GymProvider>
        <TooltipProvider>
          <App />
          <Toaster theme="dark" richColors position="top-center" />
        </TooltipProvider>
      </GymProvider>
    </BrowserRouter>
  </StrictMode>,
)
