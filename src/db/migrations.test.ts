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
  await legacy.table('exercises').add({
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
    createdAt: 1_700_000_000_000,
  })
  await legacy.table('sessions').add({
    id: 's1',
    dayName: 'Push',
    startedAt: 1_700_000_000_000,
    endedAt: 1_700_003_600_000,
    note: '',
    status: 'done',
    dateKey: '2023-11-14',
  })
  await legacy.table('sessionExercises').add({
    id: 'se1',
    sessionId: 's1',
    exerciseId: 'e1',
    order: 0,
    note: '',
    skipped: false,
  })
  await legacy.table('setEntries').add({
    id: 'set1',
    sessionExerciseId: 'se1',
    sessionId: 's1',
    exerciseId: 'e1',
    order: 0,
    weight: 80,
    reps: 8,
    warmup: false,
    completedAt: 1_700_001_000_000,
  })
  legacy.close()
}

afterEach(async () => {
  await Dexie.delete(DB_NAME)
})

describe('skeeman päivitys', () => {
  it('säilyttää version 1 datan nykyisellä skeemalla', async () => {
    await writeWithSchemaV1()

    const current = new SaliDatabase(DB_NAME)
    await current.open()
    try {
      expect(await current.exercises.count()).toBe(1)
      expect((await current.sessions.get('s1'))?.dayName).toBe('Push')
      const sets = await current.setEntries
        .where('[exerciseId+completedAt]')
        .between(['e1', -Infinity], ['e1', Infinity])
        .toArray()
      expect(sets).toHaveLength(1)
      expect(sets[0]).toMatchObject({ weight: 80, reps: 8 })
    } finally {
      current.close()
    }
  })
})
