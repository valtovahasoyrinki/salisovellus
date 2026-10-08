import { describe, expect, it } from 'vitest'
import type { SetEntry } from './types'
import {
  bestSetByReps,
  bestSetVolume,
  heaviestSet,
  isWorkSet,
  setVolume,
  totalVolume,
  workSetCount,
  workSets,
} from './volume'

const set = (over: Partial<SetEntry> = {}): SetEntry => ({
  id: 's1',
  sessionExerciseId: 'se1',
  sessionId: 'sess1',
  exerciseId: 'ex1',
  order: 0,
  weight: 80,
  reps: 8,
  warmup: false,
  completedAt: 0,
  ...over,
})

describe('työsarjat', () => {
  it('lämmittely ei ole työsarja', () => {
    expect(isWorkSet(set())).toBe(true)
    expect(isWorkSet(set({ warmup: true }))).toBe(false)
  })

  it('suodattaa lämmittelyt pois', () => {
    const sets = [set({ id: 'a', warmup: true }), set({ id: 'b' })]
    expect(workSets(sets).map((row) => row.id)).toEqual(['b'])
    expect(workSetCount(sets)).toBe(1)
  })
})

describe('volyymi', () => {
  it('sarjan volyymi on paino × toistot', () => {
    expect(setVolume(set({ weight: 80, reps: 8 }))).toBe(640)
  })

  it('tyhjä historia tuottaa nollan', () => {
    expect(totalVolume([])).toBe(0)
  })

  it('laskee vain työsarjat', () => {
    expect(
      totalVolume([set({ id: 'a', warmup: true, weight: 40, reps: 10 }), set({ id: 'b' })]),
    ).toBe(640)
  })

  it('yksi sarja riittää', () => {
    expect(totalVolume([set({ weight: 100, reps: 3 })])).toBe(300)
  })

  it('pelkät lämmittelysarjat tuottavat nollan', () => {
    expect(totalVolume([set({ warmup: true }), set({ id: 'b', warmup: true })])).toBe(0)
  })

  it('kehonpainoliike ilman lisäpainoa tuottaa nollavolyymin', () => {
    expect(setVolume(set({ weight: 0, reps: 12 }))).toBe(0)
  })

  it('negatiivinen lisäpaino (avustettu liike) ei tuota NaN:ia eikä negatiivista volyymia', () => {
    const assisted = set({ weight: -20, reps: 8 })
    expect(setVolume(assisted)).toBe(0)
    const total = totalVolume([assisted, set({ id: 'b', weight: -10, reps: 6 })])
    expect(Number.isNaN(total)).toBe(false)
    expect(total).toBe(0)
  })

  it('kelvoton luku ei vuoda NaN:ina kokonaisvolyymiin', () => {
    expect(totalVolume([set({ weight: Number.NaN, reps: 8 })])).toBe(0)
  })
})

describe('parhaat sarjat', () => {
  it('tyhjä historia palauttaa null', () => {
    expect(heaviestSet([])).toBeNull()
    expect(bestSetByReps([])).toBeNull()
    expect(bestSetVolume([])).toBeNull()
  })

  it('raskain sarja: tasapainossa voittaa useampi toisto', () => {
    const fewer = set({ id: 'a', weight: 100, reps: 5 })
    const more = set({ id: 'b', weight: 100, reps: 7 })
    expect(heaviestSet([fewer, more])?.id).toBe('b')
  })

  it('raskain sarja vertaa negatiivista lisäpainoa oikein', () => {
    // Avustettu leuanveto: −10 kg avustusta on raskaampi sarja kuin −20 kg.
    const easier = set({ id: 'a', weight: -20, reps: 8 })
    const harder = set({ id: 'b', weight: -10, reps: 8 })
    expect(heaviestSet([easier, harder])?.id).toBe('b')
  })

  it('toistorikkain sarja: tasapelissä voittaa raskaampi paino', () => {
    const light = set({ id: 'a', weight: 60, reps: 10 })
    const heavy = set({ id: 'b', weight: 70, reps: 10 })
    expect(bestSetByReps([light, heavy])?.id).toBe('b')
  })

  it('kertavolyymin ennätys vaatii positiivisen volyymin', () => {
    expect(bestSetVolume([set({ weight: 0, reps: 15 })])).toBeNull()
    expect(bestSetVolume([set({ weight: -20, reps: 10 })])).toBeNull()
  })

  it('kertavolyymi valitsee suurimman työsarjan', () => {
    const a = set({ id: 'a', weight: 100, reps: 5 })
    const b = set({ id: 'b', weight: 80, reps: 10 })
    expect(bestSetVolume([a, b])?.id).toBe('b')
  })

  it('lämmittelyt eivät voi olla parhaita sarjoja', () => {
    const warmup = set({ id: 'a', warmup: true, weight: 200, reps: 10 })
    const work = set({ id: 'b', weight: 80, reps: 8 })
    expect(heaviestSet([warmup, work])?.id).toBe('b')
    expect(bestSetByReps([warmup, work])?.id).toBe('b')
    expect(bestSetVolume([warmup, work])?.id).toBe('b')
  })
})
