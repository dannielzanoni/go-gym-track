import { useState } from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { cn } from "@/lib/utils"
import type { SetHistory } from "@/types/gym"

const chartConfig = {
  reps: { label: "Repetições", color: "var(--primary)" },
  weight: { label: "Peso (kg)", color: "oklch(0.76 0.17 70)" },
} satisfies ChartConfig

type ChartMode = "combined" | "weight" | "reps"

const filters: { value: ChartMode; label: string }[] = [
  { value: "combined", label: "Peso + reps" },
  { value: "weight", label: "Somente peso" },
  { value: "reps", label: "Somente reps" },
]

export function SeriesChart({ history }: { history: SetHistory[] }) {
  const [mode, setMode] = useState<ChartMode>("combined")
  const data = history.slice(-8).map((item) => ({
    date: new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(new Date(item.date)),
    fullDate: new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(item.date)),
    reps: item.reps,
    weight: item.weight,
  }))

  if (!data.length) {
    return <div className="grid h-44 place-items-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">O histórico começa após o primeiro treino.</div>
  }

  return (
    <div>
      <div className="mb-3 grid grid-cols-3 gap-1 rounded-xl bg-muted/60 p-1" aria-label="Filtrar dados do gráfico">
        {filters.map((filter) => (
          <button
            key={filter.value}
            type="button"
            aria-pressed={mode === filter.value}
            onClick={() => setMode(filter.value)}
            className={cn(
              "min-h-8 rounded-lg px-1.5 text-[10px] font-semibold text-muted-foreground transition-colors min-[380px]:text-xs",
              mode === filter.value && "bg-background text-foreground shadow-sm",
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>
      <ChartContainer config={chartConfig} className="h-52 w-full aspect-auto">
        <AreaChart accessibilityLayer data={data} margin={{ left: 4, right: 4, top: 12, bottom: 4 }}>
          <defs>
            <linearGradient id="fillReps" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-reps)" stopOpacity={0.34} />
              <stop offset="95%" stopColor="var(--color-reps)" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="fillWeight" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-weight)" stopOpacity={0.28} />
              <stop offset="95%" stopColor="var(--color-weight)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="4 4" />
          <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={10} />
          <YAxis yAxisId="reps" hide domain={[0, "auto"]} />
          <YAxis yAxisId="weight" hide orientation="right" domain={[0, "auto"]} />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent indicator="line" labelFormatter={(_, payload) => payload[0]?.payload?.fullDate ?? ""} />}
          />
          {mode !== "reps" && <Area yAxisId="weight" dataKey="weight" type="linear" fill="url(#fillWeight)" fillOpacity={1} stroke="var(--color-weight)" strokeWidth={2.5} />}
          {mode !== "weight" && <Area yAxisId="reps" dataKey="reps" type="linear" fill="url(#fillReps)" fillOpacity={1} stroke="var(--color-reps)" strokeWidth={2.5} />}
          <ChartLegend content={<ChartLegendContent />} />
        </AreaChart>
      </ChartContainer>
    </div>
  )
}
