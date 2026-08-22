import { useMemo, useState } from "react"
import { CalendarClock, ChevronLeft, ChevronRight, Eye, Flame, Info, Trophy } from "lucide-react"
import { toast } from "sonner"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogMedia, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ExerciseDialog } from "@/components/workout/exercise-dialog"
import { useGym } from "@/context/gym-context"
import { cn, formatDate } from "@/lib/utils"
import type { Exercise } from "@/types/gym"

const REQUIRED_SETS = 10

export function HomePage() {
  const { state, updateExercise, finishWorkout } = useGym()
  const [selectedMuscleId, setSelectedMuscleId] = useState(() => state.muscles[0]?.id ?? "")
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null)
  const [finishOpen, setFinishOpen] = useState(false)

  const resolvedSelectedId = state.muscles.some((muscle) => muscle.id === selectedMuscleId)
    ? selectedMuscleId
    : (state.muscles[0]?.id ?? "")
  const muscleIndex = Math.max(0, state.muscles.findIndex((muscle) => muscle.id === resolvedSelectedId))
  const muscle = state.muscles[muscleIndex]
  const completedSets = useMemo(() => muscle?.exercises.reduce((total, exercise) => total + exercise.sets.filter((set) => set.completed).length, 0) ?? 0, [muscle])
  const totalSets = useMemo(() => muscle?.exercises.reduce((total, exercise) => total + exercise.sets.length, 0) ?? 0, [muscle])
  const canFinish = completedSets >= REQUIRED_SETS

  if (!muscle) {
    return (
      <div className="mx-auto max-w-xl py-20 text-center">
        <p className="font-display text-2xl font-bold">Nenhum músculo cadastrado</p>
        <p className="mt-2 text-muted-foreground">Acesse a aba Músculos para montar o seu primeiro treino.</p>
      </div>
    )
  }

  function changeMuscle(direction: -1 | 1) {
    const nextIndex = (muscleIndex + direction + state.muscles.length) % state.muscles.length
    setSelectedMuscleId(state.muscles[nextIndex].id)
  }

  function confirmFinish() {
    const workout = finishWorkout(muscle.id)
    if (!workout) return
    setFinishOpen(false)
    toast.success("Treino finalizado!", { description: `${workout.sets.length} séries registradas no histórico.` })
  }

  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-3xl border border-white/7 bg-card px-3 py-5 min-[380px]:px-4 sm:rounded-[28px] sm:px-8 sm:py-8">
        <div className="pointer-events-none absolute -right-20 -top-28 size-72 rounded-full bg-primary/9 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-primary">
              <Flame className="size-4" /> Treino de hoje
            </div>
            <div className="flex w-full items-center gap-2 sm:gap-4">
              <Button variant="outline" size="icon-lg" className="size-11 shrink-0 rounded-xl" onClick={() => changeMuscle(-1)} aria-label="Músculo anterior"><ChevronLeft /></Button>
              <div className="min-w-0 flex-1 text-center sm:min-w-64">
                <p className="text-xs font-medium text-muted-foreground">Músculo selecionado</p>
                <h1 className="font-display mt-1 truncate text-3xl font-black uppercase tracking-tight sm:text-5xl">{muscle.name}</h1>
              </div>
              <Button variant="outline" size="icon-lg" className="size-11 shrink-0 rounded-xl" onClick={() => changeMuscle(1)} aria-label="Próximo músculo"><ChevronRight /></Button>
            </div>
            <div className="mt-5 flex items-center justify-center gap-1.5">
              {state.muscles.map((item) => (
                <button key={item.id} type="button" onClick={() => setSelectedMuscleId(item.id)} className={cn("h-1.5 w-4 rounded-full bg-muted-foreground/25 transition-all", item.id === muscle.id && "w-8 bg-primary")} aria-label={`Selecionar ${item.name}`} />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 lg:w-[390px]">
            <div className="rounded-2xl border border-white/7 bg-background/50 p-4">
              <CalendarClock className="mb-3 size-5 text-primary" />
              <p className="text-xs text-muted-foreground">Último treino</p>
              <p className="mt-1 text-sm font-bold capitalize">{formatDate(muscle.lastWorkoutAt)}</p>
            </div>
            <div className="rounded-2xl border border-white/7 bg-background/50 p-4">
              <Trophy className="mb-3 size-5 text-primary" />
              <p className="text-xs text-muted-foreground">Progresso atual</p>
              <p className="mt-1 font-mono text-sm font-bold">{completedSets}/{totalSets} séries</p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.16em] text-primary">Sua sequência</p>
            <h2 className="font-display mt-1 text-2xl font-bold">Exercícios</h2>
          </div>
          <Badge variant="secondary">{muscle.exercises.length} exercícios</Badge>
        </div>

        <div className="grid gap-3">
          {muscle.exercises.map((exercise, exerciseIndex) => {
            const done = exercise.sets.filter((set) => set.completed).length
            const percentage = exercise.sets.length ? (done / exercise.sets.length) * 100 : 0
            return (
              <Card key={exercise.id} className="group gap-0 overflow-hidden border-white/7 bg-card/75 p-0 transition-colors hover:border-primary/25">
                <div className="flex items-center gap-2.5 p-3 min-[380px]:gap-3 min-[380px]:p-4 sm:gap-5 sm:p-5">
                  <div className={cn("grid size-11 shrink-0 place-items-center rounded-xl border border-white/7 bg-background/60 font-mono text-xs font-black min-[380px]:size-12 min-[380px]:rounded-2xl min-[380px]:text-sm", done > 0 && "border-primary/25 bg-primary/8 text-primary")}>
                    {done}/{exercise.sets.length}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground">{String(exerciseIndex + 1).padStart(2, "0")}</span>
                      <h3 className="truncate font-display text-base font-bold sm:text-lg">{exercise.name}</h3>
                    </div>
                    <Progress value={percentage} className="mt-3 h-1.5 bg-white/5" />
                  </div>
                  <Button variant="outline" size="icon-lg" className="size-11 shrink-0 rounded-xl" onClick={() => setEditingExercise(exercise)} aria-label={`Abrir detalhes de ${exercise.name}`}><Eye /></Button>
                </div>
              </Card>
            )
          })}
        </div>

        <div className="mt-6 rounded-2xl border border-white/7 bg-card/50 p-4 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-5">
          <div className="mb-4 flex min-w-0 items-start gap-3 sm:mb-0">
            <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground", canFinish && "bg-primary/12 text-primary")}><Info className="size-4" /></span>
            <div>
              <p className="text-sm font-semibold">Meta mínima: {REQUIRED_SETS} séries</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {canFinish ? `Meta atingida com ${completedSets} séries. Você já pode registrar o treino.` : `Conclua mais ${REQUIRED_SETS - completedSets} séries, em qualquer combinação de exercícios.`}
              </p>
            </div>
          </div>
          <Button size="lg" className="h-12 w-full rounded-xl px-7 font-bold sm:w-auto" disabled={!canFinish} onClick={() => setFinishOpen(true)}>
            Finalizar treino
          </Button>
        </div>
      </section>

      {editingExercise && (
        <ExerciseDialog
          key={editingExercise.id}
          exercise={editingExercise}
          open
          onOpenChange={(open) => !open && setEditingExercise(null)}
          onSave={(exercise) => updateExercise(muscle.id, exercise)}
        />
      )}

      <AlertDialog open={finishOpen} onOpenChange={setFinishOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia><Trophy className="text-primary" /></AlertDialogMedia>
            <AlertDialogTitle>Finalizar treino de {muscle.name}?</AlertDialogTitle>
            <AlertDialogDescription>Você concluiu {completedSets} séries. As séries marcadas serão salvas no histórico e o treino atual será reiniciado.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar treinando</AlertDialogCancel>
            <AlertDialogAction onClick={confirmFinish}>Sim, finalizar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
