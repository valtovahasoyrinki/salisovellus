import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { listExercises } from '@/db/repositories/exerciseRepo'
import { findExercises } from '@/domain/exerciseSearch'
import { MUSCLE_ORDER, muscleLabel } from '@/domain/muscles'
import { equipmentLabel } from '@/domain/equipment'
import type { Exercise, MuscleId } from '@/domain/types'
import { Button } from '@/components/ui/Button'
import { Chip, ChipRow } from '@/components/ui/Chip'
import { ListRow } from '@/components/ui/ListRow'
import { TextField } from '@/components/ui/TextField'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { CheckIcon, PlusIcon, SearchIcon, equipmentIcon } from '@/components/icons'

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
  /**
   * Pikaluonti hakusanasta (SPEC §6.2). Kun tämä on annettu, hakutulosten
   * perässä on aina luontirivi – myös silloin kun osumia löytyi, koska oma
   * liike voi olla eri kuin samannimiset kirjaston liikkeet.
   */
  onCreate?: (name: string) => void
}

export function ExercisePicker({
  onPick,
  selectedIds,
  multiple = false,
  excludeIds,
  emptyHint,
  onCreate,
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
    () => findExercises(available, query, muscle),
    [available, query, muscle],
  )

  const draftName = query.trim()
  const createRow =
    onCreate === undefined || draftName === '' ? null : (
      <li>
        <ListRow
          title={`Luo uusi liike: ”${draftName}”`}
          subtitle="Nimi, lihakset ja väline – loput oletuksina"
          leading={<PlusIcon size={20} />}
          trailing={<span className="text-sm text-muted">Luo</span>}
          onClick={() => onCreate(draftName)}
        />
      </li>
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
          description={
            onCreate === undefined
              ? (emptyHint ?? 'Kokeile toista hakusanaa tai luo uusi liike kirjastossa.')
              : `Kirjastossa ei ole liikettä${draftName === '' ? '' : ` ”${draftName}”`}. Luo se tästä – nimi, lihakset ja väline riittävät.`
          }
          icon={<SearchIcon size={28} />}
          action={
            onCreate === undefined ? undefined : (
              <Button
                variant="primary"
                icon={<PlusIcon size={18} />}
                onClick={() => onCreate(draftName)}
              >
                Luo uusi liike
              </Button>
            )
          }
        />
      ) : (
        <ul className="divide-y divide-border">
          {results.map(({ exercise, aliasHit }) => {
            const selected = selectedIds?.has(exercise.id) ?? false
            const EquipmentIcon = equipmentIcon(exercise.equipment)
            return (
              <li key={exercise.id}>
                <ListRow
                  title={exercise.name}
                  subtitle={`${exercise.primaryMuscles.map(muscleLabel).join(', ')} · ${equipmentLabel(exercise.equipment)}${aliasHit === undefined ? '' : ` · myös: ${aliasHit}`}`}
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
          {createRow}
        </ul>
      )}
    </div>
  )
}
