import { useState } from 'react'
import { useParams } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  addExerciseToDay,
  getDay,
  listDayExercisesWithExercise,
  removeDayExercise,
  reorderDayExercises,
  replaceDayExercise,
  updateDayExercise,
  type DayExerciseWithExercise,
} from '@/db/repositories/programRepo'
import type { DayExercise, Exercise } from '@/domain/types'
import { Badge } from '@/components/ui/Badge'
import { Button, IconButton } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { DragList } from '@/components/ui/DragList'
import { EmptyState } from '@/components/ui/EmptyState'
import { NumberStepper } from '@/components/ui/NumberStepper'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { ScreenSkeleton } from '@/components/ui/Skeleton'
import { Sheet } from '@/components/ui/Sheet'
import { SwipeRow } from '@/components/ui/SwipeRow'
import { ChevronRightIcon, DumbbellIcon, PlusIcon, SwapIcon } from '@/components/icons'
import { useToast } from '@/app/providers/ToastProvider'
import { ExercisePicker } from '@/features/exercises/ExercisePicker'
import { ExercisePickerSheet } from '@/features/exercises/ExercisePickerSheet'
import { ExerciseThumb } from '@/features/exercises/ExerciseThumb'
import { formatRepRange } from '@/lib/format'

/**
 * Tavoitteiden tiivistelmä. "Oma asetus" näytetään vain, jos arvo oikeasti
 * poikkeaa liikkeen oletuksesta – muuten merkintä olisi aina päällä.
 */
function targetSummary(item: DayExerciseWithExercise): string {
  const range = item.row.repRange ?? item.exercise.defaultRepRange
  const rest = item.row.restSec ?? item.exercise.defaultRestSec
  const defaults = item.exercise.defaultRepRange
  const overridden =
    range.min !== defaults.min || range.max !== defaults.max || rest !== item.exercise.defaultRestSec
  return `${item.row.targetSets} × ${formatRepRange(range)} · ${rest} s${overridden ? ' · oma asetus' : ''}`
}

export default function DayScreen() {
  const { dayId = '' } = useParams()
  const toast = useToast()
  const day = useLiveQuery(async () => (await getDay(dayId)) ?? null, [dayId], undefined)
  const rows = useLiveQuery(() => listDayExercisesWithExercise(dayId), [dayId], undefined)

  const [adding, setAdding] = useState(false)
  const [swapping, setSwapping] = useState<DayExerciseWithExercise | null>(null)
  const [settingsFor, setSettingsFor] = useState<DayExerciseWithExercise | null>(null)

  /** Liikkeen lisäys päivään, valittuna tai juuri luotuna. */
  const addToDay = (exercise: Exercise, message: string): void => {
    void addExerciseToDay(dayId, exercise.id, {
      targetSets: 3,
      repRange: exercise.defaultRepRange,
    }).then(() => toast.show(`${exercise.name} ${message}`, { tone: 'good' }))
  }

  if (day === undefined || rows === undefined) return <ScreenSkeleton />
  if (day === null) {
    return (
      <>
        <ScreenHeader title="Treenipäivä" back="/program" />
        <p className="px-4 pt-6 text-sm text-muted">Treenipäivää ei löytynyt.</p>
      </>
    )
  }

  return (
    <>
      <ScreenHeader
        title={day.name}
        subtitle={rows.length === 0 ? 'Ei liikkeitä' : `${rows.length} liikettä`}
        back="/program"
        action={
          <IconButton label="Lisää liike" variant="primary" onClick={() => setAdding(true)}>
            <PlusIcon />
          </IconButton>
        }
      />

      <div className="space-y-3 px-4 pt-4 pb-4">
        {rows.length === 0 ? (
          <EmptyState
            title="Päivässä ei ole liikkeitä"
            description="Lisää liikkeitä kirjastosta. Voit järjestää ne raahaamalla ja asettaa jokaiselle tavoitesarjat, toistoalueen ja levon."
            icon={<DumbbellIcon size={28} />}
            action={
              <Button variant="primary" icon={<PlusIcon size={18} />} onClick={() => setAdding(true)}>
                Lisää liike
              </Button>
            }
          />
        ) : (
          <DragList
            items={rows}
            label="Päivän liikkeet"
            getKey={(item) => item.row.id}
            getLabel={(item) => item.exercise.name}
            onReorder={(next) => {
              void reorderDayExercises(next.map((item) => item.row.id))
            }}
            renderItem={(item, handle) => (
              <SwipeRow
                deleteLabel={`Poista ${item.exercise.name} päivästä`}
                onDelete={() => {
                  const snapshot = item.row
                  void removeDayExercise(snapshot.id).then(() => {
                    toast.show(`${item.exercise.name} poistettu päivästä`, {
                      action: {
                        label: 'Kumoa',
                        onAction: () => {
                          void addExerciseToDay(snapshot.dayId, snapshot.exerciseId, {
                            targetSets: snapshot.targetSets,
                            ...(snapshot.repRange ? { repRange: snapshot.repRange } : {}),
                            ...(snapshot.restSec === undefined ? {} : { restSec: snapshot.restSec }),
                          })
                        },
                      },
                    })
                  })
                }}
              >
                <Card className="flex items-center gap-2 p-3">
                  {handle}
                  <ExerciseThumb exercise={item.exercise} size={36} />
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    aria-label={`Muokkaa tavoitteita: ${item.exercise.name}`}
                    onClick={() => setSettingsFor(item)}
                  >
                    <span className="block text-[0.9375rem] leading-tight font-medium">
                      {item.exercise.name}
                      {item.exercise.archived ? <Badge className="ml-2">Arkistoitu</Badge> : null}
                    </span>
                    <span className="num mt-0.5 block text-xs text-muted">
                      {targetSummary(item)}
                    </span>
                  </button>
                  <ChevronRightIcon size={20} className="shrink-0 text-faint" />
                </Card>
              </SwipeRow>
            )}
          />
        )}

        {rows.length === 0 ? null : (
          <p className="text-center text-xs text-muted">
            Raahaa kahvasta järjestääksesi · pyyhkäise vasemmalle poistaaksesi
          </p>
        )}
      </div>

      <ExercisePickerSheet
        open={adding}
        onClose={() => setAdding(false)}
        title="Lisää liike päivään"
        createLabel="Luo ja lisää päivään"
        multiple
        selectedIds={new Set(rows.map((item) => item.exercise.id))}
        onPick={(exercise: Exercise) => addToDay(exercise, 'lisätty')}
        onCreated={(exercise: Exercise) => addToDay(exercise, 'luotu ja lisätty päivään')}
      />

      <Sheet
        open={swapping !== null}
        onClose={() => setSwapping(null)}
        title="Vaihda liike"
        size="tall"
      >
        <p className="mb-3 text-sm text-muted">
          Tavoitesarjat ja asetukset säilyvät. Historia ei muutu: menneet treenit viittaavat yhä
          vanhaan liikkeeseen.
        </p>
        <ExercisePicker
          excludeIds={new Set(rows.map((item) => item.exercise.id))}
          onPick={(exercise) => {
            const target = swapping
            setSwapping(null)
            if (!target) return
            void replaceDayExercise(target.row.id, exercise.id).then(() =>
              toast.show(`${target.exercise.name} → ${exercise.name}`),
            )
          }}
        />
      </Sheet>

      <DayExerciseSettingsSheet
        item={settingsFor}
        onClose={() => setSettingsFor(null)}
        onSwap={() => {
          setSwapping(settingsFor)
          setSettingsFor(null)
        }}
        onSave={(patch) => {
          const target = settingsFor
          setSettingsFor(null)
          if (!target) return
          void updateDayExercise(target.row.id, patch)
        }}
      />
    </>
  )
}

