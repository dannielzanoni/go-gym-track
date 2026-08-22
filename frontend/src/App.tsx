import { lazy, Suspense } from "react"
import { Navigate, Route, Routes } from "react-router-dom"
import { AppShell } from "@/components/layout/app-shell"

const HomePage = lazy(() => import("@/pages/home-page").then((module) => ({ default: module.HomePage })))
const MusclesPage = lazy(() => import("@/pages/muscles-page").then((module) => ({ default: module.MusclesPage })))

function PageLoading() {
  return <div className="mx-auto mt-24 h-2 w-28 animate-pulse rounded-full bg-primary/30" aria-label="Carregando página" />
}

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Suspense fallback={<PageLoading />}><HomePage /></Suspense>} />
        <Route path="/muscles" element={<Suspense fallback={<PageLoading />}><MusclesPage /></Suspense>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
