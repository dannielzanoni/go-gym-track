import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import type { SetHistory } from "@/types/gym"

const chartConfig = {
  reps: { label: "Repetições", color: "var(--primary)" },
} satisfies ChartConfig

export function SeriesChart({ history }: { history: SetHistory[] }) {
  const data = history.slice(-8).map((item) => ({
    date: new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(new Date(item.date)),
    reps: item.reps,
  }))

  if (!data.length) {
    return <div className="grid h-44 place-items-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">O histórico começa após o primeiro treino.</div>
  }

  return (
    <ChartContainer config={chartConfig} className="h-44 w-full aspect-auto">
      <AreaChart accessibilityLayer data={data} margin={{ left: 4, right: 4, top: 12 }}>
        <defs>
          <linearGradient id="fillReps" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-reps)" stopOpacity={0.36} />
            <stop offset="95%" stopColor="var(--color-reps)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="4 4" />
        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={10} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
        <Area dataKey="reps" type="linear" fill="url(#fillReps)" fillOpacity={1} stroke="var(--color-reps)" strokeWidth={2.5} />
      </AreaChart>
    </ChartContainer>
  )
}
