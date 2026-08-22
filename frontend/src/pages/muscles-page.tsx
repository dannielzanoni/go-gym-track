import { useState } from "react"
import { ArrowDown, ArrowUp, Dumbbell, Plus, Save, Settings2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useGym } from "@/context/gym-context"
import { cn, createId } from "@/lib/utils"
import type { Exercise, ExerciseSet, Muscle } from "@/types/gym"

function moveItem<T>(items: T[], from: number, to: number) {
  if (to < 0 || to >= items.length) return items
  const next = [...items]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

function newSet(index: number): ExerciseSet {
  return { id: createId("set"), reps: index > 1 ? 8 : 10, weight: 0, completed: false, history: [] }
}

export function MusclesPage() {
  const { state, setMuscles } = useGym()
  const [selectedId, setSelectedId] = useState(() => state.muscles[0]?.id ?? "")
  const [deleteMuscleOpen, setDeleteMuscleOpen] = useState(false)
  const selected = state.muscles.find((muscle) => muscle.id === selectedId) ?? state.muscles[0]

  function updateSelected(updater: (muscle: Muscle) => Muscle) {
    if (!selected) return
    setMuscles((muscles) => muscles.map((muscle) => muscle.id === selected.id ? updater(muscle) : muscle))
  }

  function addMuscle() {
    const muscle: Muscle = { id: createId("muscle"), name: "Novo músculo", lastWorkoutAt: null, exercises: [] }
    setMuscles((muscles) => [...muscles, muscle])
    setSelectedId(muscle.id)
    toast.success("Músculo criado")
  }

  function deleteMuscle() {
    if (!selected) return
    const index = state.muscles.findIndex((muscle) => muscle.id === selected.id)
    const remaining = state.muscles.filter((muscle) => muscle.id !== selected.id)
    setMuscles(() => remaining)
    setSelectedId(remaining[Math.min(index, remaining.length - 1)]?.id ?? "")
    setDeleteMuscleOpen(false)
    toast.success("Músculo removido")
  }

  function addExercise() {
    const exercise: Exercise = {
      id: createId("exercise"),
      name: "Novo exercício",
      sets: Array.from({ length: 4 }, (_, index) => newSet(index)),
    }
    updateSelected((muscle) => ({ ...muscle, exercises: [...muscle.exercises, exercise] }))
    toast.success("Exercício adicionado")
  }

  function updateExercise(exerciseId: string, updater: (exercise: Exercise) => Exercise) {
    updateSelected((muscle) => ({
      ...muscle,
      exercises: muscle.exercises.map((exercise) => exercise.id === exerciseId ? updater(exercise) : exercise),
    }))
  }

  function deleteExercise(exerciseId: string) {
    updateSelected((muscle) => ({ ...muscle, exercises: muscle.exercises.filter((exercise) => exercise.id !== exerciseId) }))
    toast.success("Exercício removido")
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-primary"><Settings2 className="size-4" /> Configuração</div>
          <h1 className="font-display text-3xl font-black tracking-tight sm:text-4xl">Músculos & exercícios</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">Monte sua divisão de treino, defina as séries e deixe tudo pronto para registrar a próxima sessão.</p>
        </div>
        <Button onClick={addMuscle} className="h-11 w-full rounded-xl sm:w-auto"><Plus /> Novo músculo</Button>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[280px_1fr]">
        <Card className="gap-3 border-white/7 bg-card/70 p-3 lg:sticky lg:top-24">
          <div className="flex items-center justify-between px-2 py-1">
            <p className="text-xs font-bold uppercase tracking-[.14em] text-muted-foreground">Sua divisão</p>
            <Badge variant="secondary">{state.muscles.length}</Badge>
          </div>
          <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:flex-col lg:overflow-visible">
            {state.muscles.map((muscle, index) => (
              <div key={muscle.id} className={cn("flex min-w-44 snap-start items-center gap-1 rounded-xl border border-transparent p-1 transition-colors lg:min-w-0", selected?.id === muscle.id && "border-primary/15 bg-primary/7")}>
                <button type="button" onClick={() => setSelectedId(muscle.id)} className={cn("min-w-0 flex-1 truncate rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-muted-foreground", selected?.id === muscle.id && "text-foreground")}>{muscle.name}</button>
                <div className="flex lg:flex-col">
                  <Button variant="ghost" size="icon-xs" disabled={index === 0} onClick={() => setMuscles((items) => moveItem(items, index, index - 1))} aria-label={`Mover ${muscle.name} para cima`}><ArrowUp /></Button>
                  <Button variant="ghost" size="icon-xs" disabled={index === state.muscles.length - 1} onClick={() => setMuscles((items) => moveItem(items, index, index + 1))} aria-label={`Mover ${muscle.name} para baixo`}><ArrowDown /></Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {selected ? (
          <div className="space-y-5">
            <Card className="gap-5 border-white/7 bg-card/70 p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-2">
                  <Label htmlFor="muscle-name">Nome do músculo</Label>
                  <Input id="muscle-name" value={selected.name} onChange={(event) => updateSelected((muscle) => ({ ...muscle, name: event.target.value }))} className="h-11 max-w-md font-display text-lg font-bold" />
                </div>
                <Button variant="destructive" size="icon" onClick={() => setDeleteMuscleOpen(true)} aria-label="Excluir músculo"><Trash2 /></Button>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><Save className="size-3.5 text-primary" /> Alterações salvas automaticamente neste dispositivo.</div>
            </Card>

            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.14em] text-primary">Ficha de {selected.name}</p>
                <h2 className="font-display mt-1 text-xl font-bold">Exercícios cadastrados</h2>
              </div>
              <Button variant="outline" onClick={addExercise}><Plus /> Exercício</Button>
            </div>

            <div className="space-y-4">
              {selected.exercises.map((exercise, exerciseIndex) => (
                <Card key={exercise.id} className="gap-0 overflow-hidden border-white/7 bg-card/65 p-0">
                  <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:p-5">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 font-mono text-xs font-black text-primary">{String(exerciseIndex + 1).padStart(2, "0")}</span>
                    <div className="min-w-0 flex-1">
                      <Label htmlFor={`exercise-${exercise.id}`} className="sr-only">Nome do exercício</Label>
                      <Input id={`exercise-${exercise.id}`} value={exercise.name} onChange={(event) => updateExercise(exercise.id, (item) => ({ ...item, name: event.target.value }))} className="h-10 font-semibold" />
                    </div>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" disabled={exerciseIndex === 0} onClick={() => updateSelected((muscle) => ({ ...muscle, exercises: moveItem(muscle.exercises, exerciseIndex, exerciseIndex - 1) }))} aria-label="Mover exercício para cima"><ArrowUp /></Button>
                      <Button variant="ghost" size="icon" disabled={exerciseIndex === selected.exercises.length - 1} onClick={() => updateSelected((muscle) => ({ ...muscle, exercises: moveItem(muscle.exercises, exerciseIndex, exerciseIndex + 1) }))} aria-label="Mover exercício para baixo"><ArrowDown /></Button>
                      <Button variant="destructive" size="icon" onClick={() => deleteExercise(exercise.id)} aria-label="Excluir exercício"><Trash2 /></Button>
                    </div>
                  </div>

                  <Separator />
                  <div className="bg-background/35 p-4 sm:p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-[.14em] text-muted-foreground">Séries</p>
                      <Badge variant="outline">{exercise.sets.length} total</Badge>
                    </div>
                    <div className="space-y-2">
                      {exercise.sets.map((set, setIndex) => (
                        <div key={set.id} className="grid grid-cols-[28px_minmax(0,1fr)_minmax(0,1fr)] items-end gap-2 rounded-xl border border-white/6 bg-card/60 p-2.5 sm:grid-cols-[34px_1fr_1fr_auto] sm:gap-3">
                          <span className="grid h-9 place-items-center font-mono text-xs font-bold text-muted-foreground">{setIndex + 1}</span>
                          <div className="space-y-1">
                            <Label htmlFor={`set-reps-${set.id}`} className="text-[10px] uppercase tracking-wide text-muted-foreground">Reps</Label>
                            <Input id={`set-reps-${set.id}`} type="number" min="0" value={set.reps} onChange={(event) => updateExercise(exercise.id, (item) => ({ ...item, sets: item.sets.map((current) => current.id === set.id ? { ...current, reps: Math.max(0, Number(event.target.value) || 0) } : current) }))} className="h-9 text-center font-mono" />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor={`set-weight-${set.id}`} className="text-[10px] uppercase tracking-wide text-muted-foreground">Carga</Label>
                            <Input id={`set-weight-${set.id}`} type="number" min="0" step="0.5" value={set.weight} onChange={(event) => updateExercise(exercise.id, (item) => ({ ...item, sets: item.sets.map((current) => current.id === set.id ? { ...current, weight: Math.max(0, Number(event.target.value) || 0) } : current) }))} className="h-9 text-center font-mono" />
                          </div>
                          <div className="col-span-3 mt-1 flex items-center justify-end border-t border-white/6 pt-2 sm:col-span-1 sm:mt-0 sm:border-0 sm:pb-0.5 sm:pt-0">
                            <Button variant="ghost" size="icon-xs" disabled={setIndex === 0} onClick={() => updateExercise(exercise.id, (item) => ({ ...item, sets: moveItem(item.sets, setIndex, setIndex - 1) }))} aria-label="Mover série para cima"><ArrowUp /></Button>
                            <Button variant="ghost" size="icon-xs" disabled={setIndex === exercise.sets.length - 1} onClick={() => updateExercise(exercise.id, (item) => ({ ...item, sets: moveItem(item.sets, setIndex, setIndex + 1) }))} aria-label="Mover série para baixo"><ArrowDown /></Button>
                            <Button variant="ghost" size="icon-xs" className="text-destructive" onClick={() => updateExercise(exercise.id, (item) => ({ ...item, sets: item.sets.filter((current) => current.id !== set.id) }))} aria-label="Excluir série"><Trash2 /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button variant="ghost" className="mt-3 w-full border border-dashed border-border text-muted-foreground" onClick={() => updateExercise(exercise.id, (item) => ({ ...item, sets: [...item.sets, newSet(item.sets.length)] }))}><Plus /> Adicionar série</Button>
                  </div>
                </Card>
              ))}

              {!selected.exercises.length && (
                <div className="grid min-h-56 place-items-center rounded-2xl border border-dashed border-border bg-card/30 p-8 text-center">
                  <div><Dumbbell className="mx-auto size-8 text-primary" /><p className="mt-3 font-semibold">Nenhum exercício cadastrado</p><p className="mt-1 text-sm text-muted-foreground">Adicione o primeiro exercício desta ficha.</p></div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid min-h-72 place-items-center rounded-2xl border border-dashed border-border text-center text-muted-foreground">Crie um músculo para começar.</div>
        )}
      </div>

      <AlertDialog open={deleteMuscleOpen} onOpenChange={setDeleteMuscleOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selected?.name}?</AlertDialogTitle>
            <AlertDialogDescription>Todos os exercícios e séries dessa ficha serão removidos deste dispositivo. Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={deleteMuscle}>Excluir músculo</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
