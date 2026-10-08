import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db/db'
import { MUSCLE_LABELS } from '@/domain/muscles'
import type { MuscleId } from '@/domain/types'
import { EXERCISE_LIBRARY } from './exercises'
import { seedExerciseLibrary } from './seedLibrary'

const MUSCLE_IDS = Object.keys(MUSCLE_LABELS) as MuscleId[]

const byName = (name: string): (typeof EXERCISE_LIBRARY)[number] | undefined =>
  EXERCISE_LIBRARY.find((exercise) => exercise.name === name)

const kindOf = (name: string): string | undefined => byName(name)?.kind
const restOf = (name: string): number | undefined => byName(name)?.defaultRestSec

describe('liikekirjaston sisältö', () => {
  it('sisältää 60–80 liikettä', () => {
    expect(EXERCISE_LIBRARY.length).toBeGreaterThanOrEqual(60)
    expect(EXERCISE_LIBRARY.length).toBeLessThanOrEqual(80)
  })

  it('nimet ovat uniikkeja', () => {
    const names = EXERCISE_LIBRARY.map((exercise) => exercise.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it('jokaisella liikkeellä on vähintään yksi ensisijainen lihasryhmä', () => {
    for (const exercise of EXERCISE_LIBRARY) {
      expect(exercise.primaryMuscles.length, exercise.name).toBeGreaterThan(0)
    }
  })

  it('kaikki lihasryhmätunnukset ovat kelvollisia', () => {
    for (const exercise of EXERCISE_LIBRARY) {
      for (const muscle of [...exercise.primaryMuscles, ...exercise.secondaryMuscles]) {
        expect(MUSCLE_IDS, exercise.name).toContain(muscle)
      }
    }
  })

  it('lihasryhmä ei ole samalla liikkeellä sekä ensi- että toissijainen', () => {
    for (const exercise of EXERCISE_LIBRARY) {
      const primary = new Set<MuscleId>(exercise.primaryMuscles)
      for (const muscle of exercise.secondaryMuscles) {
        expect(primary.has(muscle), `${exercise.name}: ${muscle}`).toBe(false)
      }
    }
  })

  it('jokainen lihasryhmä esiintyy jossain liikkeessä ensisijaisena', () => {
    const covered = new Set<MuscleId>(EXERCISE_LIBRARY.flatMap((row) => row.primaryMuscles))
    for (const muscle of MUSCLE_IDS) {
      expect(covered.has(muscle), MUSCLE_LABELS[muscle]).toBe(true)
    }
  })

  it('painonlisäys on positiivinen ja toistoalue järkevä', () => {
    for (const exercise of EXERCISE_LIBRARY) {
      expect(exercise.increment, exercise.name).toBeGreaterThan(0)
      expect(exercise.defaultRepRange.min, exercise.name).toBeGreaterThan(0)
      expect(exercise.defaultRepRange.min, exercise.name).toBeLessThanOrEqual(
        exercise.defaultRepRange.max,
      )
      expect(exercise.defaultRestSec, exercise.name).toBeGreaterThan(0)
      expect(exercise.notes).toBe('')
    }
  })

  it('kehonpaino- ja kestoliikkeet on merkitty oikealla tyypillä', () => {
    expect(kindOf('Leuanveto')).toBe('bodyweight')
    expect(kindOf('Avustettu leuanveto')).toBe('bodyweight')
    expect(kindOf('Dipit')).toBe('bodyweight')
    expect(kindOf('Lankku')).toBe('time')
    expect(kindOf('Penkkipunnerrus')).toBe('weight_reps')
  })

  it('moninivelliikkeillä on pidempi lepo kuin eristävillä', () => {
    expect(restOf('Takakyykky')).toBe(180)
    expect(restOf('Hauiskääntö tangolla')).toBe(90)
  })
})

describe('liikekirjaston siementäminen', () => {
  beforeEach(async () => {
    await db.open()
    await Promise.all(db.tables.map((table) => table.clear()))
  })

  it('lisää kirjaston tyhjään tietokantaan', async () => {
    const added = await seedExerciseLibrary()
    expect(added).toBe(EXERCISE_LIBRARY.length)
    expect(await db.exercises.count()).toBe(EXERCISE_LIBRARY.length)

    const rows = await db.exercises.toArray()
    expect(rows.every((row) => row.isCustom === false)).toBe(true)
    expect(rows.every((row) => row.archived === false)).toBe(true)
    expect(new Set(rows.map((row) => row.id)).size).toBe(rows.length)
  })

  it('on idempotentti: toinen kutsu ei lisää duplikaatteja', async () => {
    await seedExerciseLibrary()
    const again = await seedExerciseLibrary()
    expect(again).toBe(0)
    expect(await db.exercises.count()).toBe(EXERCISE_LIBRARY.length)
  })

  it('ei palauta käyttäjän poistamia liikkeitä', async () => {
    await seedExerciseLibrary()
    const first = await db.exercises.toCollection().first()
    if (first) await db.exercises.delete(first.id)
    expect(await seedExerciseLibrary()).toBe(0)
    expect(await db.exercises.count()).toBe(EXERCISE_LIBRARY.length - 1)
  })
})
