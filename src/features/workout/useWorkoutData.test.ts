import { describe, expect, it } from 'vitest'
import type { SetEntry } from '@/domain/types'
import { initialSetValues } from './useWorkoutData'

const set = (weight: number, reps: number): SetEntry => ({
  id: `s${weight}-${reps}`,
  sessionExerciseId: 'se1',
  sessionId: 'sess1',
  exerciseId: 'e1',
  order: 0,
  weight,
  reps,
  warmup: false,
  completedAt: 1_700_000_000_000,
})

const suggestion = {
  weight: 85,
  reps: 6,
  kind: 'increase' as const,
  message: 'Nosta 85 kg.',
}

const repRange = { min: 6, max: 10 }

describe('sarjarivin esitäyttö', () => {
  it('käyttää progressioehdotusta, kun treenissä ei ole vielä rivejä', () => {
    expect(
      initialSetValues({
        workSetIndex: 0,
        suggestion,
        previousWorkSets: [set(80, 8)],
        repRange,
        isBodyweight: false,
      }),
    ).toEqual({ weight: 85, reps: 6 })
  })

  it('kopioi tämän treenin edellisen rivin, jos sellainen on', () => {
    expect(
      initialSetValues({
        workSetIndex: 1,
        suggestion,
        previousWorkSets: [set(80, 8)],
        lastRowInSession: { weight: 82.5, reps: 7 },
        repRange,
        isBodyweight: false,
      }),
    ).toEqual({ weight: 82.5, reps: 7 })
  })

  it('putoaa edellisen kerran samaan sarjaan ilman ehdotusta', () => {
    expect(
      initialSetValues({
        workSetIndex: 1,
        suggestion: null,
        previousWorkSets: [set(80, 8), set(80, 7)],
        repRange,
        isBodyweight: false,
      }),
    ).toEqual({ weight: 80, reps: 7 })
  })

  it('käyttää edellisen kerran viimeistä sarjaa, jos rivejä on enemmän kuin viimeksi', () => {
    expect(
      initialSetValues({
        workSetIndex: 5,
        suggestion: null,
        previousWorkSets: [set(80, 8), set(80, 6)],
        repRange,
        isBodyweight: false,
      }),
    ).toEqual({ weight: 80, reps: 6 })
  })

  it('ensimmäisellä kerralla ehdotus on tanko ja toistoalueen alaraja', () => {
    expect(
      initialSetValues({
        workSetIndex: 0,
        suggestion: null,
        previousWorkSets: [],
        repRange,
        isBodyweight: false,
      }),
    ).toEqual({ weight: 20, reps: 6 })
  })

  it('kehonpainoliikkeellä lisäpaino on nolla eikä tangon painoa oleteta', () => {
    expect(
      initialSetValues({
        workSetIndex: 0,
        suggestion: null,
        previousWorkSets: [],
        repRange,
        isBodyweight: true,
      }),
    ).toEqual({ weight: 0, reps: 6 })
  })
})
