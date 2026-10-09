import { useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  clearExerciseImage,
  getExercise,
  getExerciseImage,
  getExerciseUsage,
  listExercises,
  mergeExercises,
  setExerciseArchived,
  setExerciseImage,
  updateExercise,
  deleteExercisePermanently,
} from '@/db/repositories/exerciseRepo'
import { EXERCISE_KIND_LABELS, equipmentLabel } from '@/domain/equipment'
import { muscleLabel } from '@/domain/muscles'
import type { Exercise } from '@/domain/types'
import { MuscleMap } from '@/components/MuscleMap/MuscleMap'
import { Badge } from '@/components/ui/Badge'
import { Button, IconButton } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ListRow } from '@/components/ui/ListRow'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { ScreenSkeleton } from '@/components/ui/Skeleton'
import { Sheet } from '@/components/ui/Sheet'
import {
  AnalysisIcon,
  ArchiveIcon,
  CameraIcon,
  EditIcon,
  RestoreIcon,
  SwapIcon,
  TrashIcon,
} from '@/components/icons'
import { useToast } from '@/app/providers/ToastProvider'
import { formatNumber, formatRepRange } from '@/lib/format'
import { formatDayLabel } from '@/lib/date'
import { compressImage } from '@/lib/image'
import { useObjectUrl } from '@/lib/useObjectUrl'
import { ExerciseForm } from './ExerciseForm'
import { ExercisePicker } from './ExercisePicker'
import { formFromExercise } from './exerciseSchema'

