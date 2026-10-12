import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db/db'
import { getLibraryVersion } from '@/db/repositories/metaRepo'
import { normalizeTerm } from '@/domain/exerciseSearch'
import { MUSCLE_LABELS } from '@/domain/muscles'
import type { Exercise, MuscleId } from '@/domain/types'
import { EXERCISE_LIBRARY, LIBRARY_VERSION } from './exercises'
import { syncExerciseLibrary } from './seedLibrary'

const MUSCLE_IDS = Object.keys(MUSCLE_LABELS) as MuscleId[]

/** Tällä kierroksella lisättyjen liikkeiden määrä (KORJAUS_1_PROMPT §3.2). */
const V2_COUNT = 47

const byName = (name: string): (typeof EXERCISE_LIBRARY)[number] | undefined =>
  EXERCISE_LIBRARY.find((exercise) => exercise.name === name)

const kindOf = (name: string): string | undefined => byName(name)?.kind
const restOf = (name: string): number | undefined => byName(name)?.defaultRestSec

const aliasesOf = (name: string): string[] => byName(name)?.aliases ?? []

describe('liikekirjaston sisältö', () => {
  it('sisältää 120–130 liikettä', () => {
    expect(EXERCISE_LIBRARY.length).toBeGreaterThanOrEqual(120)
    expect(EXERCISE_LIBRARY.length).toBeLessThanOrEqual(130)
  })

  it('nimet ovat uniikkeja', () => {
    const names = EXERCISE_LIBRARY.map((exercise) => exercise.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it('normalisoidut nimet ovat uniikkeja', () => {
    const normalized = EXERCISE_LIBRARY.map((exercise) => normalizeTerm(exercise.name))
    const seen = new Set<string>()
    for (const name of normalized) {
      expect(seen.has(name), name).toBe(false)
      seen.add(name)
    }
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
      expect(exercise.notes, exercise.name).toBe('')
    }
  })

  it('kehonpaino- ja kestoliikkeet on merkitty oikealla tyypillä', () => {
    expect(kindOf('Leuanveto')).toBe('bodyweight')
    expect(kindOf('Avustettu leuanveto')).toBe('bodyweight')
    expect(kindOf('Dipit')).toBe('bodyweight')
    expect(kindOf('Lankku')).toBe('time')
    expect(kindOf('Penkkipunnerrus')).toBe('weight_reps')
    expect(kindOf('Pakarasilta')).toBe('bodyweight')
    expect(kindOf('Nordic-takareisi')).toBe('bodyweight')
  })

  it('moninivelliikkeillä on pidempi lepo kuin eristävillä', () => {
    expect(restOf('Takakyykky')).toBe(180)
    expect(restOf('Hauiskääntö tangolla')).toBe(90)
  })
})

describe('liikekirjaston aliakset', () => {
  it('jokaisella liikkeellä on vähintään yksi alias', () => {
    for (const exercise of EXERCISE_LIBRARY) {
      expect(exercise.aliases?.length ?? 0, exercise.name).toBeGreaterThan(0)
    }
  })

  it('saman liikkeen aliakset ovat uniikkeja normalisoituina', () => {
    for (const exercise of EXERCISE_LIBRARY) {
      const normalized = (exercise.aliases ?? []).map(normalizeTerm)
      expect(new Set(normalized).size, exercise.name).toBe(normalized.length)
    }
  })

  it('alias ei ole sama kuin oman liikkeen nimi', () => {
    for (const exercise of EXERCISE_LIBRARY) {
      const name = normalizeTerm(exercise.name)
      for (const alias of exercise.aliases ?? []) {
        expect(normalizeTerm(alias), exercise.name).not.toBe(name)
      }
    }
  })

  it('mikään alias ei ole toisen liikkeen nimi', () => {
    const namesByNormalized = new Map(
      EXERCISE_LIBRARY.map((exercise) => [normalizeTerm(exercise.name), exercise.name] as const),
    )
    for (const exercise of EXERCISE_LIBRARY) {
      for (const alias of exercise.aliases ?? []) {
        const collision = namesByNormalized.get(normalizeTerm(alias))
        expect(collision, `${exercise.name}: ${alias}`).toBeUndefined()
      }
    }
  })

  it('alias ei ole tyhjä eikä sisällä reunavälilyöntejä', () => {
    for (const exercise of EXERCISE_LIBRARY) {
      for (const alias of exercise.aliases ?? []) {
        expect(alias.trim(), exercise.name).toBe(alias)
        expect(alias.length, exercise.name).toBeGreaterThan(0)
      }
    }
  })

  it('tunnetut salinimet löytyvät aliaksista', () => {
    expect(aliasesOf('Vipunosto rintaliikelaitteessa')).toContain('pec deck')
    expect(aliasesOf('Ylätalja')).toContain('lat pulldown')
    expect(aliasesOf('Kasvoveto taljassa')).toContain('face pull')
    expect(aliasesOf('Lantionnosto tangolla')).toContain('hip thrust')
    expect(aliasesOf('Romanialainen maastaveto')).toContain('rdl')
    expect(aliasesOf('Jalkaprässi')).toContain('leg press')
  })
})

describe('liikekirjaston versiointi', () => {
  it('since on 1 tai 2', () => {
    for (const exercise of EXERCISE_LIBRARY) {
      expect([1, 2], exercise.name).toContain(exercise.since)
    }
  })

  it(`versio 2 tuo ${V2_COUNT} uutta liikettä`, () => {
    const v2 = EXERCISE_LIBRARY.filter((exercise) => exercise.since === 2)
    expect(v2).toHaveLength(V2_COUNT)
    expect(EXERCISE_LIBRARY.filter((exercise) => exercise.since === 1)).toHaveLength(
      EXERCISE_LIBRARY.length - V2_COUNT,
    )
  })

  it('kirjastoversio vastaa suurinta since-arvoa', () => {
    const highest = Math.max(...EXERCISE_LIBRARY.map((exercise) => exercise.since))
    expect(LIBRARY_VERSION).toBe(highest)
  })
})

/* --- Synkronointi ---------------------------------------------------------- */

const OWN_EXERCISE: Exercise = {
  id: 'oma-1',
  name: 'Oma kiertoliike',
  primaryMuscles: ['obliques'],
  secondaryMuscles: [],
  equipment: 'other',
  kind: 'weight_reps',
  increment: 1.25,
  defaultRestSec: 90,
  defaultRepRange: { min: 10, max: 15 },
  notes: 'Oma muistiinpano',
  archived: false,
  isCustom: true,
  createdAt: 1_700_000_000_000,
}

const ARCHIVED_NAME = 'Lankku'
const DELETED_NAME = 'Takakyykky'

/**
 * Kirjoittaa 1.0-asennuksen tilan: v1-liikkeet ilman aliaksia, käyttäjän oma
 * liike, yksi arkistoitu kirjastoliike, yksi poistettu kirjastoliike sekä
 * kirjattu sessio ja sarja. `libraryVersion` jätetään kirjoittamatta.
 */
async function installVersion1(extraOwn: Exercise[] = []): Promise<void> {
  const createdAt = 1_700_000_000_000
  const rows: Exercise[] = []
  let index = 0
  for (const entry of EXERCISE_LIBRARY) {
    if (entry.since !== 1) continue
    if (entry.name === DELETED_NAME) continue
    const { since: _since, aliases: _aliases, ...rest } = entry
    rows.push({
      ...rest,
      id: `v1-${index}`,
      archived: entry.name === ARCHIVED_NAME,
      isCustom: false,
      createdAt,
    })
    index += 1
  }
  await db.exercises.bulkAdd([...rows, OWN_EXERCISE, ...extraOwn])
  await db.sessions.add({
    id: 's1',
    dayName: 'Push',
    startedAt: createdAt,
    endedAt: createdAt + 3_600_000,
    note: '',
    status: 'done',
    dateKey: '2023-11-14',
  })
  await db.sessionExercises.add({
    id: 'se1',
    sessionId: 's1',
    exerciseId: 'v1-0',
    order: 0,
    note: '',
    skipped: false,
  })
  await db.setEntries.add({
    id: 'set1',
    sessionExerciseId: 'se1',
    sessionId: 's1',
    exerciseId: 'v1-0',
    order: 0,
    weight: 82.5,
    reps: 8,
    warmup: false,
    completedAt: createdAt + 600_000,
  })
  await db.meta.delete('libraryVersion')
}

const V1_LIBRARY_COUNT = EXERCISE_LIBRARY.filter(
  (entry) => entry.since === 1 && entry.name !== DELETED_NAME,
).length

describe('liikekirjaston synkronointi', () => {
  beforeEach(async () => {
    await db.open()
    await Promise.all(db.tables.map((table) => table.clear()))
  })

  it('lisää koko kirjaston tyhjään tietokantaan', async () => {
    const result = await syncExerciseLibrary()
    expect(result).toEqual({ added: EXERCISE_LIBRARY.length, aliasesFilled: 0 })
    expect(await db.exercises.count()).toBe(EXERCISE_LIBRARY.length)

    const rows = await db.exercises.toArray()
    expect(rows.every((row) => row.isCustom === false)).toBe(true)
    expect(rows.every((row) => row.archived === false)).toBe(true)
    expect(rows.every((row) => (row.aliases?.length ?? 0) > 0)).toBe(true)
    expect(new Set(rows.map((row) => row.id)).size).toBe(rows.length)
    expect(await getLibraryVersion()).toBe(LIBRARY_VERSION)
  })

  it('ei kirjoita since-kenttää tietokantariviin', async () => {
    await syncExerciseLibrary()
    const rows = await db.exercises.toArray()
    expect(rows.some((row) => 'since' in row)).toBe(false)
  })

  it('on idempotentti: toinen kutsu ei muuta mitään', async () => {
    await syncExerciseLibrary()
    const before = await db.exercises.toArray()
    const again = await syncExerciseLibrary()
    expect(again).toEqual({ added: 0, aliasesFilled: 0 })
    expect(await db.exercises.toArray()).toEqual(before)
  })

  it('ei palauta käyttäjän poistamia liikkeitä', async () => {
    await syncExerciseLibrary()
    const first = await db.exercises.toCollection().first()
    if (first) await db.exercises.delete(first.id)
    expect(await syncExerciseLibrary()).toEqual({ added: 0, aliasesFilled: 0 })
    expect(await db.exercises.count()).toBe(EXERCISE_LIBRARY.length - 1)
  })

  describe('version 1 asennus', () => {
    it('lisää vain v2-liikkeet ja täyttää aliakset', async () => {
      await installVersion1()
      const result = await syncExerciseLibrary()

      expect(result).toEqual({ added: V2_COUNT, aliasesFilled: V1_LIBRARY_COUNT })
      expect(await db.exercises.count()).toBe(V1_LIBRARY_COUNT + 1 + V2_COUNT)
      expect(await getLibraryVersion()).toBe(LIBRARY_VERSION)

      const added = await db.exercises.where('name').equals('Sumomaastaveto').first()
      expect(added?.isCustom).toBe(false)
      expect(added?.aliases).toEqual(['sumo deadlift'])

      const bench = await db.exercises.where('name').equals('Penkkipunnerrus').first()
      expect(bench?.aliases).toEqual(['bench', 'bench press', 'penkki'])
    })

    it('ei koske käyttäjän omaan liikkeeseen', async () => {
      await installVersion1()
      await syncExerciseLibrary()
      expect(await db.exercises.get(OWN_EXERCISE.id)).toEqual(OWN_EXERCISE)
    })

    it('ei aktivoi arkistoitua liikettä', async () => {
      await installVersion1()
      await syncExerciseLibrary()
      const archived = await db.exercises.where('name').equals(ARCHIVED_NAME).toArray()
      expect(archived).toHaveLength(1)
      expect(archived[0]?.archived).toBe(true)
      expect(archived[0]?.aliases).toEqual(['plank'])
    })

    it('ei palauta poistettua v1-liikettä', async () => {
      await installVersion1()
      await syncExerciseLibrary()
      expect(await db.exercises.where('name').equals(DELETED_NAME).count()).toBe(0)
    })

    it('ei muuta kirjattua historiaa', async () => {
      await installVersion1()
      const sessions = await db.sessions.toArray()
      const sets = await db.setEntries.toArray()
      await syncExerciseLibrary()
      expect(await db.sessions.toArray()).toEqual(sessions)
      expect(await db.setEntries.toArray()).toEqual(sets)
    })

    it('toinen ajo päivityksen jälkeen ei muuta mitään', async () => {
      await installVersion1()
      await syncExerciseLibrary()
      const before = await db.exercises.toArray()
      expect(await syncExerciseLibrary()).toEqual({ added: 0, aliasesFilled: 0 })
      expect(await db.exercises.toArray()).toEqual(before)
    })

    it('nimitörmäys: oma liike v2-nimellä estää vain sen liikkeen lisäyksen', async () => {
      const own: Exercise = { ...OWN_EXERCISE, id: 'oma-2', name: 'Sumomaastaveto' }
      await installVersion1([own])
      const result = await syncExerciseLibrary()

      expect(result.added).toBe(V2_COUNT - 1)
      const sumo = await db.exercises.where('name').equals('Sumomaastaveto').toArray()
      expect(sumo).toHaveLength(1)
      expect(sumo[0]).toEqual(own)
    })

    it('nimitörmäys: oma "Pec dec" ei estä muiden liikkeiden lisäystä', async () => {
      const own: Exercise = { ...OWN_EXERCISE, id: 'oma-3', name: 'Pec dec' }
      await installVersion1([own])
      const result = await syncExerciseLibrary()

      expect(result.added).toBe(V2_COUNT)
      expect(await db.exercises.get('oma-3')).toEqual(own)
      expect(await db.exercises.where('name').equals('Vipunosto rintaliikelaitteessa').count()).toBe(
        1,
      )
    })

    it('ei ylikirjoita aliaksia, jotka käyttäjä on jo asettanut', async () => {
      await installVersion1()
      const bench = await db.exercises.where('name').equals('Penkkipunnerrus').first()
      await db.exercises.update(bench!.id, { aliases: ['oma hakusana'] })
      const result = await syncExerciseLibrary()

      expect(result.aliasesFilled).toBe(V1_LIBRARY_COUNT - 1)
      expect((await db.exercises.get(bench!.id))?.aliases).toEqual(['oma hakusana'])
    })
  })
})
