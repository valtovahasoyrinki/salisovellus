/**
 * Kaksoisprogressio (SPEC §6.6): ensin toistot ylärajaan, sitten paino ylös.
 *
 * Säännöt:
 * 1. Edellisen kerran työsarjat ylärajassa → paino + `increment`, tavoite
 *    alaraja (`increase`).
 * 2. Paras työsarja jäi alarajan alle kahdella peräkkäisellä kerralla → sama
 *    paino, tavoite alaraja (`hold`). Kolmannella peräkkäisellä kerralla
 *    kevennetään noin 10 % (`deload`): kaksi kertaa voi olla huono päivä, kolme
 *    kertaa on liian raskas paino.
 * 3. Muuten sama paino ja tavoite +1 toisto (`add_rep`).
 *
 * Vertailupainona on edellisen kerran **raskain työsarjapaino** ja sillä
 * painolla tehdyt sarjat. Tavallisessa tapauksessa (kaikki työsarjat samalla
 * painolla) tämä on sama kuin SPECin "kaikki työsarjat", mutta tulkinta kestää
 * myös nousevat sarjat ja pudotussarjat ilman virhetulkintaa.
 */
import { bestSetByReps, workSets } from './volume'
import type { SessionSetGroup } from './sessionGroups'
import type { ExerciseKind, RepRange, SetEntry } from './types'

export type ProgressionKind = 'increase' | 'add_rep' | 'hold' | 'deload'

export interface ProgressionSuggestion {
  weight: number
  reps: number
  kind: ProgressionKind
  /** Lyhyt suomenkielinen perustelu numeroilla (valmentajasävy, SPEC §6.9). */
  message: string
}

export interface ProgressionInput {
  /** Liikkeen historia aikajärjestyksessä (`groupSetsBySession`). */
  history: SessionSetGroup[]
  repRange: RepRange
  increment: number
  kind: ExerciseKind
}

// Domain-kerros ei riipu src/lib/formatista, joten desimaalipilkku muotoillaan tässä.
const numberFormatter = new Intl.NumberFormat('fi-FI', { maximumFractionDigits: 2 })

function kg(value: number): string {
  return `${numberFormatter.format(value)} kg`
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/** Kevennys noin 10 %, pyöristettynä alaspäin painonlisäyksen monikertaan. */
function deloadWeight(weight: number, increment: number, kind: ExerciseKind): number {
  // Kehonpainoliikkeen lisäpaino voi olla nolla tai negatiivinen (avustus):
  // silloin prosentti ei toimi, vaan kevennys on yksi askel lisää avustusta.
  if (kind === 'bodyweight' && weight <= increment) return round2(weight - increment)
  const steps = Math.floor((weight * 0.9) / increment + 1e-9)
  const candidate = round2(Math.max(increment, steps * increment))
  return Math.min(candidate, round2(weight - increment))
}

/** Peräkkäisten kertojen määrä lopusta, joilla paras työsarja jäi alle alarajan. */
function trailingMissStreak(groups: SessionSetGroup[], minReps: number): number {
  let streak = 0
  for (let i = groups.length - 1; i >= 0; i -= 1) {
    const best = bestSetByReps(groups[i]?.sets ?? [])
    if (best && best.reps < minReps) streak += 1
    else break
  }
  return streak
}

export function suggestProgression(input: ProgressionInput): ProgressionSuggestion | null {
  // Kestoliikkeille (plank) ei ehdoteta toistoprogressiota: mittari on aika.
  if (input.kind === 'time') return null

  const minReps = Math.min(input.repRange.min, input.repRange.max)
  const maxReps = Math.max(input.repRange.min, input.repRange.max)
  const increment = input.increment > 0 ? input.increment : 2.5

  const groups = input.history.filter((group) => workSets(group.sets).length > 0)
  const last = groups.at(-1)
  if (!last) return null

  const lastWork = workSets(last.sets)
  const topWeight = lastWork.reduce((max, set) => Math.max(max, set.weight), -Infinity)
  const topSets: SetEntry[] = lastWork.filter((set) => set.weight === topWeight)
  const bestReps = topSets.reduce((max, set) => Math.max(max, set.reps), 0)

  if (topSets.every((set) => set.reps >= maxReps)) {
    const weight = round2(topWeight + increment)
    return {
      weight,
      reps: minReps,
      kind: 'increase',
      message: `${topSets.length === 1 ? 'Työsarja' : `Kaikki ${topSets.length} työsarjaa`} ylärajassa ${maxReps}. Nosta ${kg(weight)} ja aloita ${minReps} toistosta.`,
    }
  }

  const missStreak = trailingMissStreak(groups, minReps)
  if (missStreak >= 3) {
    const weight = deloadWeight(topWeight, increment, input.kind)
    if (weight < topWeight) {
      const drop = topWeight > 0 ? Math.round(((topWeight - weight) / topWeight) * 100) : 0
      const dropText = drop > 0 ? `, −${drop} %` : ''
      return {
        weight,
        reps: minReps,
        kind: 'deload',
        message: `${missStreak} kertaa alle ${minReps} toiston. Kevennä ${kg(weight)}${dropText} ja rakenna takaisin.`,
      }
    }
  }

  if (missStreak >= 2) {
    return {
      weight: topWeight,
      reps: minReps,
      kind: 'hold',
      message: `Alaraja ${minReps} jäi kahdesti saavuttamatta (paras ${bestReps}). Pidä ${kg(topWeight)} ja tähtää ${minReps} toistoon.`,
    }
  }

  return {
    weight: topWeight,
    reps: Math.min(maxReps, bestReps + 1),
    kind: 'add_rep',
    message: `Viimeksi ${kg(topWeight)} × ${bestReps}. Sama paino, tavoite ${Math.min(maxReps, bestReps + 1)} toistoa.`,
  }
}
