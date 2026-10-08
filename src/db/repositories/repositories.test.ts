import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db/db'
import {
  createExercise,
  deleteExercisePermanently,
  getExerciseUsage,
  mergeExercises,
} from './exerciseRepo'
import {
  addExerciseToDay,
  deleteDay,
  ensureProgram,
  listDayExercises,
  listDays,
  removeDayExercise,
} from './programRepo'
import {
  deleteSession,
  finishSession,
  getPreviousSetsForExercise,
  getSessionDetail,
  listSetsForExercise,
  logSet,
  startSessionFromDay,
} from './sessionRepo'
import type { NewExercise } from './exerciseRepo'

const exerciseInput = (name: string): NewExercise => ({
  name,
  primaryMuscles: ['chest'],
  secondaryMuscles: ['triceps'],
  equipment: 'barbell',
  kind: 'weight_reps',
  increment: 2.5,
  defaultRestSec: 180,
  defaultRepRange: { min: 6, max: 10 },
  notes: '',
})

beforeEach(async () => {
  await db.open()
  await Promise.all(db.tables.map((table) => table.clear()))
})

describe('ohjelman perustaminen', () => {
  it('luo kolme treenipäivää ja on idempotentti', async () => {
    const program = await ensureProgram()
    const again = await ensureProgram()
    expect(again.id).toBe(program.id)

    const days = await listDays(program.id)
    expect(days.map((day) => day.name)).toEqual(['Push', 'Pull', 'Legs'])
    expect(days.map((day) => day.order)).toEqual([0, 1, 2])
  })
})

describe('treenin kirjaus', () => {
  it('kopioi päivän liikkeet sessioon ja tallentaa sarjat heti', async () => {
    const program = await ensureProgram()
    const [push] = await listDays(program.id)
    const benchId = await createExercise(exerciseInput('Penkkipunnerrus'))
    await addExerciseToDay(push!.id, benchId, { targetSets: 3 })

    const sessionId = await startSessionFromDay(push!.id)
    const detail = await getSessionDetail(sessionId)
    expect(detail?.session.dayName).toBe('Push')
    expect(detail?.exercises).toHaveLength(1)

    const row = detail!.exercises[0]!.row
    await logSet({ sessionExerciseId: row.id, exerciseId: benchId, weight: 80, reps: 8, warmup: false })
    await logSet({ sessionExerciseId: row.id, exerciseId: benchId, weight: 80, reps: 7, warmup: false })

    const sets = await listSetsForExercise(benchId)
    expect(sets).toHaveLength(2)
    // Denormalisoidut kentät on täytetty automaattisesti.
    expect(sets.every((set) => set.sessionId === sessionId)).toBe(true)
    expect(sets.map((set) => set.order)).toEqual([0, 1])
  })

  it('edellisen kerran sarjat luetaan vain päättyneistä treeneistä', async () => {
    const program = await ensureProgram()
    const [push] = await listDays(program.id)
    const benchId = await createExercise(exerciseInput('Penkkipunnerrus'))
    await addExerciseToDay(push!.id, benchId)

    const first = await startSessionFromDay(push!.id)
    const firstRow = (await getSessionDetail(first))!.exercises[0]!.row
    await logSet({ sessionExerciseId: firstRow.id, exerciseId: benchId, weight: 80, reps: 8, warmup: false })
    await finishSession(first)

    const second = await startSessionFromDay(push!.id)
    const previous = await getPreviousSetsForExercise(benchId, second)
    expect(previous?.sessionId).toBe(first)
    expect(previous?.sets.map((set) => set.weight)).toEqual([80])
  })

  it('treenin poisto poistaa myös sen sarjat', async () => {
    const program = await ensureProgram()
    const [push] = await listDays(program.id)
    const benchId = await createExercise(exerciseInput('Penkkipunnerrus'))
    await addExerciseToDay(push!.id, benchId)
    const sessionId = await startSessionFromDay(push!.id)
    const row = (await getSessionDetail(sessionId))!.exercises[0]!.row
    await logSet({ sessionExerciseId: row.id, exerciseId: benchId, weight: 80, reps: 8, warmup: false })

    await deleteSession(sessionId)
    expect(await db.setEntries.count()).toBe(0)
    expect(await db.sessionExercises.count()).toBe(0)
  })
})

