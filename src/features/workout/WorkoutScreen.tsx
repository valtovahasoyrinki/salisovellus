import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { useReducedMotion } from 'motion/react'
import { addExerciseToDay, listDayExercises } from '@/db/repositories/programRepo'
import {
  addExerciseToSession,
  deleteSession,
  finishSession,
  getSessionDetail,
  reorderSessionExercises,
} from '@/db/repositories/sessionRepo'
import { workSets } from '@/domain/volume'
import type { Exercise } from '@/domain/types'
import { Button, IconButton } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DragList } from '@/components/ui/DragList'
import { EmptyState } from '@/components/ui/EmptyState'
import { ScreenSkeleton } from '@/components/ui/Skeleton'
import { Sheet } from '@/components/ui/Sheet'
import { Toggle } from '@/components/ui/Toggle'
import { CloseIcon, DumbbellIcon, PlusIcon, SwapIcon } from '@/components/icons'
import { useRestTimer } from '@/app/providers/RestTimerProvider'
import { useToast } from '@/app/providers/ToastProvider'
import { useSettings } from '@/app/useSettings'
import { ExercisePickerSheet } from '@/features/exercises/ExercisePickerSheet'
import { formatClock } from '@/lib/date'
import { scrollIntoViewWhenReady } from '@/lib/scroll'
import { disableWakeLock, enableWakeLock } from '@/lib/wakeLock'
import { useNow } from '@/lib/useNow'
import { ExerciseCard, recordToastText } from './ExerciseCard'

