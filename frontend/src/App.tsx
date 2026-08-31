import { lazy, Suspense, useEffect } from "react"
import { Navigate, Route, Routes } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { AppShell } from "@/components/layout/app-shell"
import { ProtectedRoute } from "@/features/auth/components/protected-route"

const HomePage = lazy(() => import("@/pages/home-page").then((module) => ({ default: module.HomePage })))
const CardioPage = lazy(() => import("@/pages/cardio-page").then((module) => ({ default: module.CardioPage })))
const MusclesPage = lazy(() => import("@/pages/muscles-page").then((module) => ({ default: module.MusclesPage })))
const LoginPage = lazy(() => import("@/features/auth/pages/auth-page").then((module) => ({ default: module.LoginPage })))
const RegisterPage = lazy(() => import("@/features/auth/pages/auth-page").then((module) => ({ default: module.RegisterPage })))

function PageLoading() {
  const { t } = useTranslation()
  return <div className="mx-auto mt-24 h-2 w-28 animate-pulse rounded-full bg-primary/30" aria-label={t("common.loadingPage")} />
}

export function App() {
  const { t, i18n } = useTranslation()

  useEffect(() => {
    document.title = t("metadata.title")
    document.documentElement.lang = i18n.resolvedLanguage === "pt-BR" ? "pt-BR" : "en-US"
    document.querySelector<HTMLMetaElement>('meta[name="description"]')?.setAttribute("content", t("metadata.description"))
  }, [i18n.resolvedLanguage, t])

  return (
    <Routes>
      <Route path="/login" element={<Suspense fallback={<PageLoading />}><LoginPage /></Suspense>} />
      <Route path="/register" element={<Suspense fallback={<PageLoading />}><RegisterPage /></Suspense>} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<Suspense fallback={<PageLoading />}><HomePage /></Suspense>} />
          <Route path="/cardio" element={<Suspense fallback={<PageLoading />}><CardioPage /></Suspense>} />
          <Route path="/muscles" element={<Suspense fallback={<PageLoading />}><MusclesPage /></Suspense>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  )
}
