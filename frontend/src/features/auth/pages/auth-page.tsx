import { useState, type FormEvent } from "react"
import { Dumbbell } from "lucide-react"
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/features/auth/context/auth-context"
import { ApiError } from "@/services/http/api-error"

export function LoginPage() {
  return <AuthForm mode="login" />
}

export function RegisterPage() {
  return <AuthForm mode="register" />
}

function AuthForm({ mode }: { mode: "login" | "register" }) {
  const { status, login, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [displayName, setDisplayName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (status === "authenticated") return <Navigate to="/" replace />

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      if (mode === "login") await login({ email, password })
      else await register({ email, displayName, password })
      const destination = (location.state as { from?: string } | null)?.from ?? "/"
      navigate(destination, { replace: true })
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Não foi possível autenticar. Tente novamente.")
    } finally {
      setSubmitting(false)
    }
  }

  const registering = mode === "register"
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4 py-10 text-foreground">
      <div className="w-full max-w-md">
        <Link to="/" className="mx-auto mb-7 flex w-fit items-center gap-3" aria-label="GymTrack">
          <span className="grid size-11 place-items-center rounded-2xl bg-primary text-primary-foreground"><Dumbbell className="size-6" /></span>
          <span className="font-display text-2xl font-black">GYM<span className="text-primary">TRACK</span></span>
        </Link>
        <Card className="border-white/8 bg-card/85 shadow-2xl shadow-black/25">
          <CardHeader>
            <CardTitle className="font-display text-2xl font-black">{registering ? "Criar sua conta" : "Entrar na sua conta"}</CardTitle>
            <CardDescription>{registering ? "Sua ficha e seus treinos ficarão sincronizados com segurança." : "Continue de onde parou em qualquer dispositivo."}</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={submit}>
              {registering && (
                <div className="space-y-2">
                  <Label htmlFor="display-name">Nome</Label>
                  <Input id="display-name" autoComplete="name" minLength={2} maxLength={80} required value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input id="password" type="password" minLength={8} maxLength={128} autoComplete={registering ? "new-password" : "current-password"} required value={password} onChange={(event) => setPassword(event.target.value)} />
              </div>
              {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
              <Button type="submit" size="lg" className="w-full" disabled={submitting}>{submitting ? "Aguarde..." : registering ? "Criar conta" : "Entrar"}</Button>
            </form>
            <p className="mt-5 text-center text-sm text-muted-foreground">
              {registering ? "Já possui conta?" : "Ainda não possui conta?"}{" "}
              <Link className="font-semibold text-primary hover:underline" to={registering ? "/login" : "/register"}>{registering ? "Entrar" : "Criar conta"}</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
