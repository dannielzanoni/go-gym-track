import { useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  sortableKeyboardCoordinates,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { ArrowDown, ArrowUp, CalendarClock, ChevronLeft, ChevronRight, Eye, Flame, GripVertical, Info, Trophy, XCircle } from "lucide-react"
import { useTranslation } from "react-i18next"
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
import { useAuth } from "@/features/auth/context/auth-context"
import { workoutService } from "@/features/workout/api/workout-service"
import { cn, formatDate } from "@/lib/utils"
import { localizedError } from "@/lib/localized-error"
import type { Exercise, WorkoutSession } from "@/types/gym"

const REQUIRED_SETS = 10

function movedIds(items: { id: string }[], from: number, to: number) {
  if (to < 0 || to >= items.length) return items.map((item) => item.id)
  return arrayMove(items, from, to).map((item) => item.id)
}

type SortableExerciseCardProps = {
  exercise: Exercise
  index: number
  total: number
  done: number
  disabled: boolean
  onOpen: (exercise: Exercise) => void
  onMove: (from: number, to: number) => void
}

function SortableExerciseCard({ exercise, index, total, done, disabled, onOpen, onMove }: SortableExerciseCardProps) {
  const { t } = useTranslation()
  const { attributes, listeners, setActivatorNodeRef, setNodeRef, transform, transition, isDragging } = useSortable({ id: exercise.id, disabled })
  const percentage = exercise.sets.length ? (done / exercise.sets.length) * 100 : 0

  return (
    <Card
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group gap-0 overflow-hidden border-border bg-card/75 p-0 transition-colors hover:border-primary/25",
        isDragging && "z-10 border-primary/40 shadow-xl shadow-black/30",
      )}
    >
      <div className="flex items-center gap-2 p-3 min-[380px]:gap-3 min-[380px]:p-4 sm:gap-4 sm:p-5">
        <Button
          ref={setActivatorNodeRef}
          type="button"
          variant="ghost"
          size="icon-xs"
          className="touch-none cursor-grab text-muted-foreground active:cursor-grabbing"
          disabled={disabled}
          aria-label={t("home.dragExercise", { name: exercise.name })}
          {...attributes}
          {...listeners}
        >
          <GripVertical />
        </Button>
        <div className={cn("grid size-11 shrink-0 place-items-center rounded-xl border border-border bg-background/60 font-mono text-xs font-black min-[380px]:size-12 min-[380px]:rounded-2xl min-[380px]:text-sm", done > 0 && "border-primary/25 bg-primary/8 text-primary")}>{done}/{exercise.sets.length}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2"><span className="text-xs font-bold text-muted-foreground">{String(index + 1).padStart(2, "0")}</span><h3 className="truncate font-display text-base font-bold sm:text-lg">{exercise.name}</h3></div>
          <Progress value={percentage} className="mt-3 h-1.5 bg-muted" />
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <div className="flex flex-col">
            <Button type="button" variant="ghost" size="icon-xs" disabled={disabled || index === 0} onClick={() => onMove(index, index - 1)} aria-label={t("home.moveExerciseUp", { name: exercise.name })}><ArrowUp /></Button>
            <Button type="button" variant="ghost" size="icon-xs" disabled={disabled || index === total - 1} onClick={() => onMove(index, index + 1)} aria-label={t("home.moveExerciseDown", { name: exercise.name })}><ArrowDown /></Button>
          </div>
          <Button variant="outline" size="icon-lg" className="size-11 rounded-xl" disabled={disabled} onClick={() => onOpen(exercise)} aria-label={t("home.openExercise", { name: exercise.name })}><Eye /></Button>
        </div>
      </div>
    </Card>
  )
}

