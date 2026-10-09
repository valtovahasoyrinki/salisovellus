import { expect, test } from '@playwright/test'
import { completeOnboarding } from './helpers'

/** Kirjaa yhden treenin, jotta analyysille ja historialle on dataa. */
async function logWorkout(page: Parameters<typeof completeOnboarding>[0]): Promise<void> {
  await page.getByRole('button', { name: /^Aloita Push/ }).click()
  await page.getByRole('button', { name: 'Kuittaa 1' }).first().click()
  await page.getByRole('button', { name: 'Kuittaa 2' }).first().click()
  await page.getByRole('button', { name: 'Päätä', exact: true }).click()
  await page.getByRole('button', { name: 'Päätä treeni' }).click()
  await expect(page).toHaveURL(/\/summary$/)
  await page.getByRole('button', { name: 'Valmis' }).click()
}

test('kirjattu treeni näkyy historiassa ja analyysissä kaaviona', async ({ page }) => {
  await completeOnboarding(page, [['Push', ['Penkkipunnerrus']]])
  await logWorkout(page)

  // Historia: kuukausiryhmä ja treenin tiedot.
  await page.goto('/#/history')
  await expect(page.getByRole('heading', { name: 'Historia', level: 1 })).toBeVisible()
  // Sama teksti esiintyy otsikossa ja kuukausiryhmässä, joten rajataan otsikkoon.
  await expect(page.getByText('1 treeniä').first()).toBeVisible()
  await page.getByRole('link', { name: /Push/ }).first().click()
  await expect(page.getByText('TYÖSARJAT')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Penkkipunnerrus' })).toBeVisible()

  // Analyysi: yleiskatsaus ja liikekohtainen kaavio.
  await page.goto('/#/analysis')
  await expect(page.getByRole('heading', { name: 'Analyysi', level: 1 })).toBeVisible()
  await expect(page.getByText('Työsarjat viikoittain')).toBeVisible()
  await expect(page.getByLabel('Työsarjat liikeryhmittäin viikoittain')).toBeVisible()

  await page.getByRole('link', { name: 'Penkkipunnerrus' }).first().click()
  await expect(page.getByRole('heading', { name: 'Penkkipunnerrus', level: 1 })).toBeVisible()
  // Kaavio on SVG, jolla on saavutettava nimi.
  await expect(page.getByLabel(/Penkkipunnerrus: .* aikajanalla/)).toBeVisible()
  await expect(page.getByText('Ennätykset')).toBeVisible()
})

test('mittarin ja aikavälin vaihto toimii liikeanalyysissä', async ({ page }) => {
  await completeOnboarding(page, [['Push', ['Penkkipunnerrus']]])
  await logWorkout(page)

  await page.goto('/#/analysis')
  await page.getByRole('link', { name: 'Penkkipunnerrus' }).first().click()

  await page.getByRole('tab', { name: 'Volyymi' }).click()
  await expect(page.getByLabel(/Penkkipunnerrus: Volyymi aikajanalla/)).toBeVisible()

  await page.getByRole('tab', { name: 'Kaikki' }).click()
  await expect(page.getByLabel(/Penkkipunnerrus: Volyymi aikajanalla/)).toBeVisible()
})

test('menneen treenin sarjaa voi muokata ja treenin voi poistaa', async ({ page }) => {
  await completeOnboarding(page, [['Push', ['Penkkipunnerrus']]])
  await logWorkout(page)

  await page.goto('/#/history')
  await page.getByRole('link', { name: /Push/ }).first().click()

  // Sarjan muokkaus tallentuu heti.
  await page.getByRole('button', { name: /^Muokkaa sarjaa 1/ }).click()
  await page.getByRole('button', { name: 'Lisää: Toistot' }).click()
  await page.keyboard.press('Escape')
  // Odotetaan että lomake on kokonaan sulkeutunut (sulkuanimaatio).
  await expect(page.locator('[role="dialog"]')).toBeHidden()
  // Esitäytetty rivi oli 5 toistoa; yksi lisäys tekee 6.
  await expect(page.getByText(/20 kg × 6/)).toBeVisible()

  await page.getByRole('button', { name: 'Poista', exact: true }).click()
  await page.getByRole('button', { name: 'Poista treeni' }).click()
  await expect(page).toHaveURL(/#\/history$/)
  await expect(page.getByText('Ei treenejä vielä')).toBeVisible()
})
