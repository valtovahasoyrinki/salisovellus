import { describe, expect, it } from 'vitest'
import type { SessionSetGroup } from './sessionGroups'
import { e1rmTrend, linearRegression } from './trend'
import type { SetEntry } from './types'

let counter = 0

/** Kerta, jossa yksi työsarja. Toistot = 1, joten e1RM on paino sellaisenaan. */
const session = (iso: string, weight: number, reps = 1): SessionSetGroup => {
  counter += 1
  const completedAt = Date.parse(iso)
  const entry: SetEntry = {
    id: `s${counter}`,
    sessionExerciseId: 'se1',
    sessionId: `sess${counter}`,
    exerciseId: 'ex1',
    order: 0,
    weight,
    reps,
    warmup: false,
    completedAt,
  }
  return { sessionId: entry.sessionId, completedAt, sets: [entry] }
}

describe('lineaarinen regressio', () => {
  it('laskee kulmakertoimen ja vakion', () => {
    expect(linearRegression([{ x: 0, y: 0 }, { x: 1, y: 2 }])).toEqual({ slope: 2, intercept: 0 })
  })

  it('sovittaa suoran hajonnan läpi', () => {
    const line = linearRegression([
      { x: 0, y: 1 },
      { x: 1, y: 3 },
      { x: 2, y: 4 },
      { x: 3, y: 6 },
    ])
    expect(line?.slope).toBeCloseTo(1.6, 5)
    expect(line?.intercept).toBeCloseTo(1.1, 5)
  })

  it('alle kahdella pisteellä ei ole suoraa', () => {
    expect(linearRegression([])).toBeNull()
    expect(linearRegression([{ x: 1, y: 1 }])).toBeNull()
  })

  it('pystysuora (sama x) ei tuota suoraa', () => {
    expect(linearRegression([{ x: 5, y: 1 }, { x: 5, y: 9 }])).toBeNull()
  })
})

describe('e1RM-trendi', () => {
  it('tyhjä historia ei tuota trendiä', () => {
    expect(e1rmTrend([])).toBeNull()
  })

  it('alle neljä datapistettä ei riitä', () => {
    const history = [
      session('2026-01-05T10:00:00Z', 100),
      session('2026-01-12T10:00:00Z', 102),
      session('2026-01-19T10:00:00Z', 104),
    ]
    expect(e1rmTrend(history)).toBeNull()
  })

  it('neljä pistettä riittää ja muutos ilmaistaan prosenttina neljässä viikossa', () => {
    const history = [
      session('2026-01-05T10:00:00Z', 100),
      session('2026-01-12T10:00:00Z', 102),
      session('2026-01-19T10:00:00Z', 104),
      session('2026-01-26T10:00:00Z', 106),
    ]
    const trend = e1rmTrend(history)
    expect(trend?.pointCount).toBe(4)
    expect(trend?.firstValue).toBe(100)
    expect(trend?.lastValue).toBe(106)
    expect(trend?.changePctPer4Weeks).toBeCloseTo(8, 1)
  })

  it('laskeva kehitys tuottaa negatiivisen trendin', () => {
    const history = [
      session('2026-01-05T10:00:00Z', 106),
      session('2026-01-12T10:00:00Z', 104),
      session('2026-01-19T10:00:00Z', 102),
      session('2026-01-26T10:00:00Z', 100),
    ]
    expect(e1rmTrend(history)?.changePctPer4Weeks).toBeLessThan(0)
  })

  it('kesäaikasiirtymä ei vääristä aikaväliä', () => {
    // 29.3.2026 kello siirtyy eteenpäin: kerrat ovat silti täsmälleen viikon välein.
    const history = [
      session('2026-03-15T10:00:00Z', 100),
      session('2026-03-22T10:00:00Z', 102),
      session('2026-03-29T10:00:00Z', 104),
      session('2026-04-05T10:00:00Z', 106),
    ]
    expect(e1rmTrend(history)?.changePctPer4Weeks).toBeCloseTo(8, 1)
  })

  it('pelkät lämmittelyt ja yli 12 toiston sarjat eivät tuota datapisteitä', () => {
    const history = [
      session('2026-01-05T10:00:00Z', 100, 20),
      session('2026-01-12T10:00:00Z', 102, 20),
      session('2026-01-19T10:00:00Z', 104, 20),
      session('2026-01-26T10:00:00Z', 106, 20),
    ]
    expect(e1rmTrend(history)).toBeNull()
  })
})
