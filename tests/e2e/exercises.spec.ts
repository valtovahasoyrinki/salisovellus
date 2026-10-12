import { expect, test, type Page } from '@playwright/test'
import { completeOnboarding } from './helpers'

/**
 * Liikkeiden haku salinimillä ja pikaluonti (korjauskierros 1, osiot 3.1 ja 3.5).
 * Nämä polut ratkaisevat sen, pystyykö uuden liikkeen lisäämään kesken treenin
 * ilman että kirjaus katkeaa.
 */

/** Aloittaa Push-treenin ja kuittaa yhden sarjan, jotta treenissä on dataa. */
async function startWorkoutWithSet(page: Page): Promise<void> {
  await page.getByRole('button', { name: /^Aloita Push/ }).click()
  await page.getByRole('button', { name: 'Kuittaa sarja 1' }).first().click()
}

/** Avaa treenin "Lisää liike" -paneelin ja hakee annetulla sanalla. */
async function searchInPicker(page: Page, query: string): Promise<void> {
  await page
    .getByRole('button', { name: 'Lisää liike' })
    .last()
    .click()
  await page.getByPlaceholder('Esim. penkki').fill(query)
}

test('haku löytää liikkeen salinimellä kesken treenin', async ({ page }) => {
  await completeOnboarding(page, [['Push', ['Penkkipunnerrus']]])
  await startWorkoutWithSet(page)

  await searchInPicker(page, 'pec dec')
  const row = page.locator('[role="dialog"] li', {
    has: page.getByText('Vipunosto rintaliikelaitteessa', { exact: true }),
  })
  await expect(row).toBeVisible()
  // Rivi kertoo, miksi liike löytyi, kun osuma tuli aliaksesta.
  await expect(page.getByText(/myös: pec de/i).first()).toBeVisible()

  // Kuitattu sarja on yhä paikallaan: haku ei kosketa treeniin.
  await page.keyboard.press('Escape')
  await expect(page.getByText(/1\/3 sarjaa/).first()).toBeVisible()
})

test('englanninkieliset ja kirjoitusvirheelliset hakusanat löytävät oikean liikkeen', async ({
  page,
}) => {
  await completeOnboarding(page, [['Push', ['Penkkipunnerrus']]])
  await page.goto('/#/exercises')

  const cases: Array<[string, string]> = [
    ['lat pulldown', 'Ylätalja'],
    ['face pull', 'Kasvoveto taljassa'],
    ['hip thrust', 'Lantionnosto tangolla'],
    ['rdl', 'Romanialainen maastaveto'],
    ['leg press', 'Jalkaprässi'],
    ['butterfly', 'Vipunosto rintaliikelaitteessa'],
    ['pulldwon', 'Ylätalja'],
    ['kasipaino', 'Hauiskääntö käsipainoilla'],
  ]

  for (const [query, expected] of cases) {
    await page.getByPlaceholder('Esim. kyykky').fill(query)
    await expect(
      page.getByRole('link', { name: new RegExp(expected) }).first(),
      `hakusana "${query}"`,
    ).toBeVisible()
  }
})
