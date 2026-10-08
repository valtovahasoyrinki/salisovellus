import { describe, expect, it } from 'vitest'
import { suggestProgression } from './progression'
import type { SessionSetGroup } from './sessionGroups'
import type { SetEntry } from './types'

let counter = 0

const set = (over: Partial<SetEntry>): SetEntry => {
  counter += 1
  return {
    id: `s${counter}`,
    sessionExerciseId: 'se1',
    sessionId: 'sess1',
    exerciseId: 'ex1',
    order: 0,
    weight: 80,
    reps: 8,
    warmup: false,
    completedAt: 0,
    ...over,
  }
}

/** Yksi kerta, jossa annetut paino × toistot -parit työsarjoina. */
const session = (
  sessionId: string,
  completedAt: number,
  pairs: Array<[number, number]>,
): SessionSetGroup => ({
  sessionId,
  completedAt,
  sets: pairs.map(([weight, reps], index) =>
    set({ sessionId, weight, reps, order: index, completedAt }),
  ),
})

const range = { min: 6, max: 10 }

describe('kaksoisprogressio', () => {
  it('tyhjä historia ei tuota ehdotusta', () => {
    expect(
      suggestProgression({ history: [], repRange: range, increment: 2.5, kind: 'weight_reps' }),
    ).toBeNull()
  })

  it('pelkkien lämmittelyjen kerta ei tuota ehdotusta', () => {
    const history: SessionSetGroup[] = [
      {
        sessionId: 'a',
        completedAt: 1_000,
        sets: [set({ warmup: true, weight: 60, reps: 10 })],
      },
    ]
    expect(
      suggestProgression({ history, repRange: range, increment: 2.5, kind: 'weight_reps' }),
    ).toBeNull()
  })

  it('kaikki työsarjat ylärajassa nostaa painoa ja palauttaa alarajaan', () => {
    const history = [session('a', 1_000, [[82.5, 10], [82.5, 10], [82.5, 10]])]
    const result = suggestProgression({
      history,
      repRange: range,
      increment: 2.5,
      kind: 'weight_reps',
    })
    expect(result).toMatchObject({ kind: 'increase', weight: 85, reps: 6 })
    expect(result?.message).toContain('85 kg')
    expect(result?.message).toContain('10')
  })

  it('yksi sarja riittää ehdotukseen', () => {
    const history = [session('a', 1_000, [[100, 10]])]
    expect(
      suggestProgression({ history, repRange: range, increment: 2.5, kind: 'weight_reps' }),
    ).toMatchObject({ kind: 'increase', weight: 102.5 })
  })

  it('kesken toistoalueen ehdottaa samaa painoa ja yhtä toistoa lisää', () => {
    const history = [session('a', 1_000, [[80, 8], [80, 8], [80, 7]])]
    const result = suggestProgression({
      history,
      repRange: range,
      increment: 2.5,
      kind: 'weight_reps',
    })
    expect(result).toMatchObject({ kind: 'add_rep', weight: 80, reps: 9 })
    expect(result?.message).toContain('80 kg')
  })

  it('tavoitetoistot eivät ylitä toistoalueen ylärajaa', () => {
    const history = [session('a', 1_000, [[80, 10], [80, 7]])]
    expect(
      suggestProgression({ history, repRange: range, increment: 2.5, kind: 'weight_reps' }),
    ).toMatchObject({ kind: 'add_rep', reps: 10 })
  })

  it('kaksi peräkkäistä alitusta pitää painon ennallaan', () => {
    const history = [
      session('a', 1_000, [[100, 5], [100, 4]]),
      session('b', 2_000, [[100, 5], [100, 4]]),
    ]
    const result = suggestProgression({
      history,
      repRange: range,
      increment: 2.5,
      kind: 'weight_reps',
    })
    expect(result).toMatchObject({ kind: 'hold', weight: 100, reps: 6 })
    expect(result?.message).toContain('100 kg')
  })

  it('kolmas peräkkäinen alitus kevennetään noin kymmenen prosenttia', () => {
    const history = [
      session('a', 1_000, [[100, 5]]),
      session('b', 2_000, [[100, 5]]),
      session('c', 3_000, [[100, 4]]),
    ]
    const result = suggestProgression({
      history,
      repRange: range,
      increment: 2.5,
      kind: 'weight_reps',
    })
    expect(result).toMatchObject({ kind: 'deload', weight: 90, reps: 6 })
    expect(result?.message).toContain('90 kg')
  })

  it('yksi alitus ei vielä muuta suuntaa', () => {
    const history = [session('a', 1_000, [[100, 8]]), session('b', 2_000, [[100, 5]])]
    expect(
      suggestProgression({ history, repRange: range, increment: 2.5, kind: 'weight_reps' }),
    ).toMatchObject({ kind: 'add_rep', weight: 100, reps: 6 })
  })

  it('kehonpainoliikkeen negatiivinen lisäpaino kevennetään askeleella avustusta', () => {
    const history = [
      session('a', 1_000, [[-20, 4]]),
      session('b', 2_000, [[-20, 4]]),
      session('c', 3_000, [[-20, 4]]),
    ]
    expect(
      suggestProgression({ history, repRange: range, increment: 2.5, kind: 'bodyweight' }),
    ).toMatchObject({ kind: 'deload', weight: -22.5 })
  })

  it('kehonpainoliike nostaa lisäpainoa normaalisti', () => {
    const history = [session('a', 1_000, [[10, 10], [10, 10]])]
    expect(
      suggestProgression({ history, repRange: range, increment: 1.25, kind: 'bodyweight' }),
    ).toMatchObject({ kind: 'increase', weight: 11.25, reps: 6 })
  })

  it('kestoliikkeelle ei ehdoteta toistoprogressiota', () => {
    const history = [session('a', 1_000, [[0, 1]])]
    expect(
      suggestProgression({ history, repRange: { min: 1, max: 1 }, increment: 1.25, kind: 'time' }),
    ).toBeNull()
  })

  it('käyttää viimeisen kerran raskainta työsarjapainoa, ei nousevia sarjoja', () => {
    const history = [session('a', 1_000, [[60, 10], [80, 10], [80, 10]])]
    expect(
      suggestProgression({ history, repRange: range, increment: 2.5, kind: 'weight_reps' }),
    ).toMatchObject({ kind: 'increase', weight: 82.5 })
  })
})
