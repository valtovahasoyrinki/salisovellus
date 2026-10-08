/**
 * Työsarjat ja volyymi (SPEC §6.6).
 *
 * Volyymi = Σ paino × toistot työsarjoista.
 *
 * Kehonpainoliikkeillä (`kind: 'bodyweight'`) kirjattu paino on vain lisäpaino,
 * ja avustetuissa liikkeissä se on negatiivinen. Kehonpainoa ei seurata
 * (SPEC §10), joten todellista kuormaa ei tiedetä. Valittu sääntö:
 * **volyymi lasketaan vain positiivisesta ulkoisesta kuormasta** – negatiivinen
 * lisäpaino tulkitaan nollaksi. Näin avustettu sarja ei koskaan pienennä
 * kokonaisvolyymia eikä volyymi voi mennä negatiiviseksi. Sarjan laatu näkyy
 * näissä liikkeissä paino- ja toistoennätyksistä (`heaviestSet`,
 * `bestSetByReps`), joissa negatiivinen lisäpaino vertautuu oikein: −10 kg
 * avustusta on raskaampi sarja kuin −20 kg.
 */
import type { SetEntry } from './types'

/** Työsarja = ei-lämmittelysarja. Analyysi käyttää vain näitä (SPEC §6.6). */
export function isWorkSet(set: SetEntry): boolean {
  return !set.warmup
}

export function workSets(sets: SetEntry[]): SetEntry[] {
  return sets.filter(isWorkSet)
}

export function warmupSets(sets: SetEntry[]): SetEntry[] {
  return sets.filter((set) => set.warmup)
}

/** Yhden sarjan volyymi. Negatiivinen lisäpaino ja kelvoton luku tuottavat 0. */
export function setVolume(set: SetEntry): number {
  const weight = Number.isFinite(set.weight) ? Math.max(0, set.weight) : 0
  const reps = Number.isFinite(set.reps) ? Math.max(0, set.reps) : 0
  return weight * reps
}

/** Kokonaisvolyymi työsarjoista. */
export function totalVolume(sets: SetEntry[]): number {
  let total = 0
  for (const set of workSets(sets)) total += setVolume(set)
  return total
}

export function workSetCount(sets: SetEntry[]): number {
  return workSets(sets).length
}

/**
 * Raskain työsarja. Tasapainossa voittaa useampi toisto.
 * Negatiivinen lisäpaino kelpaa: vähemmän avustusta on raskaampi sarja.
 */
export function heaviestSet(sets: SetEntry[]): SetEntry | null {
  let best: SetEntry | null = null
  for (const set of workSets(sets)) {
    if (
      best === null ||
      set.weight > best.weight ||
      (set.weight === best.weight && set.reps > best.reps)
    ) {
      best = set
    }
  }
  return best
}

/** Eniten toistoja tehnyt työsarja. Tasapelissä voittaa raskaampi paino. */
export function bestSetByReps(sets: SetEntry[]): SetEntry | null {
  let best: SetEntry | null = null
  for (const set of workSets(sets)) {
    if (
      best === null ||
      set.reps > best.reps ||
      (set.reps === best.reps && set.weight > best.weight)
    ) {
      best = set
    }
  }
  return best
}

/**
 * Suurimman kertavolyymin työsarja. `null` myös silloin, kun yhdenkään sarjan
 * volyymi ei ole positiivinen (pelkkä kehonpaino tai avustettu liike) – silloin
 * kertavolyymi ei ole mielekäs mittari.
 */
export function bestSetVolume(sets: SetEntry[]): SetEntry | null {
  let best: SetEntry | null = null
  let bestValue = 0
  for (const set of workSets(sets)) {
    const value = setVolume(set)
    if (value > bestValue) {
      best = set
      bestValue = value
    }
  }
  return best
}

/** Kestoliikkeiden (`kind: 'time'`) yhteenlaskettu aika työsarjoista. */
export function totalDurationSec(sets: SetEntry[]): number {
  let total = 0
  for (const set of workSets(sets)) total += set.durationSec ?? 0
  return total
}
