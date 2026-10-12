import { db } from '@/db/db'
import type { Exercise, Timestamp } from '@/domain/types'
import { newId } from '@/lib/id'

export type NewExercise = Omit<Exercise, 'id' | 'createdAt' | 'archived' | 'isCustom'> &
  Partial<Pick<Exercise, 'archived' | 'isCustom'>>

const byName = (a: Exercise, b: Exercise): number => a.name.localeCompare(b.name, 'fi')

export async function listExercises(): Promise<Exercise[]> {
  return (await db.exercises.toArray()).sort(byName)
}

export async function listActiveExercises(): Promise<Exercise[]> {
  return (await db.exercises.filter((exercise) => !exercise.archived).toArray()).sort(byName)
}

export function getExercise(id: string): Promise<Exercise | undefined> {
  return db.exercises.get(id)
}

export async function getExercises(ids: string[]): Promise<Map<string, Exercise>> {
  const rows = await db.exercises.bulkGet(ids)
  const map = new Map<string, Exercise>()
  for (const row of rows) {
    if (row) map.set(row.id, row)
  }
  return map
}

export async function createExercise(input: NewExercise): Promise<string> {
  const id = newId()
  await db.exercises.add({
    archived: false,
    isCustom: true,
    ...input,
    id,
    createdAt: Date.now(),
  })
  return id
}

export async function updateExercise(
  id: string,
  patch: Partial<Omit<Exercise, 'id' | 'createdAt'>>,
): Promise<void> {
  await db.exercises.update(id, patch)
}

export async function setExerciseArchived(id: string, archived: boolean): Promise<void> {
  await db.exercises.update(id, { archived })
}

export interface ExerciseUsage {
  sessionCount: number
  setCount: number
  lastDoneAt?: Timestamp
  /** Montako ohjelman treenipäivää käyttää liikettä. */
  programDayCount: number
}

export async function getExerciseUsage(exerciseId: string): Promise<ExerciseUsage> {
  const [sets, programDayCount] = await Promise.all([
    db.setEntries.where('exerciseId').equals(exerciseId).toArray(),
    db.dayExercises.where('exerciseId').equals(exerciseId).count(),
  ])
  const sessionIds = new Set(sets.map((set) => set.sessionId))
  const lastDoneAt = sets.reduce<Timestamp | undefined>(
    (latest, set) => (latest === undefined || set.completedAt > latest ? set.completedAt : latest),
    undefined,
  )
  return {
    sessionCount: sessionIds.size,
    setCount: sets.length,
    lastDoneAt,
    programDayCount,
  }
}

/**
 * Pysyvä poisto. Poistaa liikkeen, sen kuvan, ohjelmarivit sekä KAIKEN
 * historian. Kutsuja näyttää ensin `getExerciseUsage`-luvut vahvistuksessa
 * (SPEC §5).
 */
export async function deleteExercisePermanently(exerciseId: string): Promise<void> {
  await db.transaction(
    'rw',
    [db.exercises, db.images, db.dayExercises, db.sessionExercises, db.setEntries],
    async () => {
      const exercise = await db.exercises.get(exerciseId)
      await db.setEntries.where('exerciseId').equals(exerciseId).delete()
      await db.sessionExercises.where('exerciseId').equals(exerciseId).delete()
      await db.dayExercises.where('exerciseId').equals(exerciseId).delete()
      if (exercise?.imageId) await db.images.delete(exercise.imageId)
      await db.exercises.delete(exerciseId)
    },
  )
}

/**
 * Kahden liikkeen yhdistäminen (SPEC §6.2): lähteen historia ja ohjelmarivit
 * siirtyvät kohteelle, minkä jälkeen lähde poistetaan.
 */
export async function mergeExercises(sourceId: string, targetId: string): Promise<void> {
  if (sourceId === targetId) return
  await db.transaction(
    'rw',
    [db.exercises, db.images, db.dayExercises, db.sessionExercises, db.setEntries],
    async () => {
      await db.setEntries.where('exerciseId').equals(sourceId).modify({ exerciseId: targetId })
      await db.sessionExercises.where('exerciseId').equals(sourceId).modify({ exerciseId: targetId })

      // Ohjelmapäivä voi jo sisältää kohdeliikkeen – silloin rivi poistetaan.
      const dayRows = await db.dayExercises.where('exerciseId').equals(sourceId).toArray()
      for (const row of dayRows) {
        const existing = await db.dayExercises
          .where('dayId')
          .equals(row.dayId)
          .filter((candidate) => candidate.exerciseId === targetId)
          .first()
        if (existing) {
          await db.dayExercises.delete(row.id)
        } else {
          await db.dayExercises.update(row.id, { exerciseId: targetId })
        }
      }

      const source = await db.exercises.get(sourceId)
      if (source?.imageId) {
        const target = await db.exercises.get(targetId)
        if (target && !target.imageId) {
          await db.exercises.update(targetId, { imageId: source.imageId })
        } else {
          await db.images.delete(source.imageId)
        }
      }
      await db.exercises.delete(sourceId)
    },
  )
}

export async function setExerciseImage(exerciseId: string, blob: Blob): Promise<void> {
  await db.transaction('rw', [db.exercises, db.images], async () => {
    const exercise = await db.exercises.get(exerciseId)
    if (!exercise) return
    if (exercise.imageId) await db.images.delete(exercise.imageId)
    const imageId = newId()
    await db.images.add({ id: imageId, blob })
    await db.exercises.update(exerciseId, { imageId })
  })
}

export async function clearExerciseImage(exerciseId: string): Promise<void> {
  await db.transaction('rw', [db.exercises, db.images], async () => {
    const exercise = await db.exercises.get(exerciseId)
    if (!exercise?.imageId) return
    await db.images.delete(exercise.imageId)
    await db.exercises.update(exerciseId, { imageId: undefined })
  })
}

export async function getExerciseImage(imageId: string): Promise<Blob | undefined> {
  return (await db.images.get(imageId))?.blob
}
