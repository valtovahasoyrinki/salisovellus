/**
 * Liikekirjaston synkronointi tietokantaan (SPEC §6.1).
 *
 * Funktio on idempotentti ja sitä kutsutaan joka käynnistyksessä:
 * - Tyhjä tietokanta saa koko kirjaston kerralla.
 * - Olemassa olevaan asennukseen lisätään vain ne rivit, joiden `since` on
 *   suurempi kuin `meta.libraryVersion` (1.0-asennuksessa avain puuttuu, mikä
 *   tarkoittaa versiota 1). Liike ohitetaan, jos sen normalisoitu nimi on jo
 *   käytössä – myös arkistoidulla tai käyttäjän omalla liikkeellä. Näin oma
 *   "Pec dec" ei saa rinnalleen kaksoiskappaletta.
 * - Aliakset täytetään kirjastoliikkeille (`isCustom: false`), joilla niitä ei
 *   vielä ole. Nimeä, lihaksia, arkistointia eikä muita kenttiä kosketa.
 * - Poistettu kirjastoliike ei palaa (versioportti) eikä arkistoitu aktivoidu.
 */
import { db } from '@/db/db'
import { getLibraryVersion, setLibraryVersion } from '@/db/repositories/metaRepo'
import { normalizeTerm } from '@/domain/exerciseSearch'
import type { Exercise, Timestamp } from '@/domain/types'
import { newId } from '@/lib/id'
import { EXERCISE_LIBRARY, LIBRARY_VERSION, type LibrarySeedEntry } from './exercises'

export interface LibrarySyncResult {
  /** Montako kirjastoliikettä lisättiin. */
  added: number
  /** Montako olemassa olevaa kirjastoliikettä sai aliakset. */
  aliasesFilled: number
}

/** `since` on vain siemendatan metatietoa: se ei kuulu riviin eikä varmuuskopioon. */
function toRow(entry: LibrarySeedEntry, createdAt: Timestamp): Exercise {
  const { since: _since, ...exercise } = entry
  return { ...exercise, id: newId(), archived: false, isCustom: false, createdAt }
}

export async function syncExerciseLibrary(): Promise<LibrarySyncResult> {
  return db.transaction('rw', [db.exercises, db.meta], async () => {
    const existing = await db.exercises.toArray()
    const createdAt = Date.now()

    if (existing.length === 0) {
      await db.exercises.bulkAdd(EXERCISE_LIBRARY.map((entry) => toRow(entry, createdAt)))
      await setLibraryVersion(LIBRARY_VERSION)
      return { added: EXERCISE_LIBRARY.length, aliasesFilled: 0 }
    }

    const installed = (await getLibraryVersion()) ?? 1
    const usedNames = new Set(existing.map((row) => normalizeTerm(row.name)))

    const rows: Exercise[] = []
    for (const entry of EXERCISE_LIBRARY) {
      if (entry.since <= installed) continue
      const normalized = normalizeTerm(entry.name)
      if (usedNames.has(normalized)) continue
      usedNames.add(normalized)
      rows.push(toRow(entry, createdAt))
    }
    if (rows.length > 0) await db.exercises.bulkAdd(rows)

    const seedByName = new Map(
      EXERCISE_LIBRARY.map((entry) => [normalizeTerm(entry.name), entry] as const),
    )
    let aliasesFilled = 0
    for (const row of existing) {
      if (row.isCustom || (row.aliases?.length ?? 0) > 0) continue
      const aliases = seedByName.get(normalizeTerm(row.name))?.aliases
      if (aliases === undefined || aliases.length === 0) continue
      await db.exercises.update(row.id, { aliases: [...aliases] })
      aliasesFilled += 1
    }

    await setLibraryVersion(LIBRARY_VERSION)
    return { added: rows.length, aliasesFilled }
  })
}