export default function ExerciseDetailScreen() {
  const { exerciseId = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  // `undefined` = lataus kesken, `null` = liikettä ei ole.
  const exercise = useLiveQuery(
    async () => (await getExercise(exerciseId)) ?? null,
    [exerciseId],
    undefined,
  )
  const usage = useLiveQuery(() => getExerciseUsage(exerciseId), [exerciseId], undefined)
  const allExercises = useLiveQuery(() => listExercises(), [], undefined)
  const imageId = exercise?.imageId
  const imageBlob = useLiveQuery(
    () => (imageId === undefined ? Promise.resolve(undefined) : getExerciseImage(imageId)),
    [imageId],
    undefined,
  )
  const imageUrl = useObjectUrl(imageBlob)

  const [editing, setEditing] = useState(false)
  const [merging, setMerging] = useState(false)
  const [mergeTarget, setMergeTarget] = useState<Exercise | null>(null)
  const [deleting, setDeleting] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const existingNames = useMemo(
    () => (allExercises ?? []).map((candidate) => ({ id: candidate.id, name: candidate.name })),
    [allExercises],
  )

  if (exercise === undefined) return <ScreenSkeleton />
  if (exercise === null) {
    return (
      <>
        <ScreenHeader title="Liike" back="/exercises" />
        <p className="px-4 pt-6 text-sm text-muted">Liikettä ei löytynyt.</p>
      </>
    )
  }

  const hasHistory = (usage?.setCount ?? 0) > 0

  const pickImage = async (file: File): Promise<void> => {
    try {
      const compressed = await compressImage(file)
      await setExerciseImage(exercise.id, compressed)
      toast.show('Kuva tallennettu', { tone: 'good' })
    } catch {
      toast.show('Kuvan käsittely epäonnistui', { tone: 'danger' })
    }
  }

  return (
    <>
      <ScreenHeader
        title={exercise.name}
        subtitle={equipmentLabel(exercise.equipment)}
        back="/exercises"
        action={
          <IconButton label="Muokkaa liikettä" onClick={() => setEditing(true)}>
            <EditIcon />
          </IconButton>
        }
      />

      <div className="space-y-4 px-4 pt-4">
        <Card className="flex gap-4 p-4">
          {imageUrl === null ? (
            <MuscleMap
              primary={exercise.primaryMuscles}
              secondary={exercise.secondaryMuscles}
              view="both"
              className="w-28 shrink-0"
            />
          ) : (
            <img
              src={imageUrl}
              alt={`Oma kuva liikkeestä ${exercise.name}`}
              className="h-32 w-28 shrink-0 rounded-xl object-cover"
            />
          )}
          <div className="min-w-0 flex-1 space-y-2 text-sm">
            <Row label="Ensisijaiset">{exercise.primaryMuscles.map(muscleLabel).join(', ')}</Row>
            {exercise.secondaryMuscles.length > 0 ? (
              <Row label="Toissijaiset">
                {exercise.secondaryMuscles.map(muscleLabel).join(', ')}
              </Row>
            ) : null}
            <Row label="Tyyppi">{EXERCISE_KIND_LABELS[exercise.kind]}</Row>
            <Row label="Painonlisäys">
              <span className="num">{formatNumber(exercise.increment)}</span> kg
            </Row>
            <Row label="Oletukset">
              <span className="num">{formatRepRange(exercise.defaultRepRange)}</span> toistoa ·{' '}
              <span className="num">{exercise.defaultRestSec}</span> s lepo
            </Row>
            {exercise.archived ? <Badge>Arkistoitu</Badge> : null}
          </div>
        </Card>

        {exercise.notes === '' ? null : (
          <Card className="p-4">
            <h2 className="text-sm font-semibold">Muistiinpano</h2>
            <p className="mt-1 text-sm whitespace-pre-line text-muted">{exercise.notes}</p>
          </Card>
        )}

        <Card>
          <ul className="divide-y divide-border">
            <li>
              <ListRow
                title="Treenejä"
                trailing={<span className="num text-sm text-muted">{usage?.sessionCount ?? 0}</span>}
              />
            </li>
            <li>
              <ListRow
                title="Sarjoja"
                trailing={<span className="num text-sm text-muted">{usage?.setCount ?? 0}</span>}
              />
            </li>
            <li>
              <ListRow
                title="Viimeksi"
                trailing={
                  <span className="text-sm text-muted">
                    {usage?.lastDoneAt === undefined ? '–' : formatDayLabel(usage.lastDoneAt)}
                  </span>
                }
              />
            </li>
            <li>
              <ListRow
                title="Ohjelmapäivissä"
                trailing={
                  <span className="num text-sm text-muted">{usage?.programDayCount ?? 0}</span>
                }
              />
            </li>
            {hasHistory ? (
              <li>
                <ListRow
                  to={`/analysis/exercise/${exercise.id}`}
                  title="Avaa analyysi"
                  leading={<AnalysisIcon size={20} />}
                />
              </li>
            ) : null}
          </ul>
        </Card>

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            icon={<CameraIcon size={18} />}
            onClick={() => fileInput.current?.click()}
          >
            {imageUrl === null ? 'Lisää kuva' : 'Vaihda kuva'}
          </Button>
          {imageUrl === null ? null : (
            <Button
              variant="secondary"
              onClick={() => {
                void clearExerciseImage(exercise.id)
                toast.show('Kuva poistettu')
              }}
            >
              Poista kuva
            </Button>
          )}
          <Button
            variant="secondary"
            icon={exercise.archived ? <RestoreIcon size={18} /> : <ArchiveIcon size={18} />}
            onClick={() => {
              void setExerciseArchived(exercise.id, !exercise.archived)
              toast.show(exercise.archived ? 'Liike palautettu' : 'Liike arkistoitu')
            }}
          >
            {exercise.archived ? 'Palauta' : 'Arkistoi'}
          </Button>
          <Button variant="secondary" icon={<SwapIcon size={18} />} onClick={() => setMerging(true)}>
            Yhdistä
          </Button>
        </div>

        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (file) void pickImage(file)
          }}
        />

        <div className="pt-2 pb-8">
          <Button
            variant="ghost"
            fullWidth
            icon={<TrashIcon size={18} />}
            className="text-danger"
            onClick={() => setDeleting(true)}
          >
            Poista pysyvästi
          </Button>
          {hasHistory ? (
            <p className="mt-1 text-center text-xs text-muted">
              Liikkeellä on historiaa. Arkistointi säilyttää datan, poisto ei.
            </p>
          ) : null}
        </div>
      </div>

      <Sheet open={editing} onClose={() => setEditing(false)} title="Muokkaa liikettä" size="tall">
        <ExerciseForm
          initial={formFromExercise(exercise)}
          existingNames={existingNames}
          editingId={exercise.id}
          submitLabel="Tallenna"
          onCancel={() => setEditing(false)}
          onSubmit={async (values) => {
            await updateExercise(exercise.id, {
              name: values.name,
              primaryMuscles: values.primaryMuscles,
              secondaryMuscles: values.secondaryMuscles,
              equipment: values.equipment,
              kind: values.kind,
              increment: values.increment,
              defaultRestSec: values.defaultRestSec,
              defaultRepRange: { min: values.repMin, max: values.repMax },
              notes: values.notes,
            })
            setEditing(false)
            toast.show('Liike tallennettu', { tone: 'good' })
          }}
        />
      </Sheet>

      <Sheet
        open={merging}
        onClose={() => setMerging(false)}
        title="Yhdistä toiseen liikkeeseen"
        size="tall"
      >
        <p className="mb-3 text-sm text-muted">
          Tämän liikkeen historia ja ohjelmarivit siirtyvät valitsemallesi liikkeelle, ja{' '}
          {exercise.name} poistetaan.
        </p>
        <ExercisePicker
          onPick={(target) => {
            setMergeTarget(target)
            setMerging(false)
          }}
          excludeIds={new Set([exercise.id])}
        />
      </Sheet>

      <ConfirmDialog
        open={mergeTarget !== null}
        title={`Yhdistä ${exercise.name} → ${mergeTarget?.name ?? ''}`}
        details={`${usage?.setCount ?? 0} sarjaa ${usage?.sessionCount ?? 0} treenistä siirtyy liikkeelle ${mergeTarget?.name ?? ''}. ${exercise.name} poistetaan.`}
        confirmLabel="Yhdistä"
        tone="neutral"
        onCancel={() => setMergeTarget(null)}
        onConfirm={() => {
          const target = mergeTarget
          setMergeTarget(null)
          if (!target) return
          void mergeExercises(exercise.id, target.id).then(() => {
            toast.show(`Yhdistetty liikkeeseen ${target.name}`, { tone: 'good' })
            void navigate(`/exercises/${target.id}`, { replace: true })
          })
        }}
      />

      <ConfirmDialog
        open={deleting}
        title={`Poista ${exercise.name} pysyvästi?`}
        details={
          hasHistory
            ? `Poistuu lopullisesti: ${usage?.setCount ?? 0} sarjaa, ${usage?.sessionCount ?? 0} treenin kirjaukset tästä liikkeestä ja ${usage?.programDayCount ?? 0} ohjelmariviä. Tätä ei voi perua.`
            : 'Liikkeellä ei ole kirjauksia. Poisto on peruuttamaton.'
        }
        confirmLabel="Poista pysyvästi"
        onCancel={() => setDeleting(false)}
        onConfirm={() => {
          setDeleting(false)
          void deleteExercisePermanently(exercise.id).then(() => {
            toast.show('Liike poistettu')
            void navigate('/exercises', { replace: true })
          })
        }}
      />
    </>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <p className="flex flex-wrap gap-x-2">
      <span className="text-muted">{label}:</span>
      <span className="text-text">{children}</span>
    </p>
  )
}
