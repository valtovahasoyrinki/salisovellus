import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import { SaliDatabase } from '@/db/db'

/**
 * Migraatiotesti (SPEC §8): vanhalla skeemalla kirjoitettu data säilyy, kun
 * sovellus avaa tietokannan nykyisellä skeemalla.
 *
 * Kun skeemaan lisätään versio n, tähän lisätään sitä vastaava "legacy"-
 * kirjoittaja ja tarkistus siitä, että rivit ovat yhä luettavissa.
 */
const DB_NAME = 'salisovellus-migraatiotesti'

const TS = 1_700_000_000_000

/* Version 1 rivit kirjoitusasussaan: vertailu tehdään näihin sellaisinaan. */
const V1_EXERCISE = {
  id: 'e1',
  name: 'Penkkipunnerrus',
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
  createdAt: TS,
}

const V1_PROGRAM = { id: 'p1', name: 'Perusohjelma', active: true, createdAt: TS }

const V1_DAY = {
  id: 'd1',
  programId: 'p1',
  name: 'Push',
  order: 0,
  color: 'day-1',
  icon: 'push',
}

const V1_DAY_EXERCISE = {
  id: 'de1',
  dayId: 'd1',
  exerciseId: 'e1',
  order: 0,
  targetSets: 3,
}

const V1_SESSION = {
  id: 's1',
  dayId: 'd1',
  dayName: 'Push',
  startedAt: TS,
  endedAt: TS + 3_600_000,
  note: '',
  status: 'done',
  dateKey: '2023-11-14',
}

const V1_SESSION_EXERCISE = {
  id: 'se1',
  sessionId: 's1',
  exerciseId: 'e1',
  order: 0,
  note: '',
  skipped: false,
}

const V1_SET = {
  id: 'set1',
  sessionExerciseId: 'se1',
  sessionId: 's1',
  exerciseId: 'e1',
  order: 0,
  weight: 80,
  reps: 8,
  warmup: false,
  completedAt: TS + 1_000_000,
}

async function writeWithSchemaV1(): Promise<void> {
  const legacy = new Dexie(DB_NAME)
  legacy.version(1).stores({
    exercises: 'id, name, archived, equipment, kind, *primaryMuscles, *secondaryMuscles, createdAt',
    programs: 'id, active',
    workoutDays: 'id, programId, [programId+order]',
    dayExercises: 'id, dayId, [dayId+order], exerciseId',
    sessions: 'id, startedAt, status, dayId, dateKey',
    sessionExercises: 'id, sessionId, [sessionId+order], exerciseId',
    setEntries:
      'id, sessionExerciseId, sessionId, exerciseId, [exerciseId+completedAt], [sessionExerciseId+order], completedAt',
    images: 'id',
    settings: 'id',
    meta: 'key',
  })
  await legacy.open()
  await legacy.table('exercises').add(V1_EXERCISE)
  await legacy.table('programs').add(V1_PROGRAM)
  await legacy.table('workoutDays').add(V1_DAY)
  await legacy.table('dayExercises').add(V1_DAY_EXERCISE)
  await legacy.table('sessions').add(V1_SESSION)
  await legacy.table('sessionExercises').add(V1_SESSION_EXERCISE)
  await legacy.table('setEntries').add(V1_SET)
  legacy.close()
}

afterEach(async () => {
  await Dexie.delete(DB_NAME)
})

describe('skeeman päivitys', () => {
  it('säilyttää version 1 datan version 2 skeemalla', async () => {
    await writeWithSchemaV1()

    const current = new SaliDatabase(DB_NAME)
    await current.open()
    try {
      expect(current.verno).toBe(2)

      // Rivit ovat identtisiä: version 2 upgrade ei kirjoita mitään.
      expect(await current.exercises.get('e1')).toEqual(V1_EXERCISE)
      expect(await current.programs.get('p1')).toEqual(V1_PROGRAM)
      expect(await current.workoutDays.get('d1')).toEqual(V1_DAY)
      expect(await current.dayExercises.get('de1')).toEqual(V1_DAY_EXERCISE)
      expect(await current.sessions.get('s1')).toEqual(V1_SESSION)
      expect(await current.sessionExercises.get('se1')).toEqual(V1_SESSION_EXERCISE)
      expect(await current.setEntries.get('set1')).toEqual(V1_SET)

      // Puuttuva aliases tarkoittaa "ei aliaksia" – kenttää ei lisätä riviin.
      const exercise = await current.exercises.get('e1')
      expect(exercise?.aliases).toBeUndefined()
      expect(exercise !== undefined && 'aliases' in exercise).toBe(false)

      // Indeksit toimivat yhä nykyisellä skeemalla.
      const sets = await current.setEntries
        .where('[exerciseId+completedAt]')
        .between(['e1', -Infinity], ['e1', Infinity])
        .toArray()
      expect(sets).toHaveLength(1)
      expect(sets[0]).toMatchObject({ weight: 80, reps: 8 })

      const days = await current.workoutDays
        .where('[programId+order]')
        .between(['p1', -Infinity], ['p1', Infinity])
        .toArray()
      expect(days).toHaveLength(1)
    } finally {
      current.close()
    }
  })
})
