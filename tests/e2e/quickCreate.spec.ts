import { expect, test, type Page } from '@playwright/test'
import { completeOnboarding, showBackView, tapMuscle, waitForScrollEnd } from './helpers'

/**
 * Oman liikkeen pikaluonti kesken treenin ja ohjelman päivässä
 * (korjauskierros 1, osio 3.5). Tärkein vaatimus: treeni ei katkea.
 */

/** Avaa treenin liikevalitsimen ja siirtyy pikalomakkeelle hakusanalla. */
async function openQuickForm(page: Page, query: string): Promise<void> {
  await page.getByRole('button', { name: 'Lisää liike' }).last().click()
  await page.getByPlaceholder('Esim. penkki').fill(query)
  await page.getByRole('button', { name: /Luo uusi liike/ }).click()
  await expect(page.getByLabel('Nimi')).toBeVisible()
}

/** Liikekortti nimen perusteella, jotta sarjapainikkeet osuvat oikeaan korttiin. */
function card(page: Page, name: string) {
  return page.locator('li').filter({ has: page.getByRole('heading', { name, exact: true }) })
}

test('kesken treenin luotu liike lisätään heti treeniin eikä kirjaus katkea', async ({ page }) => {
  await completeOnboarding(page, [['Push', ['Penkkipunnerrus']]])
  await page.getByRole('button', { name: /^Aloita Push/ }).click()

  // Yksi sarja kirjattuna ennen luontia: se ei saa kadota.
  await page.getByRole('button', { name: 'Kuittaa sarja 1' }).first().click()
  await expect(page.getByText(/1\/3 sarjaa/).first()).toBeVisible()

  await openQuickForm(page, 'pec dec')
  await expect(page.getByLabel('Nimi')).toHaveValue('Pec dec')

  // Lihakset kartalta ja väline siruista.
  await tapMuscle(page, 'chest')
  await page.getByRole('button', { name: 'Laite', exact: true }).click()
  await page.getByRole('button', { name: 'Luo ja lisää treeniin' }).click()

  await expect(page.getByText(/Pec dec luotu ja lisätty treeniin/)).toBeVisible()
  // Paneeli sulkeutui ja kortti on treenissä.
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page.getByRole('heading', { name: 'Pec dec', exact: true })).toBeVisible()

  // Aiemmin kirjattu sarja on tallella ja uuteen liikkeeseen voi kirjata heti.
  await waitForScrollEnd(page)
  await card(page, 'Pec dec').getByRole('button', { name: 'Kuittaa sarja 1' }).click()
  await expect(card(page, 'Pec dec').getByText(/1\/\d+ sarjaa/).first()).toBeVisible()

  // Sivun päivitys kesken treenin ei hukkaa kirjauksia (autosave).
  await page.reload()
  await expect(card(page, 'Pec dec').getByText(/1\/\d+ sarjaa/).first()).toBeVisible()
  await expect(page.getByText(/2\/\d+ sarjaa/).first()).toBeVisible()

  // Liike on tavallinen oma liike: se löytyy kirjastosta jälkikäteen.
  await page.goto('/#/exercises')
  await page.getByPlaceholder('Esim. kyykky').fill('pec dec')
  await expect(page.getByRole('link', { name: /Pec dec/ }).first()).toBeVisible()
})

test('"Lisää myös ohjelmaan" vie luodun liikkeen myös ohjelman päivään', async ({ page }) => {
  await completeOnboarding(page, [['Push', ['Penkkipunnerrus']]])
  await page.getByRole('button', { name: /^Aloita Push/ }).click()

  await page.getByRole('button', { name: 'Lisää liike' }).last().click()
  await page.getByRole('switch', { name: 'Lisää liike myös ohjelman treenipäivään' }).click()
  await page.getByPlaceholder('Esim. penkki').fill('kahvakuula heiluri')
  await page.getByRole('button', { name: /Luo uusi liike/ }).click()
  await showBackView(page)
  await tapMuscle(page, 'glutes')
  await page.getByRole('button', { name: 'Muu', exact: true }).click()
  await page.getByRole('button', { name: 'Luo ja lisää treeniin' }).click()
  await expect(page.getByRole('heading', { name: 'Kahvakuula heiluri' })).toBeVisible()

  await page.goto('/#/program')
  await page.getByRole('button', { name: 'Avaa päivä Push' }).click()
  await expect(page.getByText('Kahvakuula heiluri')).toBeVisible()
})

