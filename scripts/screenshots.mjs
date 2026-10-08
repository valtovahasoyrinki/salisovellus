/**
 * Visuaalinen tarkistus (SPEC §8): kuvakaappaus jokaisesta päänäkymästä
 * mobiilikoossa, tummalla ja vaalealla teemalla.
 *
 * Käyttö:
 *   npm run build && npm run preview -- --port 4173 &
 *   node scripts/screenshots.mjs [reitti ...]
 *
 * Kuvat: docs/screenshots/<reitti>-<leveys>x<korkeus>-<teema>.png
 */
import { mkdir } from 'node:fs/promises'
import { chromium } from '@playwright/test'

const BASE = process.env.SCREENSHOT_BASE ?? 'http://localhost:4173'
const SIZES = [
  { width: 390, height: 844 },
  { width: 360, height: 800 },
]
const THEMES = ['dark', 'light']
const DEFAULT_ROUTES = ['/', '/history', '/analysis', '/program', '/exercises', '/settings']
const routes = process.argv.slice(2).length > 0 ? process.argv.slice(2) : DEFAULT_ROUTES

const outDir = new URL('../docs/screenshots/', import.meta.url)
await mkdir(outDir, { recursive: true })

const browser = await chromium.launch()
const failures = []
try {
  for (const size of SIZES) {
    for (const theme of THEMES) {
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
      page.on('pageerror', (error) => failures.push(`${theme} ${size.width}px: ${error.message}`))
      page.on('console', (message) => {
        if (message.type() === 'error') failures.push(`console: ${message.text()}`)
      })

      for (const route of routes) {
        await page.goto(`${BASE}/#${route}`, { waitUntil: 'networkidle' })
        await page.evaluate((value) => {
          document.documentElement.dataset.theme = value
        }, theme)
        await page.waitForTimeout(400)
        const name = route === '/' ? 'home' : route.replaceAll('/', '-').replace(/^-/, '')
        await page.screenshot({
          path: new URL(`${name}-${size.width}x${size.height}-${theme}.png`, outDir).pathname,
        })
      }
      await context.close()
    }
  }
} finally {
  await browser.close()
}

if (failures.length > 0) {
  console.error('Virheitä sivulla:')
  for (const failure of new Set(failures)) console.error(` - ${failure}`)
  process.exitCode = 1
} else {
  console.log(`Kuvat valmiit: ${routes.length} reittiä × ${SIZES.length} kokoa × ${THEMES.length} teemaa`)
}
