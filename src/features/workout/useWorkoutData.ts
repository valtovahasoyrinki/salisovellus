import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { listSetsForExercise } from '@/db/repositories/sessionRepo'
import { groupSetsBySession, type SessionSetGroup } from '@/domain/sessionGroups'
import { suggestProgression, type ProgressionSuggestion } from '@/domain/progression'
import { workSets } from '@/domain/volume'
import type { DayExercise, Exercise, RepRange, SetEntry } from '@/domain/types'

export interface ExerciseContext {
  /** Liikkeen aiemmat sarjat ilman tätä treeniä – ennätysten vertailutaso. */
  history: SetEntry[]
  groups: SessionSetGroup[]
  /** Edellisen kerran sarjat ("Viimeksi 80 × 8 · 80 × 8"). */
  previous?: SessionSetGroup
  /** Edellisen kerran työsarjat järjestyksessä, rivikohtaiseen vertailuun. */
  previousWorkSets: SetEntry[]
  suggestion: ProgressionSuggestion | null
  repRange: RepRange
  restSec: number
  targetSets: number
  loading: boolean
}

/**
 * Yhden liikkeen kirjauskonteksti: edellinen kerta, progressioehdotus ja
 * päiväkohtaiset tavoitteet (SPEC §6.3, §6.6).
 *
 * Liikkeen koko historia luetaan yhdellä range-kyselyllä compound-indeksillä
 * `[exerciseId+completedAt]`, joten tämä kestää vuosien datan.
 */
export function useExerciseContext(input: {
  exercise: Exercise
  sessionId: string
  dayExercise?: DayExercise
  fallbackRestSec: number
}): ExerciseContext {
  const { exercise, sessionId, dayExercise, fallbackRestSec } = input

  const allSets = useLiveQuery(() => listSetsForExercise(exercise.id), [exercise.id], undefined)

  const history = useMemo(
    () => (allSets ?? []).filter((set) => set.sessionId !== sessionId),
    [allSets, sessionId],
  )
  const groups = useMemo(() => groupSetsBySession(history), [history])
  const previous = groups.at(-1)
  const previousWorkSets = useMemo(() => (previous ? workSets(previous.sets) : []), [previous])

  const repRange = dayExercise?.repRange ?? exercise.defaultRepRange
  const suggestion = useMemo(
    () =>
      suggestProgression({
        history: groups,
        repRange,
        increment: exercise.increment,
        kind: exercise.kind,
      }),
    [groups, repRange, exercise.increment, exercise.kind],
  )

  return {
    history,
    groups,
    ...(previous ? { previous } : {}),
    previousWorkSets,
    suggestion,
    repRange,
    restSec: dayExercise?.restSec ?? exercise.defaultRestSec ?? fallbackRestSec,
    targetSets: dayExercise?.targetSets ?? Math.max(1, previousWorkSets.length || 3),
    loading: allSets === undefined,
  }
}

/**
 * Sarjarivin lähtöarvot: progressioehdotus, muuten edellisen kerran sama
 * sarja, muuten viimeisin rivi tässä treenissä (SPEC §6.3).
 */
export function initialSetValues(input: {
  workSetIndex: number
  suggestion: ProgressionSuggestion | null
  previousWorkSets: SetEntry[]
  lastRowInSession?: { weight: number; reps: number }
  repRange: RepRange
  isBodyweight: boolean
}): { weight: number; reps: number } {
  const { workSetIndex, suggestion, previousWorkSets, lastRowInSession, repRange, isBodyweight } =
    input

  if (lastRowInSession) return { weight: lastRowInSession.weight, reps: lastRowInSession.reps }
  if (suggestion) return { weight: suggestion.weight, reps: suggestion.reps }

  const previousSet = previousWorkSets[workSetIndex] ?? previousWorkSets.at(-1)
  if (previousSet) return { weight: previousSet.weight, reps: previousSet.reps }

  // Ensimmäinen kerta: kehonpainoliikkeellä ei lisäpainoa, muuten pelkkä tanko.
  return { weight: isBodyweight ? 0 : 20, reps: repRange.min }
}
