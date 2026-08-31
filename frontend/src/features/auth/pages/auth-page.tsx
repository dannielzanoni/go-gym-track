import { useState, type FormEvent } from "react"
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/features/auth/context/auth-context"
import { PreferencesControls } from "@/features/preferences/preferences-controls"
import { ApiError } from "@/services/http/api-error"

export function LoginPage() {
  return <AuthForm mode="login" />
}

export function RegisterPage() {
  return <AuthForm mode="register" />
}

function AuthForm({ mode }: { mode: "login" | "register" }) {
  const { status, login, register } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [displayName, setDisplayName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (status === "authenticated") return <Navigate to="/" replace />

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      if (mode === "login") await login({ email, password, rememberMe })
      else await register({ email, displayName, password })
      const destination = (location.state as { from?: string } | null)?.from ?? "/"
      navigate(destination, { replace: true })
    } catch (caught) {
      setError(caught instanceof ApiError ? t(`errors.${caught.code}`, { defaultValue: t("auth.genericError") }) : t("auth.genericError"))
    } finally {
      setSubmitting(false)
    }
  }

  const registering = mode === "register"
  return (
    <main className="relative grid min-h-dvh place-items-center bg-background px-4 py-16 text-foreground">
      <div className="absolute right-3 top-3 sm:right-5 sm:top-5"><PreferencesControls /></div>
      <div className="w-full max-w-md">
        <Link to="/" className="mx-auto mb-7 flex w-fit items-center gap-3" aria-label="GymTrack">
          <img src="/icon.svg" alt="" className="size-11 rounded-2xl" />
          <span className="font-display text-2xl font-black">GYM<span className="text-primary">TRACK</span></span>
        </Link>
        <Card className="border-border bg-card/85 shadow-2xl shadow-black/15 dark:shadow-black/25">
          <CardHeader>
            <CardTitle className="font-display text-2xl font-black">{registering ? t("auth.createTitle") : t("auth.loginTitle")}</CardTitle>
            <CardDescription>{registering ? t("auth.createDescription") : t("auth.loginDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={submit}>
              {registering && (
                <div className="space-y-2">
                  <Label htmlFor="display-name">{t("auth.name")}</Label>
                  <Input id="display-name" autoComplete="name" minLength={2} maxLength={80} required value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">{t("auth.email")}</Label>
                <Input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t("auth.password")}</Label>
                <Input id="password" type="password" minLength={8} maxLength={128} autoComplete={registering ? "new-password" : "current-password"} required value={password} onChange={(event) => setPassword(event.target.value)} />
              </div>
              {!registering && (
                <div className="flex items-center gap-2">
                  <Checkbox id="remember-me" checked={rememberMe} onCheckedChange={(checked: boolean) => setRememberMe(checked)} />
                  <Label htmlFor="remember-me" className="cursor-pointer font-normal text-muted-foreground">{t("auth.rememberMe")}</Label>
                </div>
              )}
              {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
              <Button type="submit" size="lg" className="w-full" disabled={submitting}>{submitting ? t("auth.wait") : registering ? t("auth.createAccount") : t("auth.signIn")}</Button>
            </form>
            <p className="mt-5 text-center text-sm text-muted-foreground">
              {registering ? t("auth.alreadyHaveAccount") : t("auth.noAccount")}{" "}
              <Link className="font-semibold text-primary hover:underline" to={registering ? "/login" : "/register"}>{registering ? t("auth.signIn") : t("auth.createAccount")}</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
