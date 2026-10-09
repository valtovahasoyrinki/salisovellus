import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import {
  deleteSet,
  logSet,
  removeExerciseFromSession,
  restoreSet,
  updateSessionExercise,
  updateSet,
} from '@/db/repositories/sessionRepo'
import { detectNewRecords, recordLabel } from '@/domain/records'
import { workSets } from '@/domain/volume'
import type { DayExercise, Exercise, SessionExercise, SetEntry } from '@/domain/types'
import { Button, IconButton } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Sheet } from '@/components/ui/Sheet'
import { TextArea } from '@/components/ui/TextArea'
import { MoreIcon, PlusIcon } from '@/components/icons'
import { useToast } from '@/app/providers/ToastProvider'
import { useRestTimer } from '@/app/providers/RestTimerProvider'
import { haptic } from '@/lib/haptics'
import { formatNumber } from '@/lib/format'
import { SetRow } from './SetRow'
import { initialSetValues, useExerciseContext } from './useWorkoutData'

export interface ExerciseCardProps {
  index: number
  exercise: Exercise
  row: SessionExercise
  sets: SetEntry[]
  sessionId: string
  dayExercise?: DayExercise
  fallbackRestSec: number
  onRecords: (exerciseName: string, kinds: string[]) => void
}

interface RowEdit {
  weight?: number
  reps?: number
  durationSec?: number
  warmup?: boolean
}

