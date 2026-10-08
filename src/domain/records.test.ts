import { describe, expect, it } from 'vitest'
import { computeRecords, detectNewRecords, recordLabel } from './records'
import type { SetEntry } from './types'

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

describe('ennätysten laskenta', () => {
  it('tyhjä historia ei tuota ennätyksiä', () => {
    const records = computeRecords([])
    expect(records.best.heaviest).toBeNull()
    expect(records.best.best_e1rm).toBeNull()
    expect(records.best.most_reps_at_weight).toBeNull()
    expect(records.best.best_set_volume).toBeNull()
    expect(records.mostRepsAtWeight.size).toBe(0)
  })

  it('pelkät lämmittelysarjat eivät tuota ennätyksiä', () => {
    const records = computeRecords([set({ warmup: true, weight: 200, reps: 10 })])
    expect(records.best.heaviest).toBeNull()
    expect(records.mostRepsAtWeight.size).toBe(0)
  })

  it('kerää kaikki neljä ennätystyyppiä', () => {
    const records = computeRecords([
      set({ id: 'a', weight: 100, reps: 3 }),
      set({ id: 'b', weight: 80, reps: 10 }),
      set({ id: 'c', weight: 80, reps: 8 }),
    ])
    expect(records.best.heaviest?.value).toBe(100)
    expect(records.best.heaviest?.set.id).toBe('a')
    // 100 × 3 → e1RM 110, 80 × 10 → e1RM 106,67: raskaampi sarja voittaa.
    expect(records.best.best_e1rm?.set.id).toBe('a')
    expect(records.best.best_e1rm?.value).toBe(110)
    expect(records.best.most_reps_at_weight?.value).toBe(10)
    expect(records.best.best_set_volume?.set.id).toBe('b')
    expect(records.best.best_set_volume?.value).toBe(800)
  })

  it('eniten toistoja painoa kohti pitää parhaan sarjan per paino', () => {
    const records = computeRecords([
      set({ id: 'a', weight: 80, reps: 8 }),
      set({ id: 'b', weight: 80, reps: 10 }),
      set({ id: 'c', weight: 90, reps: 5 }),
    ])
    expect(records.mostRepsAtWeight.get(80)?.id).toBe('b')
    expect(records.mostRepsAtWeight.get(90)?.id).toBe('c')
  })
})

describe('uusien ennätysten tunnistus kuittauksessa', () => {
  it('lämmittelysarja ei koskaan tuota ennätystä', () => {
    expect(detectNewRecords(set({ warmup: true, weight: 300 }), [])).toEqual([])
  })

  it('nollan toiston sarja ei tuota ennätystä', () => {
    expect(detectNewRecords(set({ reps: 0 }), [])).toEqual([])
  })

  it('ensimmäinen koskaan kirjattu työsarja on ennätys', () => {
    expect(detectNewRecords(set({ weight: 80, reps: 8 }), [])).toEqual([
      'heaviest',
      'best_e1rm',
      'best_set_volume',
    ])
  })

  it('saman tuloksen toistaminen ei ole uusi ennätys', () => {
    const previous = [set({ id: 'a', weight: 80, reps: 8 })]
    expect(detectNewRecords(set({ id: 'b', weight: 80, reps: 8 }), previous)).toEqual([])
  })

  it('raskaampi paino tuottaa paino- ja e1RM-ennätyksen', () => {
    const previous = [set({ id: 'a', weight: 80, reps: 8 })]
    expect(detectNewRecords(set({ id: 'b', weight: 85, reps: 8 }), previous)).toEqual([
      'heaviest',
      'best_e1rm',
      'best_set_volume',
    ])
  })

  it('useampi toisto samalla painolla tuottaa toistoennätyksen', () => {
    const previous = [set({ id: 'a', weight: 80, reps: 8 })]
    expect(detectNewRecords(set({ id: 'b', weight: 80, reps: 9 }), previous)).toEqual([
      'best_e1rm',
      'most_reps_at_weight',
      'best_set_volume',
    ])
  })

  it('uusi paino ilman aiempaa vertailua ei ole toistoennätys', () => {
    const previous = [set({ id: 'a', weight: 80, reps: 10 })]
    const kinds = detectNewRecords(set({ id: 'b', weight: 70, reps: 12 }), previous)
    expect(kinds).not.toContain('most_reps_at_weight')
  })

  it('yli 12 toiston sarja ei tuota e1RM-ennätystä mutta voi tuottaa volyymiennätyksen', () => {
    const previous = [set({ id: 'a', weight: 80, reps: 8 })]
    const kinds = detectNewRecords(set({ id: 'b', weight: 60, reps: 20 }), previous)
    expect(kinds).toEqual(['best_set_volume'])
  })

  it('avustettu liike: negatiivinen lisäpaino tuottaa vain painoennätyksen', () => {
    const previous = [set({ id: 'a', weight: -20, reps: 8 })]
    expect(detectNewRecords(set({ id: 'b', weight: -10, reps: 8 }), previous)).toEqual(['heaviest'])
  })

  it('lämmittelyt eivät ole vertailukohtana', () => {
    const previous = [set({ id: 'a', warmup: true, weight: 200, reps: 10 })]
    expect(detectNewRecords(set({ id: 'b', weight: 80, reps: 8 }), previous)).toContain('heaviest')
  })
})

describe('ennätysten nimet', () => {
  it('ovat suomeksi ja lyhyitä', () => {
    expect(recordLabel('heaviest')).toBe('Raskain paino')
    expect(recordLabel('best_e1rm')).toBe('Paras e1RM')
    expect(recordLabel('most_reps_at_weight')).toBe('Eniten toistoja painolla')
    expect(recordLabel('best_set_volume')).toBe('Suurin kertavolyymi')
  })
})
