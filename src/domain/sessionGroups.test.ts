import { describe, expect, it } from 'vitest'
import { groupSetsBySession, groupsWithWorkSets } from './sessionGroups'
import type { SetEntry } from './types'

const set = (over: Partial<SetEntry>): SetEntry => ({
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

describe('sarjojen ryhmittely treenikerroiksi', () => {
  it('tyhjä historia tuottaa tyhjän listan', () => {
    expect(groupSetsBySession([])).toEqual([])
  })

  it('yksi sarja tuottaa yhden ryhmän', () => {
    const groups = groupSetsBySession([set({ id: 'a', completedAt: 10 })])
    expect(groups).toHaveLength(1)
    expect(groups[0]?.sessionId).toBe('sess1')
    expect(groups[0]?.completedAt).toBe(10)
  })

  it('järjestää ryhmät vanhimmasta uusimpaan ja sarjat order-järjestykseen', () => {
    const groups = groupSetsBySession([
      set({ id: 'b2', sessionId: 'uusi', order: 1, completedAt: 2_200 }),
      set({ id: 'a1', sessionId: 'vanha', order: 0, completedAt: 1_000 }),
      set({ id: 'b1', sessionId: 'uusi', order: 0, completedAt: 2_100 }),
      set({ id: 'a2', sessionId: 'vanha', order: 1, completedAt: 1_100 }),
    ])
    expect(groups.map((group) => group.sessionId)).toEqual(['vanha', 'uusi'])
    expect(groups[0]?.sets.map((row) => row.id)).toEqual(['a1', 'a2'])
    expect(groups[1]?.sets.map((row) => row.id)).toEqual(['b1', 'b2'])
  })

  it('ryhmän aikaleima on viimeisen sarjan aikaleima', () => {
    const groups = groupSetsBySession([
      set({ id: 'a', order: 0, completedAt: 1_000 }),
      set({ id: 'b', order: 1, completedAt: 1_500 }),
    ])
    expect(groups[0]?.completedAt).toBe(1_500)
  })

  it('säilyttää lämmittelysarjat ryhmässä', () => {
    const groups = groupSetsBySession([set({ id: 'a', warmup: true })])
    expect(groups[0]?.sets).toHaveLength(1)
  })

  it('pelkkien lämmittelyjen kerta karsiutuu työsarjasuodattimessa', () => {
    const groups = groupSetsBySession([
      set({ id: 'a', sessionId: 'vain-lammittely', warmup: true, completedAt: 10 }),
      set({ id: 'b', sessionId: 'oikea', completedAt: 20 }),
    ])
    expect(groupsWithWorkSets(groups).map((group) => group.sessionId)).toEqual(['oikea'])
  })
})