export function ExerciseCard({
  index,
  exercise,
  row,
  sets,
  sessionId,
  dayExercise,
  fallbackRestSec,
  onRecords,
}: ExerciseCardProps) {
  const navigate = useNavigate()
  const toast = useToast()
  const restTimer = useRestTimer()
  const context = useExerciseContext({ exercise, sessionId, dayExercise, fallbackRestSec })

  const [edits, setEdits] = useState<Record<number, RowEdit>>({})
  const [extraRows, setExtraRows] = useState(0)
  const [removedRows, setRemovedRows] = useState(0)
  const [noteOpen, setNoteOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const loggedWorkSets = useMemo(() => workSets(sets), [sets])
  const plannedCount = Math.max(
    0,
    context.targetSets - loggedWorkSets.length - removedRows + extraRows,
  )

  const lastRow = sets.at(-1)
  const previousSummary = useMemo(() => {
    const previous = context.previousWorkSets
    if (previous.length === 0) return null
    return previous
      .map((set) =>
        exercise.kind === 'time'
          ? `${set.durationSec ?? 0} s`
          : `${formatNumber(set.weight)} × ${set.reps}`,
      )
      .join(' · ')
  }, [context.previousWorkSets, exercise.kind])

  const confirmSet = async (plannedIndex: number): Promise<void> => {
    const values = plannedValues(plannedIndex)
    const entry = await logSet({
      sessionExerciseId: row.id,
      exerciseId: exercise.id,
      weight: values.weight,
      reps: values.reps,
      warmup: values.warmup,
      ...(exercise.kind === 'time' ? { durationSec: values.durationSec } : {}),
    })

    // Rivin paikalliset muokkaukset siirtyivät tietokantaan.
    setEdits((current) => {
      const next = { ...current }
      delete next[plannedIndex]
      return next
    })

    if (values.warmup) {
      haptic('tap')
      return
    }

    restTimer.start({
      totalSec: context.restSec,
      exerciseName: exercise.name,
      sessionId,
    })

    /*
      Vertailutasoon kuuluvat myös tämän treenin aiemmat sarjat: muuten saman
      treenin toinen samanlainen sarja näyttäisi uudelta ennätykseltä.
    */
    const records = detectNewRecords(entry, [...context.history, ...sets])
    if (records.length > 0) {
      haptic('record')
      onRecords(exercise.name, records.map(recordLabel))
    } else {
      haptic('success')
    }
  }

  /** Esitäytetyn rivin arvot: paikallinen muokkaus tai laskettu lähtöarvo. */
  function plannedValues(plannedIndex: number): {
    weight: number
    reps: number
    warmup: boolean
    durationSec: number
  } {
    const edit = edits[plannedIndex] ?? {}
    const workSetIndex = loggedWorkSets.length + plannedIndex
    const base = initialSetValues({
      workSetIndex,
      suggestion: context.suggestion,
      previousWorkSets: context.previousWorkSets,
      ...(lastRow ? { lastRowInSession: { weight: lastRow.weight, reps: lastRow.reps } } : {}),
      repRange: context.repRange,
      isBodyweight: exercise.kind === 'bodyweight',
    })
    return {
      weight: edit.weight ?? base.weight,
      reps: edit.reps ?? base.reps,
      warmup: edit.warmup ?? false,
      durationSec: edit.durationSec ?? context.previousWorkSets.at(-1)?.durationSec ?? 45,
    }
  }

  const patchPlanned = (plannedIndex: number, patch: RowEdit): void => {
    setEdits((current) => ({
      ...current,
      [plannedIndex]: { ...plannedValues(plannedIndex), ...current[plannedIndex], ...patch },
    }))
  }

  /*
    Rivit numeroidaan ennen renderöintiä: lämmittelyt eivät kuluta
    työsarjanumeroa, ja esitäytetyt rivit jatkavat kirjattujen numerointia.
  */
  type RenderRow =
    | { type: 'logged'; set: SetEntry; label: string; comparison: SetEntry | undefined }
    | {
        type: 'planned'
        plannedIndex: number
        values: { weight: number; reps: number; warmup: boolean; durationSec: number }
        label: string
        comparison: SetEntry | undefined
      }

  const renderRows: RenderRow[] = []
  let workSetNumber = 0

  for (const set of sets) {
    if (!set.warmup) workSetNumber += 1
    renderRows.push({
      type: 'logged',
      set,
      label: String(workSetNumber),
      comparison: set.warmup ? undefined : context.previousWorkSets[workSetNumber - 1],
    })
  }

  for (let plannedIndex = 0; plannedIndex < plannedCount; plannedIndex += 1) {
    const values = plannedValues(plannedIndex)
    if (!values.warmup) workSetNumber += 1
    renderRows.push({
      type: 'planned',
      plannedIndex,
      values,
      label: String(workSetNumber),
      comparison: values.warmup ? undefined : context.previousWorkSets[workSetNumber - 1],
    })
  }

  return (
    <Card as="li" className="overflow-hidden">
      <div className="flex items-start gap-2 px-3 pt-3">
        <span className="num mt-1 w-5 shrink-0 text-center text-sm text-faint">{index + 1}</span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[0.9375rem] leading-tight font-semibold">{exercise.name}</h2>
          <p className="num mt-0.5 text-xs text-muted">
            {loggedWorkSets.length}/{context.targetSets} sarjaa · tavoite{' '}
            {context.repRange.min}–{context.repRange.max} toistoa
          </p>
        </div>
        {row.skipped ? <Badge>Ohitettu</Badge> : null}
        <IconButton label={`Lisätoiminnot: ${exercise.name}`} onClick={() => setMenuOpen(true)}>
          <MoreIcon size={20} />
        </IconButton>
      </div>

      {previousSummary === null ? (
        <p className="px-3 pt-2 text-xs text-muted">Ensimmäinen kerta tällä liikkeellä.</p>
      ) : (
        <p className="num px-3 pt-2 text-xs text-muted">Viimeksi {previousSummary}</p>
      )}

      {context.suggestion && loggedWorkSets.length === 0 ? (
        <p className="px-3 pt-1 text-xs text-accent">{context.suggestion.message}</p>
      ) : null}

      {row.note === '' ? null : (
        <p className="mx-3 mt-2 rounded-lg bg-surface-2 px-3 py-2 text-xs text-muted">{row.note}</p>
      )}

      <div className="space-y-1.5 p-3">
        {renderRows.map((entry) =>
          entry.type === 'logged' ? (
            <SetRow
              key={entry.set.id}
              label={entry.label}
              weight={entry.set.weight}
              reps={entry.set.reps}
              warmup={entry.set.warmup}
              {...(entry.set.durationSec === undefined ? {} : { durationSec: entry.set.durationSec })}
              kind={exercise.kind}
              increment={exercise.increment}
              logged
              {...(entry.comparison ? { previousSet: entry.comparison } : {})}
              onChange={(patch) => void updateSet(entry.set.id, patch)}
              onToggleWarmup={() => void updateSet(entry.set.id, { warmup: !entry.set.warmup })}
              deleteLabel={`Poista sarja ${entry.label}`}
              onDelete={() => {
                const snapshot = entry.set
                void deleteSet(snapshot.id).then(() => {
                  toast.show('Sarja poistettu', {
                    action: { label: 'Kumoa', onAction: () => void restoreSet(snapshot) },
                  })
                })
              }}
            />
          ) : (
            <SetRow
              key={`planned-${entry.plannedIndex}`}
              label={entry.label}
              weight={entry.values.weight}
              reps={entry.values.reps}
              warmup={entry.values.warmup}
              durationSec={entry.values.durationSec}
              kind={exercise.kind}
              increment={exercise.increment}
              logged={false}
              {...(entry.comparison ? { previousSet: entry.comparison } : {})}
              onChange={(patch) => patchPlanned(entry.plannedIndex, patch)}
              onToggleWarmup={() =>
                patchPlanned(entry.plannedIndex, { warmup: !entry.values.warmup })
              }
              onConfirm={() => void confirmSet(entry.plannedIndex)}
              deleteLabel={`Poista rivi ${entry.label}`}
              onDelete={() => {
                if (extraRows > 0) setExtraRows(extraRows - 1)
                else setRemovedRows(removedRows + 1)
              }}
            />
          ),
        )}

        <Button
          variant="ghost"
          fullWidth
          size="sm"
          icon={<PlusIcon size={16} />}
          onClick={() => {
            if (removedRows > 0) setRemovedRows(removedRows - 1)
            else setExtraRows(extraRows + 1)
          }}
        >
          Lisää sarja
        </Button>
      </div>

      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title={exercise.name}>
        <div className="space-y-2">
          <Button
            variant="secondary"
            fullWidth
            onClick={() => {
              setMenuOpen(false)
              setNoteOpen(true)
            }}
          >
            Muistiinpano tälle kerralle
          </Button>
          <Button
            variant="secondary"
            fullWidth
            onClick={() => {
              void updateSessionExercise(row.id, { skipped: !row.skipped })
              setMenuOpen(false)
            }}
          >
            {row.skipped ? 'Peru ohitus' : 'Ohita tämä liike'}
          </Button>
          <Button
            variant="secondary"
            fullWidth
            onClick={() => void navigate(`/exercises/${exercise.id}`)}
          >
            Liikkeen tiedot
          </Button>
          <Button
            variant="ghost"
            fullWidth
            className="text-danger"
            onClick={() => {
              setMenuOpen(false)
              void removeExerciseFromSession(row.id).then(() =>
                toast.show(`${exercise.name} poistettu treenistä`),
              )
            }}
          >
            Poista liike treenistä
          </Button>
        </div>
      </Sheet>

      <Sheet open={noteOpen} onClose={() => setNoteOpen(false)} title="Muistiinpano">
        <TextArea
          label={`${exercise.name} – tämä kerta`}
          defaultValue={row.note}
          rows={4}
          placeholder="Esim. kyynärpää kipeä, kevennetty viimeinen sarja"
          onChange={(event) => void updateSessionExercise(row.id, { note: event.target.value })}
        />
        <Button variant="primary" fullWidth className="mt-3" onClick={() => setNoteOpen(false)}>
          Valmis
        </Button>
      </Sheet>
    </Card>
  )
}

/** Ennätysilmoituksen teksti (SPEC §6.3). Mittarien nimet säilyttävät asunsa. */
export function recordToastText(exerciseName: string, labels: string[]): string {
  return `${exerciseName} – uusi ennätys: ${labels.join(' · ')}`
}