export function HomePage() {
  const gym = useGym()
  const { user } = useAuth()
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const [selectedMuscleId, setSelectedMuscleId] = useState("")
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null)
  const [sessionActionLoading, setSessionActionLoading] = useState(false)
  const [finishOpen, setFinishOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [reorderingExercises, setReorderingExercises] = useState(false)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const resolvedSelectedId = gym.muscles.some((muscle) => muscle.id === selectedMuscleId)
    ? selectedMuscleId
    : (gym.muscles[0]?.id ?? "")
  const muscleIndex = Math.max(0, gym.muscles.findIndex((muscle) => muscle.id === resolvedSelectedId))
  const muscle = gym.muscles[muscleIndex]
  const muscleID = muscle?.id
  const activeSessionKey = ["active-session", user?.id, muscleID] as const
  const activeSessionQuery = useQuery({
    queryKey: activeSessionKey,
    queryFn: ({ signal }) => workoutService.getActive(muscleID!, signal),
    enabled: Boolean(muscleID),
    refetchOnWindowFocus: false,
  })
  const activeSession = activeSessionQuery.data ?? null
  const sessionLoading = activeSessionQuery.isLoading || sessionActionLoading

  const completedSets = useMemo(() => activeSession?.sets.filter((set) => set.completed).length ?? 0, [activeSession])
  const totalSets = muscle?.exercises.reduce((total, exercise) => total + exercise.sets.length, 0) ?? 0
  const canFinish = completedSets >= REQUIRED_SETS && activeSession?.status === "active"

  if (gym.loading) {
    return <div className="grid min-h-72 place-items-center"><div className="h-2 w-28 animate-pulse rounded-full bg-primary/30" aria-label={t("home.loading")} /></div>
  }
  if (gym.error) {
    return <div className="grid min-h-72 place-items-center rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center"><div><p className="font-semibold">{t("home.loadError")}</p><Button className="mt-4" variant="outline" onClick={() => void gym.refresh()}>{t("common.retry")}</Button></div></div>
  }
  if (!muscle) {
    return <div className="mx-auto max-w-xl py-20 text-center"><p className="font-display text-2xl font-bold">{t("home.emptyTitle")}</p><p className="mt-2 text-muted-foreground">{t("home.emptyDescription")}</p></div>
  }

  function changeMuscle(direction: -1 | 1) {
    const nextIndex = (muscleIndex + direction + gym.muscles.length) % gym.muscles.length
    setSelectedMuscleId(gym.muscles[nextIndex].id)
  }

  async function persistExerciseOrder(orderedIds: string[]) {
    setReorderingExercises(true)
    try {
      await gym.reorderExercises(muscle.id, orderedIds)
      toast.success(t("home.reorderSuccess"))
    } catch (error) {
      toast.error(localizedError(error, t))
    } finally {
      setReorderingExercises(false)
    }
  }

  function moveExercise(from: number, to: number) {
    if (to < 0 || to >= muscle.exercises.length || from === to) return
    void persistExerciseOrder(movedIds(muscle.exercises, from, to))
  }

  function handleExerciseDragEnd(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) return
    const from = muscle.exercises.findIndex((exercise) => exercise.id === event.active.id)
    const to = muscle.exercises.findIndex((exercise) => exercise.id === event.over?.id)
    if (from >= 0 && to >= 0) void persistExerciseOrder(movedIds(muscle.exercises, from, to))
  }

  async function openExercise(exercise: Exercise) {
    setSessionActionLoading(true)
    try {
      const session = await workoutService.start(muscle.id)
      queryClient.setQueryData(activeSessionKey, session)
      const draftSets = session.sets
        .filter((set) => set.exerciseId === exercise.id)
        .sort((a, b) => a.setNumber - b.setNumber)
        .map((sessionSet) => {
          const planned = exercise.sets.find((set) => set.id === sessionSet.exerciseSetId)
          return {
            id: sessionSet.id,
            position: sessionSet.setNumber - 1,
            reps: sessionSet.reps,
            weight: sessionSet.weight,
            completed: sessionSet.completed,
            history: planned?.history ?? [],
          }
        })
      setEditingExercise({ ...exercise, sets: draftSets })
    } catch (error) {
      toast.error(localizedError(error, t))
    } finally {
      setSessionActionLoading(false)
    }
  }

  async function saveExercise(exercise: Exercise) {
    if (!activeSession) throw new Error(t("home.sessionNotStarted"))
    const plannedExercise = muscle.exercises.find((item) => item.id === exercise.id)
    const updatedSets = await Promise.all(exercise.sets.map((set) => workoutService.updateSet(activeSession.id, set.id, {
      reps: set.reps,
      weight: set.weight,
      completed: set.completed,
    })))
    queryClient.setQueryData<WorkoutSession | null>(activeSessionKey, (current) => current ? {
      ...current,
      sets: current.sets.map((set) => updatedSets.find((updated) => updated.id === set.id) ?? set),
    } : current)
    if (plannedExercise && exercise.name.trim() && exercise.name.trim() !== plannedExercise.name) {
      await gym.updateExercise(exercise.id, exercise.name.trim())
    }
  }

  async function saveSetCompletion(sessionSetId: string, completed: boolean) {
    if (!activeSession) throw new Error(t("home.sessionNotStarted"))
    const previousSet = activeSession.sets.find((set) => set.id === sessionSetId)
    queryClient.setQueryData<WorkoutSession | null>(activeSessionKey, (current) => current ? {
      ...current,
      sets: current.sets.map((set) => set.id === sessionSetId ? { ...set, completed } : set),
    } : current)
    try {
      const updatedSet = await workoutService.updateSet(activeSession.id, sessionSetId, { completed })
      queryClient.setQueryData<WorkoutSession | null>(activeSessionKey, (current) => current ? {
        ...current,
        sets: current.sets.map((set) => set.id === updatedSet.id ? updatedSet : set),
      } : current)
    } catch (error) {
      if (previousSet) {
        queryClient.setQueryData<WorkoutSession | null>(activeSessionKey, (current) => current ? {
          ...current,
          sets: current.sets.map((set) => set.id === sessionSetId ? previousSet : set),
        } : current)
      }
      throw error
    }
  }

  async function confirmFinish() {
    if (!activeSession) return
    try {
      const completed = await workoutService.complete(activeSession.id)
      queryClient.setQueryData(activeSessionKey, null)
      setFinishOpen(false)
      await gym.refresh()
      const count = completed.sets.filter((set) => set.completed).length
      toast.success(t("home.finished"), { description: t("home.completedSetsHistory", { count }) })
    } catch (error) {
      toast.error(localizedError(error, t))
    }
  }

  async function confirmCancel() {
    if (!activeSession) return
    setSessionActionLoading(true)
    try {
      await workoutService.cancel(activeSession.id)
      queryClient.setQueryData(activeSessionKey, null)
      setEditingExercise(null)
      setCancelOpen(false)
      toast.success(t("home.sessionCancelled"))
    } catch (error) {
      toast.error(localizedError(error, t))
    } finally {
      setSessionActionLoading(false)
    }
  }

  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-3xl border border-border bg-card px-3 py-5 min-[380px]:px-4 sm:rounded-[28px] sm:px-8 sm:py-8">
        <div className="pointer-events-none absolute -right-20 -top-28 size-72 rounded-full bg-primary/9 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-primary"><Flame className="size-4" /> {t("home.todayWorkout")}</div>
            <div className="flex w-full items-center gap-2 sm:gap-4">
              <Button variant="outline" size="icon-lg" className="size-11 shrink-0 rounded-xl" onClick={() => changeMuscle(-1)} aria-label={t("home.previousMuscle")}><ChevronLeft /></Button>
              <div className="min-w-0 flex-1 text-center sm:min-w-64"><p className="text-xs font-medium text-muted-foreground">{t("home.selectedMuscle")}</p><h1 className="font-display mt-1 truncate text-3xl font-black uppercase tracking-tight sm:text-5xl">{muscle.name}</h1></div>
              <Button variant="outline" size="icon-lg" className="size-11 shrink-0 rounded-xl" onClick={() => changeMuscle(1)} aria-label={t("home.nextMuscle")}><ChevronRight /></Button>
            </div>
            <div className="mt-5 flex items-center justify-center gap-1.5">{gym.muscles.map((item) => <button key={item.id} type="button" onClick={() => setSelectedMuscleId(item.id)} className={cn("h-1.5 w-4 rounded-full bg-muted-foreground/25 transition-all", item.id === muscle.id && "w-8 bg-primary")} aria-label={t("home.selectMuscle", { name: item.name })} />)}</div>
          </div>
          <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 lg:w-[390px]">
            <div className="rounded-2xl border border-border bg-background/50 p-4"><CalendarClock className="mb-3 size-5 text-primary" /><p className="text-xs text-muted-foreground">{t("home.lastWorkout")}</p><p className="mt-1 text-sm font-bold capitalize">{formatDate(muscle.lastWorkoutAt, i18n.resolvedLanguage ?? "en-US", t("date.never"))}</p></div>
            <div className="rounded-2xl border border-border bg-background/50 p-4"><Trophy className="mb-3 size-5 text-primary" /><p className="text-xs text-muted-foreground">{t("home.currentProgress")}</p><p className="mt-1 font-mono text-sm font-bold">{t("home.setsProgress", { completed: completedSets, total: totalSets })}</p></div>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-primary">{t("home.yourSequence")}</p><h2 className="font-display mt-1 text-2xl font-bold">{t("home.exercises")}</h2><p className="mt-1 text-xs text-muted-foreground">{t("home.reorderHint")}</p></div><Badge variant="secondary">{t("home.exerciseCount", { count: muscle.exercises.length })}</Badge></div>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleExerciseDragEnd}>
          <SortableContext items={muscle.exercises.map((exercise) => exercise.id)} strategy={verticalListSortingStrategy}>
            <div className="grid gap-3">
              {muscle.exercises.map((exercise, exerciseIndex) => {
                const sessionSets = activeSession?.sets.filter((set) => set.exerciseId === exercise.id) ?? []
                const done = sessionSets.filter((set) => set.completed).length
                return (
                  <SortableExerciseCard
                    key={exercise.id}
                    exercise={exercise}
                    index={exerciseIndex}
                    total={muscle.exercises.length}
                    done={done}
                    disabled={sessionLoading || reorderingExercises}
                    onOpen={(item) => void openExercise(item)}
                    onMove={moveExercise}
                  />
                )
              })}
            </div>
          </SortableContext>
        </DndContext>

        <div className="mt-6 min-w-0 rounded-2xl border border-border bg-card/50 p-4 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-5">
          <div className="mb-4 flex min-w-0 items-start gap-3 sm:mb-0"><span className={cn("grid size-9 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground", canFinish && "bg-primary/12 text-primary")}><Info className="size-4" /></span><div><p className="text-sm font-semibold">{t("home.minimumGoal", { count: REQUIRED_SETS })}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{canFinish ? t("home.goalReached", { count: completedSets }) : t("home.setsRemaining", { count: Math.max(0, REQUIRED_SETS - completedSets) })}</p></div></div>
          <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:shrink-0 sm:flex-row">
            {activeSession && <Button variant="ghost" className="h-12 w-full text-destructive hover:text-destructive sm:w-auto" disabled={sessionLoading} onClick={() => setCancelOpen(true)}><XCircle /> {t("home.cancelSession")}</Button>}
            <Button size="lg" className="h-12 w-full rounded-xl px-7 font-bold sm:w-auto" disabled={!canFinish} onClick={() => setFinishOpen(true)}>{t("home.finishWorkout")}</Button>
          </div>
        </div>
      </section>

      {editingExercise && <ExerciseDialog key={`${activeSession?.id}-${editingExercise.id}`} exercise={editingExercise} open onOpenChange={(open) => !open && setEditingExercise(null)} onSave={saveExercise} onSetCompletionChange={saveSetCompletion} />}

      <AlertDialog open={finishOpen} onOpenChange={setFinishOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogMedia><Trophy className="text-primary" /></AlertDialogMedia><AlertDialogTitle>{t("home.finishTitle", { muscle: muscle.name })}</AlertDialogTitle><AlertDialogDescription>{t("home.finishDescription", { count: completedSets })}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t("home.keepTraining")}</AlertDialogCancel><AlertDialogAction onClick={() => void confirmFinish()}>{t("home.confirmFinish")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogMedia><XCircle className="text-destructive" /></AlertDialogMedia><AlertDialogTitle>{t("home.cancelTitle")}</AlertDialogTitle><AlertDialogDescription>{t("home.cancelDescription")}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t("home.keepTraining")}</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={() => void confirmCancel()}>{t("home.cancelSession")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  )
}
