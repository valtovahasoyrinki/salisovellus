/**
 * Kuvakaappaukset päänäkymistä oikealla datalla (SPEC §8).
 *
 * Täyttää tietokannan käyttöliittymän kautta (`seed-ui.mjs`) ja kuvaa jokaisen
 * näkymän koossa 390 × 844 ja 360 × 800, tummalla ja vaalealla teemalla.
 * Raportoi myös selaimen konsolivirheet.
 *
 * Aja kehityspalvelin ensin (`npx vite --port 5174`), sitten:
 *   node scripts/screenshots-seeded.mjs
 */
import { mkdir } from 'node:fs/promises'
import { chromium } from '@playwright/test'
import { seedViaUi } from './seed-ui.mjs'

const BASE = process.env.SCREENSHOT_BASE ?? 'http://localhost:5174'
const SIZES = [
  { width: 390, height: 844 },
  { width: 360, height: 800 },
]

await mkdir('docs/screenshots', { recursive: true })
const browser = await chromium.launch()
const errors = []

/** Lukee rivit suoraan IndexedDB:stä, jotta reitit voidaan muodostaa id:illä. */
async function readRows(page, store) {
  return page.evaluate(async (name) => {
    const request = indexedDB.open('salisovellus')
    const db = await new Promise((resolve) => {
      request.addEventListener('success', () => resolve(request.result))
    })
    const rows = await new Promise((resolve) => {
      const getAll = db.transaction(name).objectStore(name).getAll()
      getAll.addEventListener('success', () => resolve(getAll.result))
    })
    db.close()
    return rows
  }, store)
}

for (const size of SIZES) {
  for (const theme of ['dark', 'light']) {
    const context = await browser.newContext({
      viewport: size,
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      locale: 'fi-FI',
      timezoneId: 'Europe/Helsinki',
      colorScheme: theme,
    })
    const page = await context.newPage()
    page.on('pageerror', (error) => errors.push(`${theme}: ${error.message}`))
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(`${theme} console: ${message.text()}`)
    })

    await seedViaUi(page, BASE)

    const days = await readRows(page, 'workoutDays')
    const exercises = await readRows(page, 'exercises')
    const dayId = [...days].sort((a, b) => a.order - b.order)[0]?.id ?? ''
    const exerciseId =
      exercises.find((exercise) => exercise.name === 'Penkkipunnerrus')?.id ?? exercises[0]?.id ?? ''

    const routes = [
      ['home', '/'],
      ['program', '/program'],
      ['program-day', `/program/day/${dayId}`],
      ['exercises', '/exercises'],
      ['exercise-detail', `/exercises/${exerciseId}`],
      ['history', '/history'],
      ['analysis', '/analysis'],
      ['settings', '/settings'],
    ]

    for (const [name, route] of routes) {
      await page.goto(`${BASE}/#${route}`, { waitUntil: 'networkidle' })
      await page.evaluate((value) => {
        document.documentElement.dataset.theme = value
      }, theme)
      await page.waitForSelector('h1', { state: 'visible', timeout: 10_000 }).catch(() => {})
      await page.waitForTimeout(600)
      await page.screenshot({
        path: `docs/screenshots/${name}-${size.width}x${size.height}-${theme}.png`,
      })
    }

    await context.close()
  }
}

await browser.close()
console.log(errors.length === 0 ? 'Ei virheitä' : [...new Set(errors)].join('\n'))
