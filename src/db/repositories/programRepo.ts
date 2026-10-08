import { db } from '@/db/db'
import type { DayExercise, DayIcon, Exercise, Program, RepRange, WorkoutDay } from '@/domain/types'
import { newId } from '@/lib/id'

export const DAY_COLORS = ['day-1', 'day-2', 'day-3', 'day-4', 'day-5', 'day-6'] as const

/** Ohjelman oletuspäivät käyttöönotossa (SPEC §6.1). Nimet ovat muokattavissa. */
const DEFAULT_DAYS: Array<{ name: string; icon: DayIcon }> = [
  { name: 'Push', icon: 'push' },
  { name: 'Pull', icon: 'pull' },
  { name: 'Legs', icon: 'legs' },
]

export async function getActiveProgram(): Promise<Program | undefined> {
  const active = await db.programs.filter((program) => program.active).first()
  return active ?? (await db.programs.toCollection().first())
}

/** Luo oletusohjelman, jos ohjelmaa ei ole. Palauttaa aktiivisen ohjelman. */
export async function ensureProgram(): Promise<Program> {
  const existing = await getActiveProgram()
  if (existing) return existing

  const program: Program = { id: newId(), name: 'Ohjelma', active: true, createdAt: Date.now() }
  await db.transaction('rw', [db.programs, db.workoutDays], async () => {
    await db.programs.add(program)
    await db.workoutDays.bulkAdd(
      DEFAULT_DAYS.map((day, index) => ({
        id: newId(),
        programId: program.id,
        name: day.name,
        order: index,
        color: DAY_COLORS[index % DAY_COLORS.length] as string,
        icon: day.icon,
      })),
    )
  })
  return program
}

export async function listDays(programId: string): Promise<WorkoutDay[]> {
  return db.workoutDays.where('[programId+order]').between([programId, -Infinity], [programId, Infinity]).toArray()
}

export function getDay(dayId: string): Promise<WorkoutDay | undefined> {
  return db.workoutDays.get(dayId)
}

export async function createDay(
  programId: string,
  input: { name: string; icon: DayIcon; color?: string },
): Promise<string> {
  const days = await listDays(programId)
  const id = newId()
  await db.workoutDays.add({
    id,
    programId,
    name: input.name,
    order: days.length,
    color: input.color ?? (DAY_COLORS[days.length % DAY_COLORS.length] as string),
    icon: input.icon,
  })
  return id
}

export async function updateDay(
  dayId: string,
  patch: Partial<Omit<WorkoutDay, 'id' | 'programId'>>,
): Promise<void> {
  await db.workoutDays.update(dayId, patch)
}

/**
 * Päivän poisto. Historia on pyhä: menneet sessiot säilyvät, ne vain menettävät
 * viittauksen päivään (nimi on kopioitu sessioon).
 */
export async function deleteDay(dayId: string): Promise<void> {
  await db.transaction('rw', [db.workoutDays, db.dayExercises, db.sessions], async () => {
    const day = await db.workoutDays.get(dayId)
    if (!day) return
    await db.dayExercises.where('dayId').equals(dayId).delete()
    await db.sessions.where('dayId').equals(dayId).modify({ dayId: undefined })
    await db.workoutDays.delete(dayId)

    const remaining = await listDays(day.programId)
    await Promise.all(
      remaining.map((candidate, index) => db.workoutDays.update(candidate.id, { order: index })),
    )
  })
}

export async function reorderDays(orderedIds: string[]): Promise<void> {
  await db.transaction('rw', db.workoutDays, async () => {
    await Promise.all(orderedIds.map((id, index) => db.workoutDays.update(id, { order: index })))
  })
}

export interface DayExerciseWithExercise {
  row: DayExercise
  exercise: Exercise
}

export async function listDayExercises(dayId: string): Promise<DayExercise[]> {
  return db.dayExercises.where('[dayId+order]').between([dayId, -Infinity], [dayId, Infinity]).toArray()
}

/** Päivän liikkeet järjestyksessä, liiketiedot mukana. Arkistoidut säilyvät näkyvissä. */
export async function listDayExercisesWithExercise(dayId: string): Promise<DayExerciseWithExercise[]> {
  const rows = await listDayExercises(dayId)
  const exercises = await db.exercises.bulkGet(rows.map((row) => row.exerciseId))
  return rows.flatMap((row, index) => {
    const exercise = exercises[index]
    return exercise ? [{ row, exercise }] : []
  })
}

export async function addExerciseToDay(
  dayId: string,
  exerciseId: string,
  input?: { targetSets?: number; repRange?: RepRange; restSec?: number },
): Promise<string> {
  const rows = await listDayExercises(dayId)
  const id = newId()
  await db.dayExercises.add({
    id,
    dayId,
    exerciseId,
    order: rows.length,
    targetSets: input?.targetSets ?? 3,
    ...(input?.repRange ? { repRange: input.repRange } : {}),
    ...(input?.restSec !== undefined ? { restSec: input.restSec } : {}),
  })
  return id
}

export async function updateDayExercise(
  id: string,
  patch: Partial<Omit<DayExercise, 'id' | 'dayId'>>,
): Promise<void> {
  await db.dayExercises.update(id, patch)
}

export async function removeDayExercise(id: string): Promise<void> {
  await db.transaction('rw', db.dayExercises, async () => {
    const row = await db.dayExercises.get(id)
    if (!row) return
    await db.dayExercises.delete(id)
    const remaining = await listDayExercises(row.dayId)
    await Promise.all(
      remaining.map((candidate, index) => db.dayExercises.update(candidate.id, { order: index })),
    )
  })
}

export async function reorderDayExercises(orderedIds: string[]): Promise<void> {
  await db.transaction('rw', db.dayExercises, async () => {
    await Promise.all(orderedIds.map((id, index) => db.dayExercises.update(id, { order: index })))
  })
}

/** Liikkeen vaihto toiseen samalla paikalla ja samoilla tavoitteilla. */
export async function replaceDayExercise(id: string, exerciseId: string): Promise<void> {
  await db.dayExercises.update(id, { exerciseId })
}
