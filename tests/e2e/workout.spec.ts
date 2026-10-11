import { expect, test } from '@playwright/test'
import { completeOnboarding } from './helpers'

/**
 * Treenin kirjaus päästä päähän (SPEC §6.3–§6.5, §8):
 * käyttöönotto → treenin aloitus kierron mukaan → sarjojen kirjaus →
 * sivun päivitys kesken treenin → päätös ja yhteenveto.
 */
test('koko treeni kirjataan, päivitys kesken treenin ei hukkaa mitään', async ({ page }) => {
  await completeOnboarding(page, [['Push', ['Penkkipunnerrus', 'Pystypunnerrus']]])

  // Kotinäkymä ehdottaa kierron mukaista päivää.
  await expect(page.getByText('Seuraava kierrossa')).toBeVisible()
  await page.getByRole('button', { name: /^Aloita Push/ }).click()
  await expect(page).toHaveURL(/#\/workout\/[^/]+$/)
  const workoutUrl = page.url()

  // Ensimmäinen sarja: esitäytetty rivi kuitataan yhdellä napautuksella.
  await page.getByRole('button', { name: 'Kuittaa sarja 1' }).first().click()
  await expect(page.getByText(/^Lepo ·/)).toBeVisible()
  await expect(page.getByText('1/3 sarjaa').first()).toBeVisible()

  // Lepoajastinta voi pidentää ja sen voi ohittaa.
  await page.getByRole('button', { name: 'Lisää 15 sekuntia' }).click()
  await page.getByRole('button', { name: 'Ohita' }).click()
  await expect(page.getByText(/^Lepo ·/)).toBeHidden()

  await page.getByRole('button', { name: 'Kuittaa sarja 2' }).first().click()
  await expect(page.getByText('2/3 sarjaa').first()).toBeVisible()

  // Sivun päivitys kesken treenin: kirjaukset säilyvät (autosave, SPEC §5).
  await page.reload()
  await expect(page).toHaveURL(workoutUrl)
  await expect(page.getByText('2/3 sarjaa').first()).toBeVisible()

  // Painon muuttaminen ja kolmas sarja.
  await page.getByRole('button', { name: 'Lisää: Paino kilogrammoina' }).first().click()
  await page.getByRole('button', { name: 'Kuittaa sarja 3' }).first().click()
  await expect(page.getByText('3/3 sarjaa').first()).toBeVisible()

  // Päätös ja yhteenveto.
  await page.getByRole('button', { name: 'Päätä', exact: true }).click()
  await page.getByRole('button', { name: 'Päätä treeni' }).click()
  await expect(page).toHaveURL(/\/summary$/)
  await expect(page.getByText('TYÖSARJAT')).toBeVisible()
  await expect(page.getByText(/uutta ennätystä|Uusi ennätys/)).toBeVisible()

  // Treeni näkyy kotinäkymän viimeisissä treeneissä.
  await page.getByRole('button', { name: 'Valmis' }).click()
  await expect(page).toHaveURL(/#\/$/)
  await expect(page.getByText('Viimeiset treenit')).toBeVisible()
})

test('kesken jäänyt treeni palautuu kotinäkymästä', async ({ page }) => {
  await completeOnboarding(page, [['Push', ['Penkkipunnerrus']]])
  await page.getByRole('button', { name: /^Aloita Push/ }).click()
  await page.getByRole('button', { name: 'Kuittaa sarja 1' }).first().click()

  await page.goto('/#/')
  await expect(page.getByText('Treeni kesken')).toBeVisible()
  // Alapalkissa on samanniminen pikakuvake, joten rajataan sisältöalueeseen.
  await page.locator('main').getByRole('button', { name: 'Jatka treeniä' }).click()
  await expect(page.getByText('1/3 sarjaa').first()).toBeVisible()
})

test('lämmittelysarja ei näy työsarjojen laskennassa', async ({ page }) => {
  await completeOnboarding(page, [['Push', ['Penkkipunnerrus']]])
  await page.getByRole('button', { name: /^Aloita Push/ }).click()

  // Napautus rivinumerossa merkitsee lämmittelyksi, jolloin rivi ei enää vie
  // työsarjan numeroa ja kuittausnappi nimetään lämmittelyksi.
  await page.getByRole('button', { name: /^1: merkitse lämmittelysarjaksi/ }).first().click()
  await page.getByRole('button', { name: 'Kuittaa lämmittelysarja' }).first().click()

  // Lämmittely ei kasvata työsarjalaskuria.
  await expect(page.getByText('0/3 sarjaa').first()).toBeVisible()
  await expect(page.getByText(/^Lepo ·/)).toBeHidden()
})

test('tyhjää treeniä ei tallenneta historiaan', async ({ page }) => {
  await completeOnboarding(page, [['Push', ['Penkkipunnerrus']]])
  await page.getByRole('button', { name: /^Aloita Push/ }).click()

  await page.getByRole('button', { name: 'Päätä', exact: true }).click()
  await page.getByRole('button', { name: 'Päätä treeni' }).click()
  await expect(page.getByText('Treenissä ei ole yhtään kirjattua sarjaa')).toBeVisible()
  await page.getByRole('button', { name: 'Poista treeni' }).click()

  await expect(page).toHaveURL(/#\/$/)
  await expect(page.getByText('Treeni kesken')).toBeHidden()
})
