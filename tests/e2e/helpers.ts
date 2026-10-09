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
