/**
 * Treenin yhteenveto (SPEC §6.5): kesto, työsarjat, kokonaisvolyymi,
 * liikekohtaiset muutokset edelliskertaan, rikotut ennätykset ja vertailu
 * saman päivän edelliseen kertaan.
 *
 * Funktio on puhdas: kutsuja (yhteenvetonäkymä) lukee tiedot repositorioista ja
 * antaa ne tähän valmiina taulukkoina.
 *
 * Ennätykset: jos liikkeelle annetaan `history` (liikkeen aiemmat sarjat ilman
 * tätä treeniä), ennätykset ovat kaikkien aikojen ennätyksiä. Jos `history`
 * jätetään pois, vertailutasona on edellisen kerran sarjat – silloin "ennätys"
 * tarkoittaa parannusta edelliseen kertaan. Kutsuja valitsee kumpaa tarvitsee.
 */
import { bestE1rm } from './e1rm'
import { detectNewRecords, type RecordEntry } from './records'
import type { Exercise, RecordKind, Session, SetEntry } from './types'
import { bestSetByReps, heaviestSet, setVolume, totalVolume, workSetCount, workSets } from './volume'

export interface SummaryExerciseInput {
  exercise: Exercise
  /** Tämän treenin sarjat (lämmittelyt mukana). */
  sets: SetEntry[]
  /** Liikkeen aiempi historia ilman tätä treeniä, kaikkien aikojen ennätyksiin. */
  history?: SetEntry[]
}

export interface SummarySessionInput {
  session: Session
  exercises: SummaryExerciseInput[]
}

export interface SummarizeSessionInput extends SummarySessionInput {
  /** Saman päivän edellinen kerta, jos sellainen on. */
  previous?: SummarySessionInput
}

/** Muutos edelliskertaan: `null` tarkoittaa "ei vertailukohtaa". */
export interface SessionExerciseSummary {
  exerciseId: string
  exerciseName: string
  workSetCount: number
  volume: number
  volumeDelta: number | null
  bestE1rm: number | null
  bestE1rmDelta: number | null
  heaviestWeight: number | null
  heaviestWeightDelta: number | null
  bestReps: number | null
  /** Tässä treenissä rikotut ennätystyypit. */
  records: RecordKind[]
}

export interface SessionRecordHit {
  exerciseId: string
  exerciseName: string
  kind: RecordKind
  value: number
  set: SetEntry
}

export interface SessionComparison {
  sessionId: string
  startedAt: number
  totalVolume: number
  workSetCount: number
  /** Tämän treenin volyymi miinus edellisen. */
  volumeDelta: number
  workSetCountDelta: number
}

export interface SessionSummary {
  sessionId: string
  dayName: string
  startedAt: number
  durationSec: number
  workSetCount: number
  totalVolume: number
  exercises: SessionExerciseSummary[]
  records: SessionRecordHit[]
  /** Vertailu saman päivän edelliseen kertaan, `null` jos ensimmäinen kerta. */
  previous: SessionComparison | null
}

function allSets(input: SummarySessionInput): SetEntry[] {
  return input.exercises.flatMap((entry) => entry.sets)
}

/** Kesto: päättymisaika, tai jos treeni on kesken, viimeisen sarjan aikaleima. */
function durationSecOf(input: SummarySessionInput): number {
  const lastSetAt = allSets(input).reduce((latest, set) => Math.max(latest, set.completedAt), 0)
  const end = input.session.endedAt ?? (lastSetAt > 0 ? lastSetAt : input.session.startedAt)
  return Math.max(0, Math.round((end - input.session.startedAt) / 1000))
}

function recordValue(kind: RecordKind, set: SetEntry): number {
  switch (kind) {
    case 'heaviest':
      return set.weight
    case 'best_e1rm':
      return bestE1rm([set])?.value ?? 0
    case 'most_reps_at_weight':
      return set.reps
    case 'best_set_volume':
      return setVolume(set)
  }
}

/**
 * Treenin aikana rikotut ennätykset liikkeelle. Sarjat käydään järjestyksessä,
 * ja jo kuitatut sarjat liitetään vertailuhistoriaan – näin kolme peräkkäistä
 * parannusta tuottaa yhden ennätyksen tyyppiä kohti, ei kolmea.
 */
function exerciseRecordHits(
  entry: SummaryExerciseInput,
  fallbackHistory: SetEntry[],
): Map<RecordKind, RecordEntry> {
  const baseline = [...(entry.history ?? fallbackHistory)]
  const hits = new Map<RecordKind, RecordEntry>()

  for (const set of [...entry.sets].sort((a, b) => a.order - b.order)) {
    for (const kind of detectNewRecords(set, baseline)) {
      hits.set(kind, { value: recordValue(kind, set), set })
    }
    baseline.push(set)
  }
  return hits
}

export function summarizeSession(input: SummarizeSessionInput): SessionSummary {
  const previousByExercise = new Map<string, SetEntry[]>()
  for (const entry of input.previous?.exercises ?? []) {
    previousByExercise.set(entry.exercise.id, entry.sets)
  }

  const records: SessionRecordHit[] = []
  const exercises: SessionExerciseSummary[] = input.exercises.map((entry) => {
    const previousSets = previousByExercise.get(entry.exercise.id)
    const hits = exerciseRecordHits(entry, previousSets ?? [])
    for (const [kind, hit] of hits) {
      records.push({
        exerciseId: entry.exercise.id,
        exerciseName: entry.exercise.name,
        kind,
        value: hit.value,
        set: hit.set,
      })
    }

    const volume = totalVolume(entry.sets)
    const e1rmNow = bestE1rm(entry.sets)?.value ?? null
    const heaviestNow = heaviestSet(entry.sets)?.weight ?? null
    const bestReps = bestSetByReps(entry.sets)?.reps ?? null

    const e1rmBefore = previousSets ? (bestE1rm(previousSets)?.value ?? null) : null
    const heaviestBefore = previousSets ? (heaviestSet(previousSets)?.weight ?? null) : null

    return {
      exerciseId: entry.exercise.id,
      exerciseName: entry.exercise.name,
      workSetCount: workSetCount(entry.sets),
      volume,
      volumeDelta: previousSets ? volume - totalVolume(previousSets) : null,
      bestE1rm: e1rmNow,
      bestE1rmDelta: e1rmNow !== null && e1rmBefore !== null ? e1rmNow - e1rmBefore : null,
      heaviestWeight: heaviestNow,
      heaviestWeightDelta:
        heaviestNow !== null && heaviestBefore !== null ? heaviestNow - heaviestBefore : null,
      bestReps,
      records: [...hits.keys()],
    }
  })

  const sets = allSets(input)
  const total = totalVolume(sets)
  const workCount = workSets(sets).length

  let previous: SessionComparison | null = null
  if (input.previous) {
    const previousSets = allSets(input.previous)
    const previousTotal = totalVolume(previousSets)
    const previousCount = workSets(previousSets).length
    previous = {
      sessionId: input.previous.session.id,
      startedAt: input.previous.session.startedAt,
      totalVolume: previousTotal,
      workSetCount: previousCount,
      volumeDelta: total - previousTotal,
      workSetCountDelta: workCount - previousCount,
    }
  }

  return {
    sessionId: input.session.id,
    dayName: input.session.dayName,
    startedAt: input.session.startedAt,
    durationSec: durationSecOf(input),
    workSetCount: workCount,
    totalVolume: total,
    exercises,
    records,
    previous,
  }
}
