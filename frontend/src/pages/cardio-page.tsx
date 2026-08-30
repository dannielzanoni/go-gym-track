import { useState, type ComponentType } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Activity, Bike, CalendarDays, ChartNoAxesColumnIncreasing, Clock3, Flame, Footprints, Goal, Plus, Route } from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cardioService } from "@/features/cardio/api/cardio-service"
import type { CardioActivityType, CreateCardioRecordInput } from "@/features/cardio/types"
import { useAuth } from "@/features/auth/context/auth-context"
import { cn } from "@/lib/utils"
import { ApiError } from "@/services/http/api-error"

type CardioView = "records" | "chart"

const activityMeta: Record<CardioActivityType, { label: string; icon: ComponentType<{ className?: string }> }> = {
  treadmill: { label: "Esteira", icon: Footprints },
  bike: { label: "Bike", icon: Bike },
  football: { label: "Futebol", icon: Goal },
}

const chartConfig = {
  minutes: { label: "Tempo", color: "var(--primary)" },
} satisfies ChartConfig

function dateInputValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (!hours) return `${remainingMinutes}min`
  if (!remainingMinutes) return `${hours}h`
  return `${hours}h ${String(remainingMinutes).padStart(2, "0")}min`
}

function formatDistance(value: number) {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : "Não foi possível salvar o cardio."
}