/** Liikkeen päiväkohtaiset tavoitteet, jotka ohittavat liikkeen oletukset (SPEC §6.2). */
function DayExerciseSettingsSheet({
  item,
  onClose,
  onSave,
  onSwap,
}: {
  item: DayExerciseWithExercise | null
  onClose: () => void
  onSave: (patch: Partial<Omit<DayExercise, 'id' | 'dayId'>>) => void
  onSwap: () => void
}) {
  const [sets, setSets] = useState(3)
  const [repMin, setRepMin] = useState(6)
  const [repMax, setRepMax] = useState(10)
  const [rest, setRest] = useState(150)
  const [key, setKey] = useState<string | null>(null)

  // Arvot ladataan kerran, kun lomake avataan uudelle liikkeelle.
  if (item !== null && key !== item.row.id) {
    setKey(item.row.id)
    setSets(item.row.targetSets)
    setRepMin((item.row.repRange ?? item.exercise.defaultRepRange).min)
    setRepMax((item.row.repRange ?? item.exercise.defaultRepRange).max)
    setRest(item.row.restSec ?? item.exercise.defaultRestSec)
  }

  if (item === null) return null

  const defaults = item.exercise.defaultRepRange

  return (
    <Sheet open onClose={onClose} title={item.exercise.name}>
      <div className="space-y-5">
        <Field label="Tavoitesarjat">
          <NumberStepper label="Tavoitesarjat" value={sets} onChange={setSets} step={1} min={1} max={12} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Toistot vähintään">
            <NumberStepper
              label="Toistot vähintään"
              value={repMin}
              onChange={setRepMin}
              step={1}
              min={1}
              max={repMax}
            />
          </Field>
          <Field label="Toistot enintään">
            <NumberStepper
              label="Toistot enintään"
              value={repMax}
              onChange={setRepMax}
              step={1}
              min={repMin}
              max={100}
            />
          </Field>
        </div>
        <Field label="Lepoaika" hint={`Liikkeen oletus ${item.exercise.defaultRestSec} s`}>
          <NumberStepper
            label="Lepoaika sekunteina"
            value={rest}
            onChange={setRest}
            step={15}
            min={0}
            max={600}
            unit="s"
          />
        </Field>

        <p className="text-xs text-muted">
          Liikkeen oletustoistoalue on {formatRepRange(defaults)}. Tässä asetetut arvot koskevat
          vain tätä treenipäivää.
        </p>

        <div className="flex gap-2">
          <Button variant="secondary" fullWidth onClick={onClose}>
            Peruuta
          </Button>
          <Button
            variant="primary"
            fullWidth
            onClick={() =>
              onSave({
                targetSets: sets,
                repRange: { min: repMin, max: Math.max(repMin, repMax) },
                restSec: rest,
              })
            }
          >
            Tallenna
          </Button>
        </div>

        <Button variant="ghost" fullWidth icon={<SwapIcon size={18} />} onClick={onSwap}>
          Vaihda toiseen liikkeeseen
        </Button>
      </div>
    </Sheet>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <span className="block text-sm font-medium">{label}</span>
      {children}
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  )
}
