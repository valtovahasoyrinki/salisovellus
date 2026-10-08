/**
 * Liikekirjaston siementäminen tietokantaan (SPEC §6.1).
 *
 * Kirjasto lisätään vain kertaalleen: jos `exercises`-taulussa on jo rivejä,
 * mitään ei tehdä. Näin käyttäjän omat muokkaukset, arkistoinnit ja poistot
 * eivät palaudu sovelluksen käynnistyksessä.
 */
import { db } from '@/db/db'
import { newId } from '@/lib/id'
import { EXERCISE_LIBRARY } from './exercises'

/** Palauttaa lisättyjen liikkeiden määrän (0 = kirjasto oli jo olemassa). */
export async function seedExerciseLibrary(): Promise<number> {
  return db.transaction('rw', db.exercises, async () => {
    const existing = await db.exercises.count()
    if (existing > 0) return 0

    const createdAt = Date.now()
    await db.exercises.bulkAdd(
      EXERCISE_LIBRARY.map((exercise) => ({
        ...exercise,
        id: newId(),
        archived: false,
        isCustom: false,
        createdAt,
      })),
    )
    return EXERCISE_LIBRARY.length
  })
}