test('kaksoiskappalevaroitus tarjoaa olemassa olevaa liikettä', async ({ page }) => {
  await completeOnboarding(page, [['Push', ['Penkkipunnerrus']]])
  await page.getByRole('button', { name: /^Aloita Push/ }).click()

  await openQuickForm(page, 'peck deck')
  await expect(page.getByText(/Kirjastossa on jo/)).toBeVisible()
  await expect(
    page.locator('form').getByText('Vipunosto rintaliikelaitteessa'),
  ).toBeVisible()

  await page.getByRole('button', { name: 'Käytä tätä' }).click()
  await expect(page.getByText(/Vipunosto rintaliikelaitteessa lisätty treeniin/)).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Vipunosto rintaliikelaitteessa' }),
  ).toBeVisible()
  // Kaksoiskappaletta ei syntynyt.
  await expect(page.getByRole('heading', { name: 'Peck deck' })).toBeHidden()
})

test('paneelin sulkeminen kesken lomakkeen ei luo liikettä', async ({ page }) => {
  await completeOnboarding(page, [['Push', ['Penkkipunnerrus']]])
  await page.getByRole('button', { name: /^Aloita Push/ }).click()

  await openQuickForm(page, 'turha liike')
  await tapMuscle(page, 'chest')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()

  await page.goto('/#/exercises')
  await page.getByPlaceholder('Esim. kyykky').fill('turha')
  await expect(page.getByText('Ei osumia')).toBeVisible()
})

test('takaisin-nuoli palaa hakuun hakusana tallessa', async ({ page }) => {
  await completeOnboarding(page, [['Push', ['Penkkipunnerrus']]])
  await page.getByRole('button', { name: /^Aloita Push/ }).click()

  await openQuickForm(page, 'pendlay')
  await page.getByRole('button', { name: 'Takaisin hakuun' }).click()
  await expect(page.getByPlaceholder('Esim. penkki')).toHaveValue('pendlay')
  await expect(page.getByLabel('Nimi')).toBeHidden()
})

test('ohjelman päivässä voi luoda liikkeen suoraan', async ({ page }) => {
  await completeOnboarding(page, [['Push', ['Penkkipunnerrus']]])

  await page.goto('/#/program')
  await page.getByRole('button', { name: 'Avaa päivä Push' }).click()
  await page.getByRole('button', { name: 'Lisää liike' }).first().click()
  await page.getByPlaceholder('Esim. penkki').fill('oma rintaliike')
  await page.getByRole('button', { name: /Luo uusi liike/ }).click()
  await tapMuscle(page, 'chest')
  await page.getByRole('button', { name: 'Luo ja lisää päivään' }).click()

  await expect(page.getByText(/Oma rintaliike luotu ja lisätty päivään/)).toBeVisible()
  await expect(
    page.getByRole('button', { name: /^Muokkaa tavoitteita: Oma rintaliike/ }),
  ).toBeVisible()
})

test('pikaluonti toimii ilman verkkoa', async ({ page, context }) => {
  await completeOnboarding(page, [['Push', ['Penkkipunnerrus']]])

  // Service worker on rekisteröity ja precache valmis ennen katkaisua.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await context.setOffline(true)
  await page.reload()

  await page.getByRole('button', { name: /^Aloita Push/ }).click()
  await openQuickForm(page, 'offline liike')
  await tapMuscle(page, 'abs')
  await page.getByRole('button', { name: 'Kehonpaino', exact: true }).click()
  await page.getByRole('button', { name: 'Luo ja lisää treeniin' }).click()

  await expect(page.getByRole('heading', { name: 'Offline liike' })).toBeVisible()
  await context.setOffline(false)
})