export function CardioPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [view, setView] = useState<CardioView>("records")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [activityType, setActivityType] = useState<CardioActivityType>("treadmill")
  const [hours, setHours] = useState("0")
  const [minutes, setMinutes] = useState("")
  const [distance, setDistance] = useState("")
  const [calories, setCalories] = useState("")
  const [date, setDate] = useState(() => dateInputValue(new Date()))

  const today = dateInputValue(new Date())
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Sao_Paulo"
  const recentKey = ["cardio-records", user?.id, "recent"] as const
  const weeklyKey = ["cardio-records", user?.id, "week", today, timezone] as const

  const recentQuery = useQuery({
    queryKey: recentKey,
    queryFn: ({ signal }) => cardioService.list({ limit: 100, signal }),
  })
  const weeklyQuery = useQuery({
    queryKey: weeklyKey,
    queryFn: ({ signal }) => cardioService.weekly({ date: today, timezone, signal }),
  })

  const createMutation = useMutation({
    mutationFn: (input: CreateCardioRecordInput) => cardioService.create(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: recentKey }),
        queryClient.invalidateQueries({ queryKey: weeklyKey }),
      ])
      setDialogOpen(false)
      toast.success("Cardio registrado")
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const weekdayFormatter = new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: "UTC" })
  const weeklyData = (weeklyQuery.data?.days ?? []).map((day) => ({
    ...day,
    day: weekdayFormatter.format(new Date(`${day.date}T12:00:00Z`)).replace(".", "").slice(0, 3),
    minutes: day.durationMinutes,
  }))

  function openDialog() {
    setActivityType("treadmill")
    setHours("0")
    setMinutes("")
    setDistance("")
    setCalories("")
    setDate(dateInputValue(new Date()))
    setDialogOpen(true)
  }

  function saveCardio() {
    const parsedHours = Math.max(0, Number(hours) || 0)
    const parsedMinutes = Math.max(0, Number(minutes) || 0)
    const durationMinutes = parsedHours * 60 + parsedMinutes
    if (!date || parsedMinutes > 59 || durationMinutes <= 0) {
      toast.error(parsedMinutes > 59 ? "Os minutos devem ficar entre 0 e 59." : "Informe uma duração maior que zero.")
      return
    }

    const selectedDate = date === dateInputValue(new Date()) ? new Date() : new Date(`${date}T12:00:00`)
    createMutation.mutate({
      activityType,
      durationMinutes,
      distanceKm: Math.max(0, Number(distance) || 0),
      calories: Math.max(0, Math.round(Number(calories) || 0)),
      occurredAt: selectedDate.toISOString(),
    })
  }

  const loading = recentQuery.isLoading || weeklyQuery.isLoading
  const hasError = recentQuery.isError || weeklyQuery.isError

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-white/7 bg-card p-5 sm:p-7">
        <div className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-primary/8 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-primary"><Activity className="size-4" /> Condicionamento</div>
            <h1 className="font-display text-3xl font-black tracking-tight sm:text-4xl">Cardio</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">Registre suas atividades e acompanhe o tempo acumulado durante a semana.</p>
          </div>
          <Button className="h-11 w-full rounded-xl font-bold sm:w-auto" onClick={openDialog}><Plus /> Registrar cardio</Button>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-1 rounded-xl border border-white/7 bg-card/60 p-1">
        <button type="button" aria-pressed={view === "records"} onClick={() => setView("records")} className={cn("flex min-h-10 items-center justify-center gap-2 rounded-lg text-sm font-semibold text-muted-foreground transition-colors", view === "records" && "bg-primary/12 text-primary")}><CalendarDays className="size-4" /> Registros</button>
        <button type="button" aria-pressed={view === "chart"} onClick={() => setView("chart")} className={cn("flex min-h-10 items-center justify-center gap-2 rounded-lg text-sm font-semibold text-muted-foreground transition-colors", view === "chart" && "bg-primary/12 text-primary")}><ChartNoAxesColumnIncreasing className="size-4" /> Gráfico</button>
      </div>

      {loading && <div className="grid min-h-64 place-items-center"><div className="h-2 w-28 animate-pulse rounded-full bg-primary/30" aria-label="Carregando cardios" /></div>}
      {hasError && !loading && <div className="grid min-h-64 place-items-center rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center"><div><p className="font-semibold">Não foi possível carregar seus cardios.</p><Button variant="outline" className="mt-4" onClick={() => { void recentQuery.refetch(); void weeklyQuery.refetch() }}>Tentar novamente</Button></div></div>}

      {!loading && !hasError && view === "records" && (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3"><h2 className="font-display text-xl font-bold">Histórico de cardio</h2><Badge variant="secondary">{recentQuery.data?.length ?? 0} registros</Badge></div>
          {(recentQuery.data ?? []).map((record) => {
            const meta = activityMeta[record.activityType]
            const Icon = meta.icon
            return (
              <Card key={record.id} className="gap-0 border-white/7 bg-card/70 p-4 sm:p-5">
                <div className="flex items-start gap-3 sm:gap-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="size-5" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-display text-lg font-bold">{meta.label}</h3><span className="text-xs capitalize text-muted-foreground">{new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(record.occurredAt))}</span></div>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <div className="rounded-xl bg-background/55 p-2.5"><Clock3 className="mb-1.5 size-4 text-primary" /><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Tempo</p><p className="mt-1 font-mono text-xs font-bold min-[380px]:text-sm">{formatDuration(record.durationMinutes)}</p></div>
                      <div className="rounded-xl bg-background/55 p-2.5"><Route className="mb-1.5 size-4 text-primary" /><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Distância</p><p className="mt-1 font-mono text-xs font-bold min-[380px]:text-sm">{formatDistance(record.distanceKm)} km</p></div>
                      <div className="rounded-xl bg-background/55 p-2.5"><Flame className="mb-1.5 size-4 text-primary" /><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Calorias</p><p className="mt-1 font-mono text-xs font-bold min-[380px]:text-sm">{record.calories} kcal</p></div>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
          {!recentQuery.data?.length && <div className="grid min-h-60 place-items-center rounded-2xl border border-dashed border-border bg-card/30 p-8 text-center"><div><Activity className="mx-auto size-9 text-primary" /><p className="mt-3 font-semibold">Nenhum cardio registrado</p><p className="mt-1 text-sm text-muted-foreground">Use o botão acima para registrar sua primeira atividade.</p></div></div>}
        </section>
      )}

      {!loading && !hasError && view === "chart" && (
        <section className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="gap-1 border-primary/20 bg-primary/8 p-4 sm:col-span-1"><Clock3 className="mb-2 size-5 text-primary" /><p className="text-xs text-muted-foreground">Tempo total da semana</p><p className="font-display text-3xl font-black text-primary">{formatDuration(weeklyQuery.data?.durationMinutes ?? 0)}</p></Card>
            <Card className="gap-1 border-white/7 bg-card/70 p-4"><Route className="mb-2 size-5 text-primary" /><p className="text-xs text-muted-foreground">Distância total</p><p className="font-mono text-xl font-bold">{formatDistance(weeklyQuery.data?.distanceKm ?? 0)} km</p></Card>
            <Card className="gap-1 border-white/7 bg-card/70 p-4"><Flame className="mb-2 size-5 text-primary" /><p className="text-xs text-muted-foreground">Calorias totais</p><p className="font-mono text-xl font-bold">{weeklyQuery.data?.calories ?? 0} kcal</p></Card>
          </div>
          <Card className="gap-3 border-white/7 bg-card/70 p-4 sm:p-6">
            <div><h2 className="font-display text-xl font-bold">Cardio de segunda a domingo</h2><p className="mt-1 text-xs text-muted-foreground">Cada barra representa o tempo total realizado no dia.</p></div>
            <ChartContainer config={chartConfig} className="h-64 w-full aspect-auto">
              <BarChart accessibilityLayer data={weeklyData} margin={{ left: 0, right: 4, top: 12 }}>
                <CartesianGrid vertical={false} strokeDasharray="4 4" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={10} />
                <YAxis width={40} tickLine={false} axisLine={false} tickFormatter={(value) => `${Math.round(Number(value) / 60 * 10) / 10}h`} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" formatter={(value) => formatDuration(Number(value))} />} />
                <Bar dataKey="minutes" fill="var(--color-minutes)" radius={[8, 8, 2, 2]} />
              </BarChart>
            </ChartContainer>
          </Card>
        </section>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bottom-0 left-0 top-auto w-full max-w-none translate-x-0 translate-y-0 gap-0 rounded-b-none rounded-t-3xl p-0 sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl">
          <DialogHeader className="border-b border-border px-5 pb-4 pt-5">
            <DialogTitle className="font-display text-xl font-bold">Registrar cardio</DialogTitle>
            <DialogDescription>Preencha os dados da atividade realizada.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 px-5 py-5">
            <div className="space-y-1.5"><Label htmlFor="cardio-date">Data</Label><Input id="cardio-date" type="date" max={dateInputValue(new Date())} value={date} onChange={(event) => setDate(event.target.value)} className="h-11" /></div>
            <div className="space-y-1.5"><Label>Tipo</Label><Select value={activityType} onValueChange={(value) => setActivityType(value as CardioActivityType)}><SelectTrigger className="h-11 w-full"><SelectValue /></SelectTrigger><SelectContent align="start"><SelectItem value="treadmill">Esteira</SelectItem><SelectItem value="bike">Bike</SelectItem><SelectItem value="football">Futebol</SelectItem></SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label htmlFor="cardio-hours">Horas</Label><Input id="cardio-hours" type="number" min="0" inputMode="numeric" value={hours} onChange={(event) => setHours(event.target.value)} onFocus={(event) => event.currentTarget.select()} className="h-11 font-mono" /></div>
              <div className="space-y-1.5"><Label htmlFor="cardio-minutes">Minutos</Label><Input id="cardio-minutes" type="number" min="0" max="59" inputMode="numeric" value={minutes} onChange={(event) => setMinutes(event.target.value)} className="h-11 font-mono" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label htmlFor="cardio-distance">Distância (km)</Label><Input id="cardio-distance" type="number" min="0" step="0.01" inputMode="decimal" value={distance} onChange={(event) => setDistance(event.target.value)} className="h-11 font-mono" /></div>
              <div className="space-y-1.5"><Label htmlFor="cardio-calories">Calorias (kcal)</Label><Input id="cardio-calories" type="number" min="0" inputMode="numeric" value={calories} onChange={(event) => setCalories(event.target.value)} className="h-11 font-mono" /></div>
            </div>
          </div>
          <DialogFooter className="m-0 grid grid-cols-2 px-5 py-4 sm:flex">
            <Button type="button" variant="outline" className="h-11 w-full sm:w-auto" disabled={createMutation.isPending} onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button type="button" className="h-11 w-full font-bold sm:w-auto" disabled={createMutation.isPending} onClick={saveCardio}>{createMutation.isPending ? "Salvando..." : "Salvar cardio"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
