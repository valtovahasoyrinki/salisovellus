import type { Page } from '@playwright/test'

/** Käyttöönotto läpi: liikekirjasto siemennetään ja ohjelma luodaan. */
export async function completeOnboarding(
  page: Page,
  plan: Array<[string, string[]]> = [['Push', ['Penkkipunnerrus', 'Pystypunnerrus']]],
): Promise<void> {
  await page.goto('/#/onboarding')
  await page.getByRole('button', { name: 'Aloita' }).click()
  await page.getByRole('button', { name: 'Valitse liikkeet' }).click()

  for (const [day, exercises] of plan) {
    await page.getByRole('button', { name: day, exact: true }).click()
    await page.getByRole('button', { name: 'Lisää liike' }).click()
    for (const name of exercises) {
      await page.getByPlaceholder('Esim. penkki').fill(name)
      /*
        Täsmällinen osuma ja Playwrightin automaattinen odotus: pelkkä
        ensimmäinen rivi valitsisi "Kapea penkkipunnerrus", jos suodatus ei ole
        vielä ehtinyt päivittyä.
      */
      await page
        .locator('[role="dialog"] li', { has: page.getByText(name, { exact: true }) })
        .first()
        .click()
    }
    await page.keyboard.press('Escape')
  }

  await page.getByRole('button', { name: 'Valmis' }).click()
  await page.waitForURL(/#\/$/)
}

/** Tyhjentää sovelluksen tietokannan, jotta testi alkaa puhtaalta pöydältä. */
export async function resetDatabase(page: Page): Promise<void> {
  await page.goto('/')
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase('salisovellus')
      for (const event of ['success', 'error', 'blocked']) {
        request.addEventListener(event, () => resolve())
      }
    })
  })
  await page.reload()
}

/**
 * Napauttaa lihasmuodon keskikohtaa lihaskartalla.
 *
 * `scrollIntoViewIfNeeded` odottaa, että elementti on näkyvä ja vakaa (paneelin
 * jousianimaatio on ohi), ja napautus tehdään hiirellä laskettuun pisteeseen:
 * osuma lasketaan tarkoituksella SVG-juuressa koordinaateista, joten
 * päällimmäinen muoto (esim. lähentäjät etureiden päällä) ei saa estää
 * napautusta niin kuin Playwrightin oma osumatarkistus tekisi.
 */
export async function tapMuscle(page: Page, muscle: string): Promise<void> {
  const shape = page.locator(`[data-muscle="${muscle}"]`).first()
  await shape.scrollIntoViewIfNeeded()
  const box = await shape.boundingBox()
  if (box === null) throw new Error(`Lihasmuotoa ${muscle} ei löytynyt kartalta`)
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
}

/** Vaihtaa lihaskartan takanäkymään (selkä, pakarat, takareidet). */
export async function showBackView(page: Page): Promise<void> {
  await page.getByRole('tab', { name: 'Takaa' }).click()
}

/**
 * Odottaa, että sileä vieritys on päättynyt: kesken treenin luotu liike
 * vieritetään näkyviin, ja Playwright voi ehtiä napauttaa vanhaan kohtaan,
 * koska vieritysanimaation alussa kaksi peräkkäistä ruudunpäivitystä voivat
 * näyttää samalta. Tämä odottaa oikeaa signaalia eikä kiinteää viivettä.
 */
export async function waitForScrollEnd(page: Page): Promise<void> {
  await page.waitForFunction(
    () =>
      new Promise<boolean>((resolve) => {
        const start = window.scrollY
        requestAnimationFrame(() =>
          requestAnimationFrame(() => resolve(Math.abs(window.scrollY - start) < 1)),
        )
      }),
  )
}
