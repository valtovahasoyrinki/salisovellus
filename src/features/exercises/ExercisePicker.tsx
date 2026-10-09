import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { filterExercises, listExercises } from '@/db/repositories/exerciseRepo'
import { MUSCLE_ORDER, muscleLabel } from '@/domain/muscles'
import { equipmentLabel } from '@/domain/equipment'
import type { Exercise, MuscleId } from '@/domain/types'
import { Chip, ChipRow } from '@/components/ui/Chip'
import { ListRow } from '@/components/ui/ListRow'
import { TextField } from '@/components/ui/TextField'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { CheckIcon, SearchIcon, equipmentIcon } from '@/components/icons'

/**
 * Liikkeen valinta haulla ja lihasryhmäsuodatuksella (SPEC §6.1, §6.2).
 * Käytetään käyttöönotossa, ohjelman päivänäkymässä ja treenin aikana, joten
 * valinta voi olla kertaluonteinen tai monivalinta.
 */
export interface ExercisePickerProps {
  onPick: (exercise: Exercise) => void
  /** Jo valitut liikkeet merkitään listassa. */
  selectedIds?: ReadonlySet<string>
  /** Monivalinnassa lista jää auki ja rivit näyttävät valintamerkin. */
  multiple?: boolean
  /** Liikkeet, joita ei näytetä lainkaan (esim. jo päivässä olevat). */
  excludeIds?: ReadonlySet<string>
  emptyHint?: string
}

export function ExercisePicker({
  onPick,
  selectedIds,
  multiple = false,
  excludeIds,
  emptyHint,
}: ExercisePickerProps) {
  const [query, setQuery] = useState('')
  const [muscle, setMuscle] = useState<MuscleId | 'all'>('all')
  const all = useLiveQuery(() => listExercises(), [], undefined)

  const available = useMemo(
    () => (all ?? []).filter((exercise) => !exercise.archived && !excludeIds?.has(exercise.id)),
    [all, excludeIds],
  )

  const counts = useMemo(() => {
    const map = new Map<MuscleId, number>()
    for (const exercise of available) {
      for (const id of exercise.primaryMuscles) map.set(id, (map.get(id) ?? 0) + 1)
    }
    return map
  }, [available])

  const results = useMemo(
    () => filterExercises(available, query, muscle),
    [available, query, muscle],
  )

  return (
    <div className="space-y-3">
      <TextField
        label="Hae liikettä"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Esim. penkki"
        type="search"
        autoComplete="off"
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

      {results.length === 0 ? (
        <EmptyState
          title="Ei osumia"
          description={emptyHint ?? 'Kokeile toista hakusanaa tai luo uusi liike kirjastossa.'}
          icon={<SearchIcon size={28} />}
        />
      ) : (
        <ul className="divide-y divide-border">
          {results.map((exercise) => {
            const selected = selectedIds?.has(exercise.id) ?? false
            const EquipmentIcon = equipmentIcon(exercise.equipment)
            return (
              <li key={exercise.id}>
                <ListRow
                  title={exercise.name}
                  subtitle={`${exercise.primaryMuscles.map(muscleLabel).join(', ')} · ${equipmentLabel(exercise.equipment)}`}
                  leading={
                    <span className="text-muted">
                      <EquipmentIcon size={22} />
                    </span>
                  }
                  trailing={
                    multiple ? (
                      selected ? (
                        <Badge variant="good" icon={<CheckIcon size={14} />}>
                          Lisätty
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted">Lisää</span>
                      )
                    ) : undefined
                  }
                  onClick={() => onPick(exercise)}
                />
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
