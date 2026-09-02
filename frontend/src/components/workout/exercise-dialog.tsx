import { lazy, Suspense, useState } from "react"
import { BarChart3, CheckCircle2, Link2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { localizedError } from "@/lib/localized-error"
import type { Exercise } from "@/types/gym"

const SeriesChart = lazy(() => import("@/components/workout/series-chart").then((module) => ({ default: module.SeriesChart })))

type Props = {
  exercise: Exercise
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (exercise: Exercise) => Promise<void> | void
  onSetCompletionChange: (setId: string, completed: boolean) => Promise<void>
}

function numberValue(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0
}

export function ExerciseDialog({ exercise, open, onOpenChange, onSave, onSetCompletionChange }: Props) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState<Exercise>(() => structuredClone(exercise))
  const [chartSetId, setChartSetId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [savingSetIds, setSavingSetIds] = useState<Set<string>>(() => new Set())
  const [keepWeight, setKeepWeight] = useState(false)
  const usesSingleDumbbell = /alter|dumbbell/i.test(draft.name)

  function updateSet(setId: string, changes: Partial<Exercise["sets"][number]>) {
    setDraft((current) => ({
      ...current,
      sets: current.sets.map((set) => {
        if (keepWeight && changes.weight !== undefined) return { ...set, weight: changes.weight }
        return set.id === setId ? { ...set, ...changes } : set
      }),
    }))
  }

  async function changeSetCompletion(setId: string, completed: boolean) {
    if (savingSetIds.has(setId)) return

    const previousCompleted = draft.sets.find((set) => set.id === setId)?.completed ?? !completed
    updateSet(setId, { completed })
    setSavingSetIds((current) => new Set(current).add(setId))
    try {
      await onSetCompletionChange(setId, completed)
    } catch (error) {
      updateSet(setId, { completed: previousCompleted })
      toast.error(localizedError(error, t, "exerciseDialog.saveError"))
    } finally {
      setSavingSetIds((current) => {
        const next = new Set(current)
        next.delete(setId)
        return next
      })
    }
  }

  function toggleKeepWeight() {
    setKeepWeight((current) => {
      const next = !current
      if (next) {
        setDraft((draftExercise) => {
          const lastWeight = draftExercise.sets.at(-1)?.weight
          if (lastWeight === undefined) return draftExercise
          return { ...draftExercise, sets: draftExercise.sets.map((set) => ({ ...set, weight: lastWeight })) }
        })
      }
      return next
    })
  }

  async function save() {
    setSaving(true)
    try {
      await onSave(draft)
      onOpenChange(false)
      toast.success(t("exerciseDialog.updated"))
    } catch (error) {
      toast.error(localizedError(error, t, "exerciseDialog.saveError"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bottom-0 left-0 top-auto grid max-h-[96dvh] w-full max-w-none translate-x-0 translate-y-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-b-none rounded-t-3xl p-0 sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[92dvh] sm:max-w-3xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl">
        <DialogHeader className="border-b border-border px-4 pb-3 pt-4 sm:px-6 sm:pb-4 sm:pt-5">
          <div className="flex items-center gap-3 pr-9">
            <span className="grid size-10 place-items-center rounded-xl bg-primary/12 text-primary"><CheckCircle2 className="size-5" /></span>
            <div className="min-w-0 flex-1">
              <DialogTitle className="font-display truncate text-lg font-bold sm:text-xl">{draft.name}</DialogTitle>
              <Badge variant="outline" className="mt-1.5 h-auto max-w-full whitespace-normal py-1 text-left text-[10px] leading-snug text-muted-foreground">
                {usesSingleDumbbell ? t("exerciseDialog.singleDumbbellWeight") : t("exerciseDialog.totalWeight")}
              </Badge>
              <DialogDescription className="mt-1">{t("exerciseDialog.description")}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 overscroll-contain overflow-y-auto px-3 py-3 min-[380px]:px-4 min-[380px]:py-4 sm:px-6">
          <div className="mb-4 space-y-1.5">
            <Label htmlFor="exercise-name">{t("exerciseDialog.exerciseName")}</Label>
            <Input id="exercise-name" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} className="h-10 font-semibold" />
          </div>
          <Button
            type="button"
            variant={keepWeight ? "secondary" : "outline"}
            className="mb-4 h-auto min-h-10 w-full whitespace-normal px-3 py-2"
            aria-pressed={keepWeight}
            onClick={toggleKeepWeight}
          >
            <Link2 /> {keepWeight ? t("exerciseDialog.weightLinked") : t("exerciseDialog.keepWeight")}
          </Button>
          <div className="hidden grid-cols-[42px_1fr_1fr_42px] gap-3 px-3 pb-2 text-xs font-semibold uppercase tracking-[.14em] text-muted-foreground sm:grid">
            <span>{t("exerciseDialog.done")}</span><span>{t("exerciseDialog.repetitions")}</span><span>{t("exerciseDialog.weight")}</span><span>{t("exerciseDialog.historyShort")}</span>
          </div>
          <div className="space-y-3">
            {draft.sets.map((set, index) => {
              const previous = set.history.at(-1)
              const chartOpen = chartSetId === set.id
              return (
                <div key={set.id} className="overflow-hidden rounded-2xl border border-border bg-card/70">
                  <div className="grid grid-cols-[36px_minmax(0,1fr)_minmax(0,1fr)_38px] items-end gap-1.5 p-2.5 min-[380px]:grid-cols-[44px_minmax(0,1fr)_minmax(0,1fr)_40px] min-[380px]:gap-2 min-[380px]:p-3 sm:gap-3">
                    <div className="flex h-10 flex-col items-center justify-center gap-1">
                      <Checkbox
                        checked={set.completed}
                        disabled={savingSetIds.has(set.id)}
                        onCheckedChange={(checked: boolean) => void changeSetCompletion(set.id, checked)}
                        aria-label={t("exerciseDialog.markSetDone", { number: index + 1 })}
                        className="size-5"
                      />
                      <span className="text-[10px] font-bold text-muted-foreground">{index + 1}</span>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`reps-${set.id}`} className="text-[10px] uppercase tracking-wide text-muted-foreground sm:sr-only">{t("exerciseDialog.repetitions")}</Label>
                      <Input id={`reps-${set.id}`} type="number" min="0" inputMode="numeric" value={set.reps || ""} onChange={(event) => updateSet(set.id, { reps: numberValue(event.target.value) })} className="h-10 text-center font-mono text-base font-bold" />
                      <p className="truncate text-center text-[10px] text-muted-foreground">{t("exerciseDialog.previousReps", { value: previous?.reps ?? "—" })}</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`weight-${set.id}`} className="text-[10px] uppercase tracking-wide text-muted-foreground sm:sr-only">{t("exerciseDialog.weight")}</Label>
                      <Input id={`weight-${set.id}`} type="number" min="0" step="0.5" inputMode="decimal" value={set.weight || ""} onChange={(event) => updateSet(set.id, { weight: numberValue(event.target.value) })} className="h-10 text-center font-mono text-base font-bold" />
                      <p className="truncate text-center text-[10px] text-muted-foreground">{t("exerciseDialog.previousWeight", { value: previous?.weight ?? "—" })}</p>
                    </div>
                    <Button type="button" variant={chartOpen ? "default" : "outline"} size="icon" className="mb-4 size-9 min-[380px]:size-10" onClick={() => setChartSetId(chartOpen ? null : set.id)} aria-label={t("exerciseDialog.viewProgress", { number: index + 1 })}>
                      <BarChart3 />
                    </Button>
                  </div>
                  {chartOpen && (
                    <div className="border-t border-border bg-background/45 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-sm font-semibold">{t("exerciseDialog.setProgress", { number: index + 1 })}</p>
                        <Badge variant="secondary">{t("exerciseDialog.recentWorkouts", { count: Math.min(8, set.history.length) })}</Badge>
                      </div>
                      <Suspense fallback={<div className="h-44 animate-pulse rounded-xl bg-muted/60" />}>
                        <SeriesChart key={set.id} history={set.history} />
                      </Suspense>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <DialogFooter className="m-0 grid grid-cols-2 px-3 py-3 sm:flex sm:px-6 sm:py-4">
          <Button className="h-11 w-full sm:h-8 sm:w-auto" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button className="h-11 w-full sm:h-8 sm:w-auto" disabled={saving || savingSetIds.size > 0} onClick={() => void save()}>{saving ? t("common.saving") : t("common.saveChanges")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
