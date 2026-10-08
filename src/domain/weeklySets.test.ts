import { describe, expect, it } from 'vitest'
import type { Exercise, Session, SetEntry } from './types'
import {
  previousWeekKey,
  targetStreak,
  volumeByMovementGroup,
  weeklySetsByMuscle,
  weeklyWorkoutCounts,
  weekKeyStart,
} from './weeklySets'
import { weekKeyOf } from '@/lib/date'

const exercise = (over: Partial<Exercise> & Pick<Exercise, 'id'>): Exercise => ({
  name: 'Liike',
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
  ...over,
})

let counter = 0

const set = (over: Partial<SetEntry>): SetEntry => {
  counter += 1
  return {
    id: `s${counter}`,
    sessionExerciseId: 'se1',
    sessionId: 'sess1',
    exerciseId: 'penkki',
    order: 0,
    weight: 80,
    reps: 8,
    warmup: false,
    completedAt: Date.parse('2026-10-07T10:00:00Z'),
    ...over,
  }
}

const session = (id: string, iso: string, status: Session['status'] = 'done'): Session => ({
  id,
  dayName: 'Push',
  startedAt: Date.parse(iso),
  note: '',
  status,
  dateKey: '2026-10-07',
})

const exercises = new Map<string, Exercise>([
  ['penkki', exercise({ id: 'penkki' })],
  [
    'kyykky',
    exercise({
      id: 'kyykky',
      name: 'Takakyykky',
      primaryMuscles: ['quads', 'glutes'],
      secondaryMuscles: ['hamstrings'],
    }),
  ],
  [
    'ylatalja',
    exercise({ id: 'ylatalja', name: 'Ylätalja', primaryMuscles: ['lats'], secondaryMuscles: ['biceps'] }),
  ],
])

describe('viikkosarjat lihasryhmittäin', () => {
  it('tyhjä historia tuottaa tyhjän kartan', () => {
    expect(weeklySetsByMuscle([], exercises).size).toBe(0)
  })

  it('ensisijainen lihas saa yhden sarjan ja toissijainen puoli', () => {
    const weeks = weeklySetsByMuscle([set({})], exercises)
    const week = weeks.get('2026-W41')
    expect(week?.get('chest')).toBe(1)
    expect(week?.get('triceps')).toBe(0.5)
  })

  it('laskee vain työsarjat', () => {
    const weeks = weeklySetsByMuscle([set({ warmup: true }), set({})], exercises)
    expect(weeks.get('2026-W41')?.get('chest')).toBe(1)
  })

  it('ohittaa sarjat, joiden liikettä ei löydy', () => {
    expect(weeklySetsByMuscle([set({ exerciseId: 'poistettu' })], exercises).size).toBe(0)
  })

  it('viikonvaihde jakaa sarjat eri viikoille Helsingin aikaa', () => {
    // Su 11.10.2026 klo 23.00 Helsinkiä on vk 41, ma 12.10. klo 00.30 on vk 42.
    const sunday = set({ completedAt: Date.parse('2026-10-11T20:00:00Z') })
    const monday = set({ completedAt: Date.parse('2026-10-11T21:30:00Z') })
    const weeks = weeklySetsByMuscle([sunday, monday], exercises)
    expect([...weeks.keys()]).toEqual(['2026-W41', '2026-W42'])
  })

  it('palauttaa viikot aikajärjestyksessä', () => {
    const weeks = weeklySetsByMuscle(
      [
        set({ completedAt: Date.parse('2026-10-14T10:00:00Z') }),
        set({ completedAt: Date.parse('2026-10-07T10:00:00Z') }),
      ],
      exercises,
    )
    expect([...weeks.keys()]).toEqual(['2026-W41', '2026-W42'])
  })
})

