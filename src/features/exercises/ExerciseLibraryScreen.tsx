import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { createExercise, listExercises } from '@/db/repositories/exerciseRepo'
import { findExercises } from '@/domain/exerciseSearch'
import { MUSCLE_ORDER, muscleLabel } from '@/domain/muscles'
import { equipmentLabel } from '@/domain/equipment'
import type { MuscleId } from '@/domain/types'
import { Badge } from '@/components/ui/Badge'
import { Button, IconButton } from '@/components/ui/Button'
import { Chip, ChipRow } from '@/components/ui/Chip'
import { EmptyState } from '@/components/ui/EmptyState'
import { ListRow } from '@/components/ui/ListRow'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Sheet } from '@/components/ui/Sheet'
import { Skeleton } from '@/components/ui/Skeleton'
import { TextField } from '@/components/ui/TextField'
import { PlusIcon, SearchIcon } from '@/components/icons'
import { useToast } from '@/app/providers/ToastProvider'
import { ExerciseForm } from './ExerciseForm'
import { ExerciseThumb } from './ExerciseThumb'
import { EMPTY_FORM } from './exerciseSchema'

type Scope = 'active' | 'archived' | 'all'

const SCOPES = [
  { value: 'active' as const, label: 'Aktiiviset' },
  { value: 'archived' as const, label: 'Arkistoidut' },
  { value: 'all' as const, label: 'Kaikki' },
]

export default function ExerciseLibraryScreen() {
  const navigate = useNavigate()
  const toast = useToast()
  const all = useLiveQuery(() => listExercises(), [], undefined)
  const [query, setQuery] = useState('')
  const [muscle, setMuscle] = useState<MuscleId | 'all'>('all')
  const [scope, setScope] = useState<Scope>('active')
  const [creating, setCreating] = useState(false)

  const scoped = useMemo(() => {
    const list = all ?? []
    if (scope === 'active') return list.filter((exercise) => !exercise.archived)
    if (scope === 'archived') return list.filter((exercise) => exercise.archived)
    return list
  }, [all, scope])

  const counts = useMemo(() => {
    const map = new Map<MuscleId, number>()
    for (const exercise of scoped) {
      for (const id of exercise.primaryMuscles) map.set(id, (map.get(id) ?? 0) + 1)
    }
    return map
  }, [scoped])

  const results = useMemo(() => findExercises(scoped, query, muscle), [scoped, query, muscle])
  const existingNames = useMemo(
    () => (all ?? []).map((exercise) => ({ id: exercise.id, name: exercise.name })),
    [all],
  )

  return (
    <>
      <ScreenHeader
        title="Liikekirjasto"
        subtitle={all ? `${all.length} liikettä` : undefined}
        back="/program"
        action={
          <IconButton label="Uusi liike" variant="primary" onClick={() => setCreating(true)}>
            <PlusIcon />
          </IconButton>
        }
      />

      <div className="space-y-3 px-4 pt-4">
        <TextField
          label="Hae liikettä"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Esim. kyykky"
          type="search"
          autoComplete="off"
        />
        <SegmentedControl
          options={SCOPES}
          value={scope}
          onChange={setScope}
          ariaLabel="Näytettävät liikkeet"
        />
        <ChipRow label="Suodata lihasryhmällä">
          <Chip label="Kaikki" selected={muscle === 'all'} onClick={() => setMuscle('all')} />
          {MUSCLE_ORDER.filter((id) => (counts.get(id) ?? 0) > 0).map((id) => (
            <Chip
              key={id}
              label={muscleLabel(id)}
              count={counts.get(id)}
              selected={muscle === id}
              onClick={() => setMuscle(muscle === id ? 'all' : id)}
            />
          ))}
        </ChipRow>
      </div>

      {all === undefined ? (
        <div className="space-y-2 px-4 pt-4">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <EmptyState
          title={query === '' ? 'Ei liikkeitä' : 'Ei osumia'}
          description={
            query === ''
              ? 'Luo ensimmäinen liike tai palaa käyttöönottoon, joka täyttää kirjaston.'
              : 'Kokeile toista hakusanaa tai luo liike itse.'
          }
          icon={<SearchIcon size={28} />}
          action={
            <Button variant="primary" icon={<PlusIcon size={18} />} onClick={() => setCreating(true)}>
              Uusi liike
            </Button>
          }
        />
      ) : (
        <ul className="mt-2 divide-y divide-border">
          {results.map(({ exercise, aliasHit }) => (
            <li key={exercise.id}>
              <ListRow
                to={`/exercises/${exercise.id}`}
                title={exercise.name}
                subtitle={`${exercise.primaryMuscles.map(muscleLabel).join(', ')} · ${equipmentLabel(exercise.equipment)}${aliasHit === undefined ? '' : ` · myös: ${aliasHit}`}`}
                leading={<ExerciseThumb exercise={exercise} />}
                trailing={exercise.archived ? <Badge>Arkistoitu</Badge> : undefined}
              />
            </li>
          ))}
        </ul>
      )}

      <Sheet open={creating} onClose={() => setCreating(false)} title="Uusi liike" size="tall">
        <ExerciseForm
          initial={EMPTY_FORM}
          existingNames={existingNames}
          submitLabel="Luo liike"
          onCancel={() => setCreating(false)}
          onSubmit={async (values) => {
            const id = await createExercise({
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
            setCreating(false)
            toast.show(`${values.name} luotu`, { tone: 'good' })
            void navigate(`/exercises/${id}`)
          }}
        />
      </Sheet>
    </>
  )
}
