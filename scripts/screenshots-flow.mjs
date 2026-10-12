/**
 * Visuaalinen tarkistus pikaluonnin poluille (korjauskierros 1).
 * Ottaa kuvat tiloista, joihin pelkkä reitti ei vie: hakutulokset luontirivin
 * kanssa, pikalomake, lihaskartta edestä ja takaa sekä kaksoiskappalevaroitus.
 *
 * Käyttö:
 *   npm run build && npm run preview -- --port 4173 &
 *   node scripts/screenshots-flow.mjs
 *
 * Kuvat: docs/screenshots/flow-<nimi>-<leveys>x<korkeus>-<teema>.png
 */
import { mkdir } from 'node:fs/promises'
import { chromium } from '@playwright/test'

const BASE = process.env.SCREENSHOT_BASE ?? 'http://localhost:4173'
const SIZES = [
  { width: 390, height: 844 },
  { width: 360, height: 800 },
]
const THEMES = ['dark', 'light']

const outDir = new URL('../docs/screenshots/', import.meta.url)
await mkdir(outDir, { recursive: true })

const browser = await chromium.launch()
const failures = []
const shots = []

/**
 * Napauttaa lihasmuodon keskikohtaa. `scrollIntoViewIfNeeded` odottaa, että
 * paneelin jousianimaatio on ohi, ja napautus tehdään hiirellä laskettuun
 * pisteeseen, koska osuma lasketaan SVG-juuressa koordinaateista.
 */
async function tapMuscle(page, muscle) {
  const shape = page.locator(`[data-muscle="${muscle}"]`).first()
  await shape.scrollIntoViewIfNeeded()
  const box = await shape.boundingBox()
  if (box === null) throw new Error(`Lihasmuotoa ${muscle} ei löytynyt`)
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
}

/** Käyttöönotto läpi: kirjasto ja ohjelma syntyvät, Push saa yhden liikkeen. */
async function onboard(page) {
  await page.goto(`${BASE}/#/onboarding`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Aloita' }).click()
  await page.getByRole('button', { name: 'Valitse liikkeet' }).click()
  await page.getByRole('button', { name: 'Push', exact: true }).click()
  await page.getByRole('button', { name: 'Lisää liike' }).click()
  await page.getByPlaceholder('Esim. penkki').fill('Penkkipunnerrus')
  await page
    .locator('[role="dialog"] li', { has: page.getByText('Penkkipunnerrus', { exact: true }) })
    .first()
    .click()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Valmis' }).click()
  await page.waitForURL(/#\/$/)
}

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

      const shoot = async (name) => {
        await page.waitForTimeout(350)
        const file = `flow-${name}-${size.width}x${size.height}-${theme}.png`
        await page.screenshot({ path: new URL(file, outDir).pathname })
        shots.push(file)
        console.log(`  ${file}`)
      }

      await onboard(page)
      await page.evaluate((value) => {
        document.documentElement.dataset.theme = value
      }, theme)

      // Treeni käyntiin ja yksi sarja kirjattuna, jotta kuvissa on oikeaa dataa.
      await page.getByRole('button', { name: /^Aloita Push/ }).click()
      await page.getByRole('button', { name: 'Kuittaa sarja 1' }).first().click()

      // 1. Hakutulokset + luontirivi.
      await page.getByRole('button', { name: 'Lisää liike' }).last().click()
      await page.getByPlaceholder('Esim. penkki').fill('pec dec')
      await shoot('haku-luontirivi')

      // 2. Pikalomake tyhjänä (kartta edestä).
      await page.getByRole('button', { name: /Luo uusi liike/ }).click()
      await shoot('pikalomake-edesta')

      // 3. Kartta takaa, pari lihasta valittuna.
      await tapMuscle(page, 'chest')
      await page.getByRole('tab', { name: 'Takaa' }).click()
      await tapMuscle(page, 'triceps')
      await tapMuscle(page, 'triceps')
      await shoot('pikalomake-takaa')

      // 4. Kaksoiskappalevaroitus.
      await page.getByLabel('Nimi').fill('peck deck')
      await shoot('kaksoiskappale')

      // 5. Luotu liike treenissä.
      await page.getByLabel('Nimi').fill('Pec dec')
      await page.getByRole('button', { name: /Luo silti/ }).click()
      await page.getByRole('button', { name: 'Luo ja lisää treeniin' }).click()
      await page.waitForTimeout(500)
      await shoot('treeni-uusi-liike')

      // 6. Lisäasetukset auki uudelle liikkeelle.
      await page.getByRole('button', { name: 'Lisää liike' }).last().click()
      await page.getByPlaceholder('Esim. penkki').fill('kahvakuula')
      await page.getByRole('button', { name: /Luo uusi liike/ }).click()
      /*
        Lomake vieritetään pohjaan ensin: kiinnitetty tallennuspalkki on silloin
        omalla paikallaan eikä peitä alla olevaa otsikkoa.
      */
      await page.getByRole('button', { name: 'Luo ja lisää treeniin' }).scrollIntoViewIfNeeded()
      await page.getByRole('button', { name: /Lisäasetukset/ }).click()
      await shoot('pikalomake-lisaasetukset')

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
  console.log(`Kuvat valmiit: ${shots.length} kuvaa kansiossa docs/screenshots/`)
}
