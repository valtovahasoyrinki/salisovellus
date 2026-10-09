/**
 * Lataa generoidun testidatan selaimen IndexedDB:hen suorituskyky- ja
 * ulkoasutarkistuksia varten (SPEC §8).
 *
 * Kirjoittaa rivit suoraan tietokantaan, koska tuontinäkymä on käyttäjän
 * polku eikä sovellu 17 000 rivin lataamiseen testiskriptistä.
 *
 * Aja: npx vite --port 5174 ja sen jälkeen
 *      node scripts/generate-test-data.mjs && node scripts/load-testdata.mjs
 */
import { readFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'

const BASE = process.env.SCREENSHOT_BASE ?? 'http://localhost:5174'
const FILE = process.argv[2] ?? 'testdata/salisovellus-testidata.json'

/**
 * Kirjoittaa sovelluksen oman Dexie-yhteyden kautta. Suora IndexedDB-kirjoitus
 * toisesta yhteydestä ei herätä Dexien reaktiivisia kyselyitä, jolloin näkymät
 * jäisivät näyttämään vanhaa tilaa. Vaatii kehityspalvelimen (moduulituonti).
 */
export async function loadTestData(page, backup) {
  await page.evaluate(async (data) => {
    const { db } = await import('/src/db/db.ts')
    await db.open()
    await db.transaction(
      'rw',
      [
        db.exercises,
        db.programs,
        db.workoutDays,
        db.dayExercises,
        db.sessions,
        db.sessionExercises,
        db.setEntries,
        db.settings,
      ],
      async () => {
        await Promise.all([
          db.exercises.clear(),
          db.programs.clear(),
          db.workoutDays.clear(),
          db.dayExercises.clear(),
          db.sessions.clear(),
          db.sessionExercises.clear(),
          db.setEntries.clear(),
        ])
        await db.exercises.bulkPut(data.data.exercises)
        await db.programs.bulkPut(data.data.programs)
        await db.workoutDays.bulkPut(data.data.workoutDays)
        await db.dayExercises.bulkPut(data.data.dayExercises)
        await db.sessions.bulkPut(data.data.sessions)
        await db.sessionExercises.bulkPut(data.data.sessionExercises)
        await db.setEntries.bulkPut(data.data.setEntries)
        if (data.data.settings) await db.settings.put(data.data.settings)
      },
    )
  }, backup)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const backup = JSON.parse(await readFile(FILE, 'utf8'))
  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle' })
  await loadTestData(page, backup)
  console.log(
    `Ladattu: ${backup.data.sessions.length} treeniä, ${backup.data.setEntries.length} sarjaa.`,
  )
  console.log('Selain jää auki tarkastelua varten – sulje ikkuna lopettaaksesi.')
  await page.waitForTimeout(600_000)
  await browser.close()
}