export function WorkoutScreen() {
  const { sessionId = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const restTimer = useRestTimer()
  const settings = useSettings()
  const now = useNow(1000)
  const reducedMotion = useReducedMotion()

  const detail = useLiveQuery(
    async () => (await getSessionDetail(sessionId)) ?? null,
    [sessionId],
    undefined,
  )
  const dayId = detail?.session.dayId
  const dayExercises = useLiveQuery(
    async () => (dayId === undefined ? [] : listDayExercises(dayId)),
    [dayId],
    [],
  )

  const [adding, setAdding] = useState(false)
  const [addToProgram, setAddToProgram] = useState(false)
  const [reordering, setReordering] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [discarding, setDiscarding] = useState(false)

  // Ruutu pysyy päällä treenin ajan, jos selain tukee (SPEC §6.3).
  useEffect(() => {
    void enableWakeLock()
    return () => {
      void disableWakeLock()
    }
  }, [])

  const targetsByExercise = useMemo(
    () => new Map(dayExercises.map((row) => [row.exerciseId, row])),
    [dayExercises],
  )

  const totals = useMemo(() => {
    if (!detail) return { done: 0, target: 0, incomplete: [] as string[] }
    let done = 0
    let target = 0
    const incomplete: string[] = []
    for (const item of detail.exercises) {
      const logged = workSets(item.sets).length
      const planned = targetsByExercise.get(item.exercise.id)?.targetSets ?? logged
      done += logged
      target += planned
      if (!item.row.skipped && logged < planned) {
        incomplete.push(`${item.exercise.name} ${logged}/${planned}`)
      }
    }
    return { done, target, incomplete }
  }, [detail, targetsByExercise])

  if (detail === undefined) return <ScreenSkeleton />
  if (detail === null) {
    return (
      <EmptyState
        title="Treeniä ei löytynyt"
        description="Treeni on voitu poistaa. Palaa kotiin ja aloita uusi."
        action={
          <Button variant="primary" onClick={() => void navigate('/')}>
            Kotiin
          </Button>
        }
      />
    )
  }

  if (detail.session.status === 'done') {
    void navigate(`/workout/${sessionId}/summary`, { replace: true })
    return <ScreenSkeleton />
  }

  const elapsedSec = Math.max(0, (now - detail.session.startedAt) / 1000)

  /*
    Liikkeen lisäys treeniin (valittu tai juuri luotu). Kirjatut sarjat ja
    käynnissä oleva lepoajastin eivät muutu: tämä vain lisää uuden rivin.
  */
  const addToWorkout = (exercise: Exercise, message: string): void => {
    void addExerciseToSession(sessionId, exercise.id).then(() => {
      toast.show(`${exercise.name} ${message}`, { tone: 'good' })
      scrollIntoViewWhenReady(`liike-${exercise.id}`, !reducedMotion)
    })
    if (addToProgram && dayId !== undefined) {
      void addExerciseToDay(dayId, exercise.id, {
        targetSets: 3,
        repRange: exercise.defaultRepRange,
      })
    }
  }

  return (
    <div className="min-h-dvh pb-40">
      <header className="safe-top sticky top-0 z-30 border-b border-border bg-bg/90 px-3 backdrop-blur-xl">
        <div className="flex min-h-14 items-center gap-2">
          <IconButton label="Sulje treeni" onClick={() => void navigate('/')}>
            <CloseIcon />
          </IconButton>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold">{detail.session.dayName}</h1>
            <p className="num text-xs text-muted">
              {formatClock(elapsedSec)} · {totals.done}/{totals.target} sarjaa
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={() => setFinishing(true)}>
            Päätä
          </Button>
        </div>
      </header>

      {detail.exercises.length === 0 ? (
        <EmptyState
          title="Ei liikkeitä"
          description="Lisää liikkeet tähän treeniin. Voit lisätä ne vain tälle kerralle tai myös ohjelmaan."
          icon={<DumbbellIcon size={28} />}
          action={
            <Button variant="primary" icon={<PlusIcon size={18} />} onClick={() => setAdding(true)}>
              Lisää liike
            </Button>
          }
        />
      ) : (
        <ol className="space-y-3 px-3 pt-3">
          {detail.exercises.map((item, index) => (
            <ExerciseCard
              key={item.row.id}
              index={index}
              exercise={item.exercise}
              row={item.row}
              sets={item.sets}
              sessionId={sessionId}
              domId={`liike-${item.exercise.id}`}
              {...(targetsByExercise.get(item.exercise.id)
                ? { dayExercise: targetsByExercise.get(item.exercise.id) }
                : {})}
              fallbackRestSec={settings.defaultRestSec}
              onRecords={(name, labels) =>
                toast.show(recordToastText(name, labels), { tone: 'good', durationMs: 5000 })
              }
            />
          ))}
        </ol>
      )}

      {/* Tärkeimmät toiminnot ruudun alaosassa, yhden käden ulottuvilla. */}
      <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg/95 px-3 py-2 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg gap-2">
          <Button variant="secondary" fullWidth icon={<PlusIcon size={18} />} onClick={() => setAdding(true)}>
            Lisää liike
          </Button>
          <Button
            variant="secondary"
            icon={<SwapIcon size={18} />}
            onClick={() => setReordering(true)}
            disabled={detail.exercises.length < 2}
          >
            Järjestä
          </Button>
        </div>
      </div>

      <ExercisePickerSheet
        open={adding}
        onClose={() => setAdding(false)}
        title="Lisää liike"
        createLabel="Luo ja lisää treeniin"
        multiple
        selectedIds={new Set(detail.exercises.map((item) => item.exercise.id))}
        header={
          <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-2 px-3 py-2.5">
            <span className="text-sm">Lisää myös ohjelmaan</span>
            <Toggle
              checked={addToProgram}
              onChange={setAddToProgram}
              label="Lisää liike myös ohjelman treenipäivään"
              disabled={dayId === undefined}
            />
          </div>
        }
        onPick={(exercise: Exercise) => addToWorkout(exercise, 'lisätty treeniin')}
        onCreated={(exercise: Exercise) => addToWorkout(exercise, 'luotu ja lisätty treeniin')}
      />

      <Sheet open={reordering} onClose={() => setReordering(false)} title="Liikkeiden järjestys">
        <DragList
          items={detail.exercises}
          label="Treenin liikkeet"
          getKey={(item) => item.row.id}
          getLabel={(item) => item.exercise.name}
          onReorder={(next) => {
            void reorderSessionExercises(next.map((item) => item.row.id))
          }}
          renderItem={(item, handle) => (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-1 p-3">
              {handle}
              <span className="min-w-0 flex-1 truncate text-[0.9375rem]">{item.exercise.name}</span>
              <span className="num text-xs text-muted">{workSets(item.sets).length} sarjaa</span>
            </div>
          )}
        />
        <Button variant="primary" fullWidth className="mt-4" onClick={() => setReordering(false)}>
          Valmis
        </Button>
      </Sheet>

      <ConfirmDialog
        open={finishing}
        title="Päätä treeni?"
        details={
          totals.incomplete.length > 0
            ? `Kuittaamattomia sarjoja: ${totals.incomplete.join(', ')}.`
            : `${totals.done} työsarjaa kirjattu.`
        }
        confirmLabel="Päätä treeni"
        cancelLabel="Jatka"
        tone="neutral"
        onCancel={() => setFinishing(false)}
        onConfirm={() => {
          setFinishing(false)
          if (totals.done === 0) {
            setDiscarding(true)
            return
          }
          restTimer.skip()
          void finishSession(sessionId).then(() => {
            void navigate(`/workout/${sessionId}/summary`, { replace: true })
          })
        }}
      />

      <ConfirmDialog
        open={discarding}
        title="Treenissä ei ole yhtään kirjattua sarjaa"
        details="Tyhjää treeniä ei tallenneta historiaan. Haluatko poistaa sen?"
        confirmLabel="Poista treeni"
        cancelLabel="Jatka treeniä"
        onCancel={() => setDiscarding(false)}
        onConfirm={() => {
          setDiscarding(false)
          restTimer.skip()
          void deleteSession(sessionId).then(() => void navigate('/', { replace: true }))
        }}
      />
    </div>
  )
}
