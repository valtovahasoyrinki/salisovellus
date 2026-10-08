/**
 * Liikekohtaiset ennätykset (SPEC §6.6): raskain paino, paras e1RM, eniten
 * toistoja tietyllä painolla ja suurin kertavolyymi.
 *
 * Lämmittelysarjat eivät koskaan tuota ennätystä. Vertailut ovat aidosti
 * suurempia (`>`), joten saman tuloksen toistaminen ei ole uusi ennätys.
 */
import { setE1rm } from './e1rm'
import type { RecordKind, SetEntry } from './types'
import { bestSetByReps, bestSetVolume, heaviestSet, setVolume, workSets } from './volume'

/** Ennätyksen arvo ja sarja, jolla se tehtiin. */
export interface RecordEntry {
  value: number
  set: SetEntry
}

export interface ExerciseRecords {
  /** Paras sarja ja arvo ennätystyypeittäin, `null` jos tyypille ei ole dataa. */
  best: Record<RecordKind, RecordEntry | null>
  /**
   * Eniten toistoja painoa kohti: avain on paino kilogrammoina, arvo paras
   * sarja sillä painolla. Tästä syntyy "eniten toistoja tietyllä painolla".
   */
  mostRepsAtWeight: Map<number, SetEntry>
}

export const RECORD_KINDS: RecordKind[] = [
  'heaviest',
  'best_e1rm',
  'most_reps_at_weight',
  'best_set_volume',
]

const RECORD_LABELS: Record<RecordKind, string> = {
  heaviest: 'Raskain paino',
  best_e1rm: 'Paras e1RM',
  most_reps_at_weight: 'Eniten toistoja painolla',
  best_set_volume: 'Suurin kertavolyymi',
}

export function recordLabel(kind: RecordKind): string {
  return RECORD_LABELS[kind]
}

/**
 * Kaikki ennätykset liikkeen sarjoista. Tyypin `most_reps_at_weight` paras on
 * koko historian toistorikkain työsarja (tasapelissä raskaampi paino).
 */
export function computeRecords(sets: SetEntry[]): ExerciseRecords {
  const work = workSets(sets)

  const heaviest = heaviestSet(work)
  const mostReps = bestSetByReps(work)
  const bestVolume = bestSetVolume(work)

  let bestE1rm: RecordEntry | null = null
  for (const set of work) {
    const value = setE1rm(set)
    if (value === null) continue
    if (bestE1rm === null || value > bestE1rm.value) bestE1rm = { value, set }
  }

  const mostRepsAtWeight = new Map<number, SetEntry>()
  for (const set of work) {
    const existing = mostRepsAtWeight.get(set.weight)
    if (!existing || set.reps > existing.reps) mostRepsAtWeight.set(set.weight, set)
  }

  return {
    best: {
      heaviest: heaviest ? { value: heaviest.weight, set: heaviest } : null,
      best_e1rm: bestE1rm,
      most_reps_at_weight: mostReps ? { value: mostReps.reps, set: mostReps } : null,
      best_set_volume: bestVolume ? { value: setVolume(bestVolume), set: bestVolume } : null,
    },
    mostRepsAtWeight,
  }
}

/**
 * Sarjan kuittauksessa kutsuttava tarkistus (SPEC §6.3): mitkä ennätykset
 * kandidaatti rikkoo. `previousSets` on liikkeen koko aiempi historia **ilman**
 * kandidaattia.
 *
 * Tulkinnat:
 * - Lämmittely tai nollan toiston sarja ei tuota ennätystä.
 * - Ensimmäinen koskaan kirjattu työsarja on määritelmän mukaan raskain paino,
 *   paras e1RM (jos e1RM on laskettavissa) ja suurin kertavolyymi (jos volyymi
 *   on positiivinen).
 * - `most_reps_at_weight` vaatii, että samalla painolla on jo aiempi työsarja –
 *   uudella painolla tehty sarja ei ole "eniten toistoja tietyllä painolla".
 */
export function detectNewRecords(candidate: SetEntry, previousSets: SetEntry[]): RecordKind[] {
  if (candidate.warmup || candidate.reps <= 0) return []

  const previous = computeRecords(previousSets)
  const kinds: RecordKind[] = []

  const prevHeaviest = previous.best.heaviest
  if (prevHeaviest === null || candidate.weight > prevHeaviest.value) kinds.push('heaviest')

  const candidateE1rm = setE1rm(candidate)
  const prevE1rm = previous.best.best_e1rm
  if (candidateE1rm !== null && (prevE1rm === null || candidateE1rm > prevE1rm.value)) {
    kinds.push('best_e1rm')
  }

  const prevAtWeight = previous.mostRepsAtWeight.get(candidate.weight)
  if (prevAtWeight && candidate.reps > prevAtWeight.reps) kinds.push('most_reps_at_weight')

  const candidateVolume = setVolume(candidate)
  const prevVolume = previous.best.best_set_volume
  if (candidateVolume > 0 && (prevVolume === null || candidateVolume > prevVolume.value)) {
    kinds.push('best_set_volume')
  }

  return kinds
}
