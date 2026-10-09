import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/db'
import {
  createDay,
  deleteDay,
  ensureProgram,
  getActiveProgram,
  listDays,
  reorderDays,
  updateDay,
} from '@/db/repositories/programRepo'
import type { DayIcon, WorkoutDay } from '@/domain/types'
import { Button, IconButton } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DragList } from '@/components/ui/DragList'
import { EmptyState } from '@/components/ui/EmptyState'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { ScreenSkeleton } from '@/components/ui/Skeleton'
import { ChevronRightIcon, DumbbellIcon, EditIcon, PlusIcon, dayIcon } from '@/components/icons'
import { useToast } from '@/app/providers/ToastProvider'
import { DayEditorSheet } from './DayEditorSheet'

/** Treenipäivien määrä ennen kuin lisäys estetään – kierto pysyy hallittavana. */
const MAX_DAYS = 8

export default function ProgramScreen() {
  const navigate = useNavigate()
  const toast = useToast()
  // Ohjelma ja päivät samassa kyselyssä, jotta tyhjä tila ei välähdä.
  const programWithDays = useLiveQuery(
    async () => {
      const active = await getActiveProgram()
      return { program: active ?? null, days: active ? await listDays(active.id) : [] }
    },
    [],
    undefined,
  )
  /* Liikkeiden määrä päivittäin yhdellä kyselyllä, jotta kortit eivät tee omia hakujaan. */
  const exerciseCounts = useLiveQuery(
    async () => {
      const rows = await db.dayExercises.toArray()
      const counts = new Map<string, number>()
      for (const row of rows) counts.set(row.dayId, (counts.get(row.dayId) ?? 0) + 1)
      return counts
    },
    [],
    new Map<string, number>(),
  )

  const [editing, setEditing] = useState<WorkoutDay | 'new' | null>(null)
  const [removing, setRemoving] = useState<WorkoutDay | null>(null)

  if (programWithDays === undefined) return <ScreenSkeleton />
  const { program, days } = programWithDays

  if (program === null || days.length === 0) {
    return (
      <>
        <ScreenHeader title="Ohjelma" />
        <EmptyState
          title="Ohjelmaa ei ole vielä"
          description="Tee ohjelma käyttöönotossa: kolme treenipäivää ja liikkeet kirjastosta. Voit muokata kaikkea myöhemmin."
          icon={<DumbbellIcon size={28} />}
          action={
            <Button variant="primary" onClick={() => void navigate('/onboarding')}>
              Aloita käyttöönotto
            </Button>
          }
        />
      </>
    )
  }

  return (
    <>
      <ScreenHeader
        title="Ohjelma"
        subtitle={`${days.length} treenipäivää kierrossa`}
        action={
          <IconButton
            label="Lisää treenipäivä"
            variant="primary"
            disabled={days.length >= MAX_DAYS}
            onClick={() => setEditing('new')}
          >
            <PlusIcon />
          </IconButton>
        }
      />

      <div className="space-y-3 px-4 pt-4">
        <DragList
          items={days}
          label="Treenipäivät"
          getKey={(day) => day.id}
          getLabel={(day) => day.name}
          onReorder={(next) => {
            void reorderDays(next.map((day) => day.id))
          }}
          renderItem={(day, handle) => {
            const Icon = dayIcon(day.icon)
            const count = exerciseCounts.get(day.id) ?? 0
            return (
              <Card className="flex items-center gap-3 p-3">
                {handle}
                <span
                  className="flex size-11 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `var(--${day.color})`, color: 'var(--accent-ink)' }}
                >
                  <Icon size={22} />
                </span>
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => void navigate(`/program/day/${day.id}`)}
                >
                  <span className="block truncate font-semibold">{day.name}</span>
                  <span className="block text-xs text-muted">
                    {count === 0 ? 'Ei liikkeitä' : `${count} liikettä`}
                  </span>
                </button>
                <IconButton label={`Muokkaa päivää ${day.name}`} onClick={() => setEditing(day)}>
                  <EditIcon size={20} />
                </IconButton>
                <IconButton
                  label={`Avaa päivä ${day.name}`}
                  onClick={() => void navigate(`/program/day/${day.id}`)}
                >
                  <ChevronRightIcon size={20} />
                </IconButton>
              </Card>
            )
          }}
        />

        <Button
          variant="secondary"
          fullWidth
          icon={<DumbbellIcon size={18} />}
          onClick={() => void navigate('/exercises')}
        >
          Liikekirjasto
        </Button>

        {days.length >= MAX_DAYS ? (
          <p className="text-center text-xs text-muted">
            Enimmäismäärä {MAX_DAYS} treenipäivää saavutettu.
          </p>
        ) : null}
      </div>

      <DayEditorSheet
        open={editing !== null}
        day={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)}
        onDelete={(day) => {
          setEditing(null)
          setRemoving(day)
        }}
        onSubmit={async (values: { name: string; icon: DayIcon; color: string }) => {
          if (editing === 'new') {
            const active = await ensureProgram()
            await createDay(active.id, values)
            toast.show(`${values.name} lisätty`, { tone: 'good' })
          } else if (editing) {
            await updateDay(editing.id, values)
          }
          setEditing(null)
        }}
      />

      <ConfirmDialog
        open={removing !== null}
        title={`Poista treenipäivä ${removing?.name ?? ''}?`}
        details="Menneet treenit säilyvät historiassa sellaisinaan – vain ohjelman päivä ja sen liikevalinnat poistuvat."
        confirmLabel="Poista päivä"
        onCancel={() => setRemoving(null)}
        onConfirm={() => {
          const day = removing
          setRemoving(null)
          if (!day) return
          void deleteDay(day.id).then(() => toast.show(`${day.name} poistettu`))
        }}
      />
    </>
  )
}
