import { expect, test } from '@playwright/test'
import { completeOnboarding } from './helpers'

/**
 * Käyttöönotto, ohjelman hallinta ja liikekirjasto (SPEC §6.1, §6.2, §8).
 * Jokainen testi saa oman selainkontekstin, joten IndexedDB alkaa tyhjänä.
 */
test('käyttöönotto luo ohjelman ja liikekirjaston', async ({ page }) => {
  await completeOnboarding(page, [
    ['Push', ['Penkkipunnerrus', 'Pystypunnerrus']],
    ['Pull', ['Kulmasoutu']],
  ])

  await page.goto('/#/program')
  await expect(page.getByRole('heading', { name: 'Ohjelma', level: 1 })).toBeVisible()
  await expect(page.getByText('3 treenipäivää kierrossa')).toBeVisible()
  await expect(page.getByText('Push', { exact: true })).toBeVisible()
  await expect(page.getByText('Pull', { exact: true })).toBeVisible()
  await expect(page.getByText('Legs', { exact: true })).toBeVisible()

  await page.goto('/#/exercises')
  await expect(page.getByRole('heading', { name: 'Liikekirjasto', level: 1 })).toBeVisible()
  // Kirjastossa on 60–80 liikettä (SPEC §6.1).
  const count = await page.getByRole('heading', { level: 1 }).locator('..').textContent()
  expect(count).toMatch(/\d{2} liikettä/)
})

test('liike löytyy haulla ja lihasryhmäsuodattimella', async ({ page }) => {
  await completeOnboarding(page)
  await page.goto('/#/exercises')

  const search = page.getByPlaceholder('Esim. kyykky')
  await search.fill('maastaveto')
  await expect(page.getByText('Maastaveto', { exact: true })).toBeVisible()

  await search.fill('')
  await page.getByRole('button', { name: /^Rinta/ }).click()
  const rows = page.locator('ul li')
  await expect(rows.first()).toBeVisible()
  // Suodatin rajaa listan selvästi pienemmäksi kuin koko kirjasto.
  expect(await rows.count()).toBeLessThan(30)
})

test('liikkeen lisäys päivään ja päiväkohtaiset tavoitteet tallentuvat', async ({ page }) => {
  await completeOnboarding(page, [['Push', ['Penkkipunnerrus']]])

  await page.goto('/#/program')
  await page.getByRole('button', { name: 'Avaa päivä Push' }).click()
  await expect(page.getByRole('heading', { name: 'Push', level: 1 })).toBeVisible()

  await page.getByRole('button', { name: 'Lisää liike' }).click()
  await page.getByPlaceholder('Esim. penkki').fill('Sivunostot')
  await page.locator('[role="dialog"] li').first().click()
  await page.keyboard.press('Escape')
  await expect(page.getByText('2 liikettä')).toBeVisible()

  // Päiväkohtainen tavoite ohittaa liikkeen oletuksen.
  await page.getByRole('button', { name: /^Muokkaa tavoitteita: Penkkipunnerrus/ }).click()
  const sets = page.getByRole('spinbutton', { name: 'Tavoitesarjat' })
  await expect(sets).toBeVisible()
  await page.getByRole('button', { name: 'Lisää: Tavoitesarjat' }).click()
  await page.getByRole('button', { name: 'Tallenna' }).click()
  await expect(page.getByText(/4 × /)).toBeVisible()

  // Arvo säilyy sivun päivityksen yli (autosave).
  await page.reload()
  await expect(page.getByText(/4 × /)).toBeVisible()
})

test('oman liikkeen luonti validoi nimen', async ({ page }) => {
  await completeOnboarding(page)
  await page.goto('/#/exercises')
  await page.getByRole('button', { name: 'Uusi liike' }).click()

  const dialog = page.locator('[role="dialog"]')
  await dialog.getByRole('button', { name: 'Luo liike' }).click()
  await expect(dialog.getByText('Anna liikkeelle nimi')).toBeVisible()

  await dialog.getByLabel('Nimi').fill('Penkkipunnerrus')
  await dialog.getByRole('button', { name: 'Luo liike' }).click()
  await expect(dialog.getByText('Samanniminen liike on jo olemassa')).toBeVisible()

  await dialog.getByLabel('Nimi').fill('Oma erikoisliike')
  await dialog.getByRole('button', { name: /^Rinta/ }).first().click()
  await dialog.getByRole('button', { name: 'Luo liike' }).click()
  await expect(page.getByRole('heading', { name: 'Oma erikoisliike', level: 1 })).toBeVisible()
})
