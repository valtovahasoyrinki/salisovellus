import { describe, expect, it } from 'vitest'
import { bestE1rm, e1rm } from './e1rm'
import type { SetEntry } from './types'

const set = (over: Partial<SetEntry> = {}): SetEntry => ({
  id: 's1',
  sessionExerciseId: 'se1',
  sessionId: 'sess1',
  exerciseId: 'ex1',
  order: 0,
  weight: 100,
  reps: 5,
  warmup: false,
  completedAt: 0,
  ...over,
})

describe('e1RM Epleyn kaavalla', () => {
  it('laskee paino × (1 + toistot / 30)', () => {
    expect(e1rm(100, 5)).toBe(116.67)
    expect(e1rm(82.5, 8)).toBe(104.5)
  })

  it('yhden toiston sarjassa e1RM on paino sellaisenaan', () => {
    expect(e1rm(120, 1)).toBe(120)
  })

  it('yli 12 toiston sarjaa ei käytetä e1RM:ään', () => {
    expect(e1rm(60, 12)).not.toBeNull()
    expect(e1rm(60, 13)).toBeNull()
    expect(e1rm(60, 20)).toBeNull()
  })

  it('nolla tai negatiivinen toistomäärä ei tuota arviota', () => {
    expect(e1rm(60, 0)).toBeNull()
    expect(e1rm(60, -3)).toBeNull()
  })

  it('kehonpainoliikkeen negatiivinen lisäpaino ei tuota arviota', () => {
    // Avustettu leuanveto: −20 kg avustusta. Kehonpainoa ei seurata, joten
    // ulkoisesta kuormasta ei saa vertailukelpoista maksimia.
    expect(e1rm(-20, 8)).toBeNull()
    expect(e1rm(0, 8)).toBeNull()
  })

  it('kelvoton luku ei tuota arviota', () => {
    expect(e1rm(Number.NaN, 5)).toBeNull()
    expect(e1rm(100, Number.NaN)).toBeNull()
  })
})

describe('paras e1RM sarjajoukosta', () => {
  it('tyhjä historia palauttaa null', () => {
    expect(bestE1rm([])).toBeNull()
  })

  it('pelkät lämmittelysarjat eivät tuota e1RM:ää', () => {
    expect(bestE1rm([set({ warmup: true }), set({ id: 's2', warmup: true, weight: 120 })])).toBeNull()
  })

  it('yksi sarja riittää', () => {
    const only = set({ weight: 100, reps: 1 })
    expect(bestE1rm([only])).toEqual({ value: 100, set: only })
  })

  it('valitsee parhaan työsarjan ja ohittaa yli 12 toiston sarjat', () => {
    const heavy = set({ id: 'a', weight: 100, reps: 5 })
    const long = set({ id: 'b', weight: 95, reps: 20 })
    const best = set({ id: 'c', weight: 105, reps: 5 })
    const result = bestE1rm([heavy, long, best])
    expect(result?.set.id).toBe('c')
    expect(result?.value).toBe(122.5)
  })

  it('tasatilanteessa voittaa aikaisempi sarja', () => {
    const first = set({ id: 'a', weight: 100, reps: 5 })
    const second = set({ id: 'b', weight: 100, reps: 5 })
    expect(bestE1rm([first, second])?.set.id).toBe('a')
  })
})
