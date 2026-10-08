import { describe, expect, it } from 'vitest'
import { summarizeSession, type SummarySessionInput } from './sessionSummary'
import type { Exercise, Session, SetEntry } from './types'

const START = Date.parse('2026-10-07T15:00:00Z')

const bench: Exercise = {
  id: 'penkki',
  name: 'Penkkipunnerrus',
  primaryMuscles: ['chest'],
  secondaryMuscles: ['triceps'],
  equipment: 'barbell',
  kind: 'weight_reps',
  increment: 2.5,
  defaultRestSec: 180,
  defaultRepRange: { min: 6, max: 10 },
  notes: '',
  archived: false,
  isCustom: false,
  createdAt: 0,
}

let counter = 0

const set = (over: Partial<SetEntry>): SetEntry => {
  counter += 1
  return {
    id: `s${counter}`,
    sessionExerciseId: 'se1',
    sessionId: 'nyt',
    exerciseId: 'penkki',
    order: 0,
    weight: 80,
    reps: 8,
    warmup: false,
    completedAt: START + 600_000,
    ...over,
  }
}

const session = (id: string, startedAt: number, endedAt?: number): Session => ({
  id,
  dayId: 'push',
  dayName: 'Push',
  startedAt,
  endedAt,
  note: '',
  status: endedAt === undefined ? 'active' : 'done',
  dateKey: '2026-10-07',
})

const input = (
  sets: SetEntry[],
  options: { endedAt?: number; history?: SetEntry[] } = {},
): SummarySessionInput => ({
  session: session('nyt', START, options.endedAt),
  exercises: [{ exercise: bench, sets, history: options.history }],
})

describe('treenin yhteenveto', () => {
  it('laskee keston, työsarjat ja volyymin', () => {
    const summary = summarizeSession(
      input(
        [
          set({ order: 0, warmup: true, weight: 40, reps: 10 }),
          set({ order: 1, weight: 80, reps: 8 }),
          set({ order: 2, weight: 80, reps: 7 }),
        ],
        { endedAt: START + 3_600_000 },
      ),
    )
    expect(summary.durationSec).toBe(3600)
    expect(summary.workSetCount).toBe(2)
    expect(summary.totalVolume).toBe(1200)
    expect(summary.dayName).toBe('Push')
  })

  it('kesken olevan treenin kesto lasketaan viimeiseen sarjaan', () => {
    const summary = summarizeSession(input([set({ completedAt: START + 1_800_000 })]))
    expect(summary.durationSec).toBe(1800)
  })

  it('tyhjä treeni ei tuota negatiivista kestoa eikä volyymia', () => {
    const summary = summarizeSession(input([]))
    expect(summary.durationSec).toBe(0)
    expect(summary.totalVolume).toBe(0)
    expect(summary.workSetCount).toBe(0)
    expect(summary.records).toEqual([])
  })

  it('ilman edellistä kertaa muutokset ovat tuntemattomia', () => {
    const summary = summarizeSession(input([set({})]))
    expect(summary.previous).toBeNull()
    expect(summary.exercises[0]?.volumeDelta).toBeNull()
    expect(summary.exercises[0]?.bestE1rmDelta).toBeNull()
    expect(summary.exercises[0]?.heaviestWeightDelta).toBeNull()
  })

  it('vertaa saman päivän edelliseen kertaan', () => {
    const previousStart = START - 7 * 86_400_000
    const previous: SummarySessionInput = {
      session: session('edellinen', previousStart, previousStart + 3_600_000),
      exercises: [
        {
          exercise: bench,
          sets: [
            set({ sessionId: 'edellinen', order: 0, weight: 77.5, reps: 8, completedAt: previousStart }),
            set({ sessionId: 'edellinen', order: 1, weight: 77.5, reps: 8, completedAt: previousStart }),
          ],
        },
      ],
    }
    const summary = summarizeSession({
      ...input([set({ order: 0, weight: 80, reps: 8 }), set({ order: 1, weight: 80, reps: 8 })], {
        endedAt: START + 3_600_000,
      }),
      previous,
    })

    expect(summary.previous?.sessionId).toBe('edellinen')
    expect(summary.previous?.volumeDelta).toBe(1280 - 1240)
    expect(summary.previous?.workSetCountDelta).toBe(0)
    expect(summary.exercises[0]?.volumeDelta).toBe(40)
    expect(summary.exercises[0]?.heaviestWeightDelta).toBe(2.5)
    expect(summary.exercises[0]?.bestE1rmDelta).toBeCloseTo(3.16, 2)
  })

  it('tunnistaa kaikkien aikojen ennätykset annetusta historiasta', () => {
    const history = [set({ sessionId: 'vanha', weight: 80, reps: 8, completedAt: START - 86_400_000 })]
    const summary = summarizeSession(
      input([set({ order: 0, weight: 85, reps: 8 })], { history }),
    )
    expect(summary.records.map((hit) => hit.kind)).toEqual([
      'heaviest',
      'best_e1rm',
      'best_set_volume',
    ])
    expect(summary.records[0]?.exerciseName).toBe('Penkkipunnerrus')
    expect(summary.records[0]?.value).toBe(85)
    expect(summary.exercises[0]?.records).toContain('heaviest')
  })

  it('kolme peräkkäistä parannusta tuottaa yhden ennätyksen tyyppiä kohti', () => {
    const history = [set({ sessionId: 'vanha', weight: 80, reps: 8 })]
    const summary = summarizeSession(
      input(
        [
          set({ order: 0, weight: 82.5, reps: 8 }),
          set({ order: 1, weight: 85, reps: 8 }),
          set({ order: 2, weight: 87.5, reps: 8 }),
        ],
        { history },
      ),
    )
    expect(summary.records.filter((hit) => hit.kind === 'heaviest')).toHaveLength(1)
    expect(summary.records.find((hit) => hit.kind === 'heaviest')?.value).toBe(87.5)
  })

  it('lämmittelysarja ei tuota ennätystä', () => {
    const summary = summarizeSession(
      input([set({ order: 0, warmup: true, weight: 300, reps: 5 })], { history: [] }),
    )
    expect(summary.records).toEqual([])
  })

  it('ilman historiaa ennätykset ovat parannuksia edelliseen kertaan', () => {
    const previousStart = START - 7 * 86_400_000
    const previous: SummarySessionInput = {
      session: session('edellinen', previousStart, previousStart + 3_600_000),
      exercises: [
        {
          exercise: bench,
          sets: [set({ sessionId: 'edellinen', weight: 80, reps: 8, completedAt: previousStart })],
        },
      ],
    }
    const summary = summarizeSession({
      ...input([set({ order: 0, weight: 80, reps: 8 })]),
      previous,
    })
    expect(summary.records).toEqual([])
  })
})
