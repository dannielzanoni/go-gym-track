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
import { cn } from "@/lib/utils"
import { ApiError } from "@/services/http/api-error"

function movedIds(items: { id: string }[], from: number, to: number) {
  if (to < 0 || to >= items.length) return items.map((item) => item.id)
  const next = items.map((item) => item.id)
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : "Não foi possível salvar a alteração."
}

export function MusclesPage() {
  const gym = useGym()
  const [selectedId, setSelectedId] = useState("")
  const [deleteMuscleOpen, setDeleteMuscleOpen] = useState(false)
  const selected = gym.muscles.find((muscle) => muscle.id === selectedId) ?? gym.muscles[0]

  async function run(operation: () => Promise<void>, success?: string) {
    try {
      await operation()
      if (success) toast.success(success)
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  async function addMuscle() {
    try {
      const id = await gym.createMuscle("Novo músculo")
      setSelectedId(id)
      toast.success("Músculo criado")
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  async function deleteMuscle() {
    if (!selected) return
    const index = gym.muscles.findIndex((muscle) => muscle.id === selected.id)
    const remaining = gym.muscles.filter((muscle) => muscle.id !== selected.id)
    await run(async () => {
      await gym.deleteMuscle(selected.id)
      setSelectedId(remaining[Math.min(index, remaining.length - 1)]?.id ?? "")
      setDeleteMuscleOpen(false)
    }, "Músculo removido")
  }

  if (gym.loading) {
    return <div className="grid min-h-72 place-items-center"><div className="h-2 w-28 animate-pulse rounded-full bg-primary/30" aria-label="Carregando ficha" /></div>
  }
  if (gym.error) {
    return <div className="grid min-h-72 place-items-center rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center"><div><p className="font-semibold">Não foi possível carregar sua ficha.</p><Button className="mt-4" variant="outline" onClick={() => void gym.refresh()}>Tentar novamente</Button></div></div>
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-primary"><Settings2 className="size-4" /> Configuração</div>
          <h1 className="font-display text-3xl font-black tracking-tight sm:text-4xl">Músculos & exercícios</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">Monte sua divisão de treino. As alterações são persistidas na sua conta.</p>
        </div>
        <Button onClick={() => void addMuscle()} className="h-11 w-full rounded-xl sm:w-auto"><Plus /> Novo músculo</Button>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[280px_1fr]">
        <Card className="gap-3 border-white/7 bg-card/70 p-3 lg:sticky lg:top-24">
          <div className="flex items-center justify-between px-2 py-1"><p className="text-xs font-bold uppercase tracking-[.14em] text-muted-foreground">Sua divisão</p><Badge variant="secondary">{gym.muscles.length}</Badge></div>
          <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:flex-col lg:overflow-visible">
            {gym.muscles.map((muscle, index) => (
              <div key={muscle.id} className={cn("flex min-w-44 snap-start items-center gap-1 rounded-xl border border-transparent p-1 transition-colors lg:min-w-0", selected?.id === muscle.id && "border-primary/15 bg-primary/7")}>
                <button type="button" onClick={() => setSelectedId(muscle.id)} className={cn("min-w-0 flex-1 truncate rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-muted-foreground", selected?.id === muscle.id && "text-foreground")}>{muscle.name}</button>
                <div className="flex lg:flex-col">
                  <Button variant="ghost" size="icon-xs" disabled={index === 0} onClick={() => void run(() => gym.reorderMuscles(movedIds(gym.muscles, index, index - 1)))} aria-label={`Mover ${muscle.name} para cima`}><ArrowUp /></Button>
                  <Button variant="ghost" size="icon-xs" disabled={index === gym.muscles.length - 1} onClick={() => void run(() => gym.reorderMuscles(movedIds(gym.muscles, index, index + 1)))} aria-label={`Mover ${muscle.name} para baixo`}><ArrowDown /></Button>
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
                  <Input key={`${selected.id}-${selected.name}`} id="muscle-name" defaultValue={selected.name} onBlur={(event) => { const name = event.target.value.trim(); if (name && name !== selected.name) void run(() => gym.updateMuscle(selected.id, name), "Músculo atualizado") }} className="h-11 max-w-md font-display text-lg font-bold" />
                </div>
                <Button variant="destructive" size="icon" onClick={() => setDeleteMuscleOpen(true)} aria-label="Excluir músculo"><Trash2 /></Button>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><Save className="size-3.5 text-primary" /> Alterações salvas na sua conta ao sair do campo.</div>
            </Card>

            <div className="flex items-center justify-between gap-3">
              <div><p className="text-xs font-semibold uppercase tracking-[.14em] text-primary">Ficha de {selected.name}</p><h2 className="font-display mt-1 text-xl font-bold">Exercícios cadastrados</h2></div>
              <Button variant="outline" onClick={() => void run(() => gym.createExercise(selected.id, "Novo exercício", Array.from({ length: 4 }, (_, index) => ({ targetReps: index > 1 ? 8 : 10, targetWeight: 0 }))), "Exercício adicionado")}><Plus /> Exercício</Button>
            </div>

            <div className="space-y-4">
              {selected.exercises.map((exercise, exerciseIndex) => (
                <Card key={exercise.id} className="gap-0 overflow-hidden border-white/7 bg-card/65 p-0">
                  <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:p-5">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 font-mono text-xs font-black text-primary">{String(exerciseIndex + 1).padStart(2, "0")}</span>
                    <div className="min-w-0 flex-1">
                      <Label htmlFor={`exercise-${exercise.id}`} className="sr-only">Nome do exercício</Label>
                      <Input key={`${exercise.id}-${exercise.name}`} id={`exercise-${exercise.id}`} defaultValue={exercise.name} onBlur={(event) => { const name = event.target.value.trim(); if (name && name !== exercise.name) void run(() => gym.updateExercise(exercise.id, name), "Exercício atualizado") }} className="h-10 font-semibold" />
                    </div>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" disabled={exerciseIndex === 0} onClick={() => void run(() => gym.reorderExercises(selected.id, movedIds(selected.exercises, exerciseIndex, exerciseIndex - 1)))} aria-label="Mover exercício para cima"><ArrowUp /></Button>
                      <Button variant="ghost" size="icon" disabled={exerciseIndex === selected.exercises.length - 1} onClick={() => void run(() => gym.reorderExercises(selected.id, movedIds(selected.exercises, exerciseIndex, exerciseIndex + 1)))} aria-label="Mover exercício para baixo"><ArrowDown /></Button>
                      <Button variant="destructive" size="icon" onClick={() => void run(() => gym.deleteExercise(exercise.id), "Exercício removido")} aria-label="Excluir exercício"><Trash2 /></Button>
                    </div>
                  </div>

                  <Separator />
                  <div className="bg-background/35 p-4 sm:p-5">
                    <div className="mb-3 flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-[.14em] text-muted-foreground">Séries</p><Badge variant="outline">{exercise.sets.length} total</Badge></div>
                    <div className="space-y-2">
                      {exercise.sets.map((set, setIndex) => (
                        <div key={set.id} className="grid grid-cols-[28px_minmax(0,1fr)_minmax(0,1fr)] items-end gap-2 rounded-xl border border-white/6 bg-card/60 p-2.5 sm:grid-cols-[34px_1fr_1fr_auto] sm:gap-3">
                          <span className="grid h-9 place-items-center font-mono text-xs font-bold text-muted-foreground">{setIndex + 1}</span>
                          <div className="space-y-1"><Label htmlFor={`set-reps-${set.id}`} className="text-[10px] uppercase tracking-wide text-muted-foreground">Reps</Label><Input key={`${set.id}-reps-${set.reps}`} id={`set-reps-${set.id}`} type="number" min="0" defaultValue={set.reps} onBlur={(event) => { const reps = Math.max(0, Number(event.target.value) || 0); if (reps !== set.reps) void run(() => gym.updateExerciseSet(set.id, { targetReps: reps, targetWeight: set.weight })) }} className="h-9 text-center font-mono" /></div>
                          <div className="space-y-1"><Label htmlFor={`set-weight-${set.id}`} className="text-[10px] uppercase tracking-wide text-muted-foreground">Carga</Label><Input key={`${set.id}-weight-${set.weight}`} id={`set-weight-${set.id}`} type="number" min="0" step="0.5" defaultValue={set.weight} onBlur={(event) => { const weight = Math.max(0, Number(event.target.value) || 0); if (weight !== set.weight) void run(() => gym.updateExerciseSet(set.id, { targetReps: set.reps, targetWeight: weight })) }} className="h-9 text-center font-mono" /></div>
                          <div className="col-span-3 mt-1 flex items-center justify-end border-t border-white/6 pt-2 sm:col-span-1 sm:mt-0 sm:border-0 sm:pb-0.5 sm:pt-0">
                            <Button variant="ghost" size="icon-xs" disabled={setIndex === 0} onClick={() => void run(() => gym.reorderExerciseSets(exercise.id, movedIds(exercise.sets, setIndex, setIndex - 1)))} aria-label="Mover série para cima"><ArrowUp /></Button>
                            <Button variant="ghost" size="icon-xs" disabled={setIndex === exercise.sets.length - 1} onClick={() => void run(() => gym.reorderExerciseSets(exercise.id, movedIds(exercise.sets, setIndex, setIndex + 1)))} aria-label="Mover série para baixo"><ArrowDown /></Button>
                            <Button variant="ghost" size="icon-xs" className="text-destructive" onClick={() => void run(() => gym.deleteExerciseSet(set.id), "Série removida")} aria-label="Excluir série"><Trash2 /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button variant="ghost" className="mt-3 w-full border border-dashed border-border text-muted-foreground" onClick={() => void run(() => gym.createExerciseSet(exercise.id, { targetReps: exercise.sets.length > 1 ? 8 : 10, targetWeight: 0 }), "Série adicionada")}><Plus /> Adicionar série</Button>
                  </div>
                </Card>
              ))}

              {!selected.exercises.length && <div className="grid min-h-56 place-items-center rounded-2xl border border-dashed border-border bg-card/30 p-8 text-center"><div><Dumbbell className="mx-auto size-8 text-primary" /><p className="mt-3 font-semibold">Nenhum exercício cadastrado</p><p className="mt-1 text-sm text-muted-foreground">Adicione o primeiro exercício desta ficha.</p></div></div>}
            </div>
          </div>
        ) : <div className="grid min-h-72 place-items-center rounded-2xl border border-dashed border-border text-center text-muted-foreground">Crie um músculo para começar.</div>}
      </div>

      <AlertDialog open={deleteMuscleOpen} onOpenChange={setDeleteMuscleOpen}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir {selected?.name}?</AlertDialogTitle><AlertDialogDescription>A ficha será removida da sua conta. Sessões concluídas preservam snapshots para o histórico.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={() => void deleteMuscle()}>Excluir músculo</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
