import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  deleteSession,
  deleteSet,
  getSessionDetail,
  reopenSession,
  restoreSet,
  updateSession,
  updateSet,
} from '@/db/repositories/sessionRepo'
import { setE1rm } from '@/domain/e1rm'
import { totalVolume, workSets } from '@/domain/volume'
import { Badge } from '@/components/ui/Badge'
import { Button, IconButton } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { NumberStepper } from '@/components/ui/NumberStepper'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { ScreenSkeleton } from '@/components/ui/Skeleton'
import { Sheet } from '@/components/ui/Sheet'
import { StatTile } from '@/components/ui/StatTile'
import { TextArea } from '@/components/ui/TextArea'
import { EditIcon, TrashIcon } from '@/components/icons'
import { useToast } from '@/app/providers/ToastProvider'
import { formatDate, formatDuration, formatTime } from '@/lib/date'
import { formatNumber, formatSetCount, formatVolume, formatWeight } from '@/lib/format'

/** Menneen treenin tarkastelu, muokkaus ja poisto (SPEC §6.7). */
export default function SessionDetailScreen() {
  const { sessionId = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editingSetId, setEditingSetId] = useState<string | null>(null)

  const detail = useLiveQuery(
    async () => (await getSessionDetail(sessionId)) ?? null,
    [sessionId],
    undefined,
  )

  if (detail === undefined) return <ScreenSkeleton />
  if (detail === null) {
    return (
      <>
        <ScreenHeader title="Treeni" back="/history" />
        <p className="px-4 pt-6 text-sm text-muted">Treeniä ei löytynyt.</p>
      </>
    )
  }

  const allSets = detail.exercises.flatMap((item) => item.sets)
  const volume = totalVolume(allSets)
  const workSetCount = workSets(allSets).length
  const durationSec = detail.session.endedAt
    ? (detail.session.endedAt - detail.session.startedAt) / 1000
    : 0
  const editingSet = detail.exercises
    .flatMap((item) => item.sets.map((set) => ({ set, exercise: item.exercise })))
    .find((entry) => entry.set.id === editingSetId)

  return (
    <>
      <ScreenHeader
        title={detail.session.dayName}
        subtitle={`${formatDate(detail.session.startedAt)} · ${formatTime(detail.session.startedAt)}`}
        back="/history"
        action={
          <IconButton label="Muokkaa treeniä" onClick={() => setEditing(true)}>
            <EditIcon />
          </IconButton>
        }
      />

      <div className="space-y-3 px-4 pt-3 pb-6">
        <div className="grid grid-cols-3 gap-2">
          <StatTile label="Työsarjat" value={workSetCount} format={(value) => String(Math.round(value))} />
          <StatTile label="Volyymi" value={volume} format={formatVolume} />
          <StatTile label="Kesto" value={durationSec} format={(value) => formatDuration(value)} />
        </div>

        {detail.session.note === '' ? null : (
          <Card className="p-4">
            <h2 className="text-sm font-semibold">Muistiinpano</h2>
            <p className="mt-1 text-sm whitespace-pre-line text-muted">{detail.session.note}</p>
          </Card>
        )}

        {detail.exercises.map((item) => (
          <Card key={item.row.id} className="p-4">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-[0.9375rem] font-semibold">{item.exercise.name}</h2>
              <span className="num text-xs text-muted">
                {formatSetCount(workSets(item.sets).length)}
              </span>
            </div>
            {item.row.note === '' ? null : (
              <p className="mt-1 text-xs text-muted">{item.row.note}</p>
            )}
            <ul className="num mt-2 space-y-1 text-sm">
              {item.sets.map((set, index) => (
                <li key={set.id}>
                  <button
                    type="button"
                    className="flex w-full items-baseline justify-between gap-3 rounded-lg px-1 py-1.5 text-left"
                    onClick={() => setEditingSetId(set.id)}
                    aria-label={`Muokkaa sarjaa ${index + 1}, ${item.exercise.name}`}
                  >
                    <span className="text-muted">
                      {set.warmup ? 'Lämmittely' : `Sarja ${index + 1}`}
                    </span>
                    <span>
                      {formatWeight(set.weight)} × {set.reps}
                      {set.warmup || setE1rm(set) === null ? null : (
                        <span className="ml-2 text-xs text-faint">
                          e1RM {formatNumber(setE1rm(set) ?? 0)}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        ))}

        <div className="flex gap-2 pt-2">
          <Button
            variant="secondary"
            fullWidth
            onClick={() => {
              void reopenSession(sessionId).then(() => void navigate(`/workout/${sessionId}`))
            }}
          >
            Jatka tätä treeniä
          </Button>
          <Button variant="danger" icon={<TrashIcon size={18} />} onClick={() => setDeleting(true)}>
            Poista
          </Button>
        </div>
      </div>

      <Sheet open={editing} onClose={() => setEditing(false)} title="Muokkaa treeniä">
        <div className="space-y-4">
          <TextArea
            label="Treenin muistiinpano"
            defaultValue={detail.session.note}
            rows={4}
            onChange={(event) => void updateSession(sessionId, { note: event.target.value })}
          />
          <Button variant="primary" fullWidth onClick={() => setEditing(false)}>
            Valmis
          </Button>
        </div>
      </Sheet>

      <Sheet
        open={editingSet !== undefined}
        onClose={() => setEditingSetId(null)}
        title={editingSet ? editingSet.exercise.name : ''}
      >
        {editingSet ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <span className="block text-sm font-medium">Paino</span>
              <NumberStepper
                label="Paino kilogrammoina"
                value={editingSet.set.weight}
                onChange={(value) => void updateSet(editingSet.set.id, { weight: value })}
                step={editingSet.exercise.increment}
                min={editingSet.exercise.kind === 'bodyweight' ? -200 : 0}
                max={500}
                unit="kg"
                format={formatNumber}
                allowDecimalInput
                size="lg"
              />
            </div>
            <div className="space-y-1.5">
              <span className="block text-sm font-medium">Toistot</span>
              <NumberStepper
                label="Toistot"
                value={editingSet.set.reps}
                onChange={(value) => void updateSet(editingSet.set.id, { reps: value })}
                step={1}
                min={1}
                max={100}
                size="lg"
              />
            </div>
            <Button
              variant="secondary"
              fullWidth
              onClick={() =>
                void updateSet(editingSet.set.id, { warmup: !editingSet.set.warmup })
              }
            >
              {editingSet.set.warmup ? 'Merkitse työsarjaksi' : 'Merkitse lämmittelyksi'}
            </Button>
            {editingSet.set.warmup ? <Badge className="block w-fit">Lämmittely</Badge> : null}
            <Button
              variant="ghost"
              fullWidth
              className="text-danger"
              onClick={() => {
                const snapshot = editingSet.set
                setEditingSetId(null)
                void deleteSet(snapshot.id).then(() =>
                  toast.show('Sarja poistettu', {
                    action: { label: 'Kumoa', onAction: () => void restoreSet(snapshot) },
                  }),
                )
              }}
            >
              Poista sarja
            </Button>
          </div>
        ) : null}
      </Sheet>

      <ConfirmDialog
        open={deleting}
        title="Poista treeni?"
        details={`${formatSetCount(workSetCount)} ja ${formatVolume(volume)} poistuu historiasta pysyvästi.`}
        confirmLabel="Poista treeni"
        onCancel={() => setDeleting(false)}
        onConfirm={() => {
          setDeleting(false)
          void deleteSession(sessionId).then(() => {
            toast.show('Treeni poistettu')
            void navigate('/history', { replace: true })
          })
        }}
      />
    </>
  )
}