describe('volyymin jakauma liikeryhmiin', () => {
  it('tyhjä historia tuottaa nollat', () => {
    expect(volumeByMovementGroup([], exercises)).toEqual({ push: 0, pull: 0, legs: 0, core: 0 })
  })

  it('kohdistaa volyymin ensisijaisten lihasten liikeryhmälle', () => {
    const totals = volumeByMovementGroup(
      [
        set({ exerciseId: 'penkki', weight: 80, reps: 10 }),
        set({ exerciseId: 'ylatalja', weight: 60, reps: 10 }),
        set({ exerciseId: 'kyykky', weight: 100, reps: 5 }),
      ],
      exercises,
    )
    expect(totals.push).toBe(800)
    expect(totals.pull).toBe(600)
    expect(totals.legs).toBe(500)
    expect(totals.core).toBe(0)
  })

  it('avustetun liikkeen negatiivinen lisäpaino ei tuota negatiivista volyymia', () => {
    const totals = volumeByMovementGroup(
      [set({ exerciseId: 'ylatalja', weight: -20, reps: 8 })],
      exercises,
    )
    expect(totals.pull).toBe(0)
  })
})

describe('viikkotavoite ja putki', () => {
  const counts = weeklyWorkoutCounts([
    session('a', '2026-09-21T10:00:00Z'),
    session('b', '2026-09-22T10:00:00Z'),
    session('c', '2026-09-23T10:00:00Z'),
    session('d', '2026-09-24T10:00:00Z'),
    session('e', '2026-09-28T10:00:00Z'),
    session('f', '2026-09-29T10:00:00Z'),
    session('g', '2026-09-30T10:00:00Z'),
    session('h', '2026-10-01T10:00:00Z'),
    session('i', '2026-10-05T10:00:00Z'),
    session('j', '2026-10-06T10:00:00Z'),
  ])

  it('laskee vain päätetyt treenit', () => {
    const mixed = weeklyWorkoutCounts([
      session('a', '2026-10-05T10:00:00Z'),
      session('b', '2026-10-06T10:00:00Z', 'active'),
    ])
    expect(mixed.get('2026-W41')).toBe(1)
  })

  it('laskee peräkkäiset viikot tavoitteessa', () => {
    // Vk 39 ja 40 neljä treeniä, vk 41 vasta kaksi (kesken).
    expect(counts.get('2026-W39')).toBe(4)
    expect(counts.get('2026-W40')).toBe(4)
    expect(counts.get('2026-W41')).toBe(2)
    expect(targetStreak(counts, 4, '2026-W41')).toBe(2)
  })

  it('kesken oleva nykyinen viikko ei katkaise putkea', () => {
    expect(targetStreak(counts, 4, '2026-W41')).toBe(2)
  })

  it('täysi nykyinen viikko lasketaan mukaan', () => {
    expect(targetStreak(counts, 2, '2026-W41')).toBe(3)
  })

  it('tyhjä viikko katkaisee putken', () => {
    expect(targetStreak(counts, 4, '2026-W43')).toBe(0)
  })

  it('tyhjä historia tuottaa nollan', () => {
    expect(targetStreak(new Map(), 4, '2026-W41')).toBe(0)
  })

  it('nollatavoite ei tuota putkea', () => {
    expect(targetStreak(counts, 0, '2026-W41')).toBe(0)
  })
})

describe('viikkoavaimen aikarajat', () => {
  it('viikko alkaa maanantaista', () => {
    expect(weekKeyOf(weekKeyStart('2026-W41'))).toBe('2026-W41')
    expect(weekKeyStart('2026-W41')).toBe(Date.parse('2026-10-04T21:00:00Z'))
  })

  it('edellinen viikko löytyy myös kesäaikasiirtymän yli', () => {
    // Kesäaika alkaa su 29.3.2026 (vk 13), vk 14 alkaa ma 30.3.
    expect(previousWeekKey('2026-W14')).toBe('2026-W13')
    expect(previousWeekKey('2026-W44')).toBe('2026-W43')
  })

  it('vuodenvaihde toimii', () => {
    expect(previousWeekKey('2027-W01')).toBe('2026-W53')
  })
})