describe('historia on pyhä', () => {
  it('liikkeen poisto ohjelmasta ei poista historiaa', async () => {
    const program = await ensureProgram()
    const [push] = await listDays(program.id)
    const benchId = await createExercise(exerciseInput('Penkkipunnerrus'))
    const dayExerciseId = await addExerciseToDay(push!.id, benchId)
    const sessionId = await startSessionFromDay(push!.id)
    const row = (await getSessionDetail(sessionId))!.exercises[0]!.row
    await logSet({ sessionExerciseId: row.id, exerciseId: benchId, weight: 80, reps: 8, warmup: false })
    await finishSession(sessionId)

    await removeDayExercise(dayExerciseId)
    expect(await listDayExercises(push!.id)).toHaveLength(0)
    expect(await listSetsForExercise(benchId)).toHaveLength(1)
    expect((await getSessionDetail(sessionId))?.exercises).toHaveLength(1)
  })

  it('treenipäivän poisto säilyttää menneet treenit ja päivän nimen', async () => {
    const program = await ensureProgram()
    const [push] = await listDays(program.id)
    const sessionId = await startSessionFromDay(push!.id)
    await finishSession(sessionId)

    await deleteDay(push!.id)
    const session = await db.sessions.get(sessionId)
    expect(session?.dayName).toBe('Push')
    expect(session?.dayId).toBeUndefined()
    // Jäljelle jääneiden päivien järjestys tiivistyy.
    expect((await listDays(program.id)).map((day) => day.order)).toEqual([0, 1])
  })

  it('pysyvä poisto kertoo mitä katoaa ja poistaa sitten kaiken', async () => {
    const program = await ensureProgram()
    const [push] = await listDays(program.id)
    const benchId = await createExercise(exerciseInput('Penkkipunnerrus'))
    await addExerciseToDay(push!.id, benchId)
    const sessionId = await startSessionFromDay(push!.id)
    const row = (await getSessionDetail(sessionId))!.exercises[0]!.row
    await logSet({ sessionExerciseId: row.id, exerciseId: benchId, weight: 80, reps: 8, warmup: false })
    await logSet({ sessionExerciseId: row.id, exerciseId: benchId, weight: 80, reps: 6, warmup: false })

    const usage = await getExerciseUsage(benchId)
    expect(usage).toMatchObject({ sessionCount: 1, setCount: 2, programDayCount: 1 })

    await deleteExercisePermanently(benchId)
    expect(await db.setEntries.count()).toBe(0)
    expect(await db.dayExercises.count()).toBe(0)
    expect(await db.exercises.count()).toBe(0)
  })
})

describe('liikkeiden yhdistäminen', () => {
  it('siirtää historian ja poistaa kaksoiskappaleen', async () => {
    const program = await ensureProgram()
    const [push] = await listDays(program.id)
    const keep = await createExercise(exerciseInput('Penkkipunnerrus'))
    const duplicate = await createExercise(exerciseInput('Penkki'))
    await addExerciseToDay(push!.id, duplicate)

    const sessionId = await startSessionFromDay(push!.id)
    const row = (await getSessionDetail(sessionId))!.exercises[0]!.row
    await logSet({ sessionExerciseId: row.id, exerciseId: duplicate, weight: 75, reps: 9, warmup: false })

    await mergeExercises(duplicate, keep)
    expect(await db.exercises.get(duplicate)).toBeUndefined()
    expect(await listSetsForExercise(keep)).toHaveLength(1)
    expect((await listDayExercises(push!.id))[0]?.exerciseId).toBe(keep)
  })
})
