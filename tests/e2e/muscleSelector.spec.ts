import { expect, test, type Page } from '@playwright/test'
import { completeOnboarding, showBackView, tapMuscle } from './helpers'

/**
 * Lihaskartan valitsin (korjauskierros 1, osio 3.4). Hyväksymiskriteeri:
 * jokaisen 18 lihaksen muodon keskikohdan napautus valitsee oikean lihaksen
 * sekä 360 × 800 että 390 × 844 -kokoisella ruudulla.
 */

/** Edestä näkyvät lihakset: `data-muscle` ja suomenkielinen nimi. */
const FRONT: Array<[string, string]> = [
  ['traps', 'Epäkäs'],
  ['side_delts', 'Sivuolkapää'],
  ['front_delts', 'Etuolkapää'],
  ['chest', 'Rinta'],
  ['biceps', 'Hauis'],
  ['forearms', 'Kyynärvarsi'],
  ['abs', 'Vatsa'],
  ['obliques', 'Vinot vatsalihakset'],
  ['quads', 'Etureisi'],
  ['adductors', 'Lähentäjät'],
  ['calves', 'Pohje'],
]

/** Vain takaa näkyvät lihakset (epäkäs, kyynärvarsi ja pohje testattiin edestä). */
const BACK: Array<[string, string]> = [
  ['rear_delts', 'Takaolkapää'],
  ['upper_back', 'Yläselkä'],
  ['lats', 'Leveä selkälihas'],
  ['triceps', 'Ojentaja'],
  ['lower_back', 'Alaselkä'],
  ['glutes', 'Pakara'],
  ['hamstrings', 'Takareisi'],
]

/** Avaa kirjaston "Uusi liike" -lomakkeen, jossa valitsin on isona. */
async function openForm(page: Page): Promise<void> {
  await page.goto('/#/exercises')
  await page.getByRole('button', { name: 'Uusi liike' }).first().click()
  await expect(page.getByRole('tab', { name: 'Edestä' })).toBeVisible()
}

for (const size of [
  { width: 360, height: 800 },
  { width: 390, height: 844 },
]) {
  test(`kaikki 18 lihasta valittavissa kartalta ${size.width}×${size.height}`, async ({ page }) => {
    test.setTimeout(150_000)
    await page.setViewportSize(size)
    await completeOnboarding(page, [['Push', ['Penkkipunnerrus']]])
    await openForm(page)

    for (const [muscle, label] of FRONT) {
      await tapMuscle(page, muscle)
      await expect(
        page.getByRole('button', { name: `Poista ${label}`, exact: true }),
        `${muscle} edestä`,
      ).toBeVisible()
    }

    await showBackView(page)
    for (const [muscle, label] of BACK) {
      await tapMuscle(page, muscle)
      await expect(
        page.getByRole('button', { name: `Poista ${label}`, exact: true }),
        `${muscle} takaa`,
      ).toBeVisible()
    }

    // 18 lihasta valittuna, jokainen ensisijaisena.
    const chips = page.getByRole('button', { name: /^Poista / })
    await expect(chips).toHaveCount(18)
    await expect(chips.first()).toContainText('ensisijainen')
  })
}

test('napautus kiertää tilan ja sirusta voi poistaa valinnan', async ({ page }) => {
  await completeOnboarding(page, [['Push', ['Penkkipunnerrus']]])
  await openForm(page)

  await tapMuscle(page, 'chest')
  await expect(page.getByRole('button', { name: 'Poista Rinta', exact: true })).toContainText(
    'ensisijainen',
  )

  await tapMuscle(page, 'chest')
  await expect(page.getByRole('button', { name: 'Poista Rinta', exact: true })).toContainText(
    'toissijainen',
  )

  await tapMuscle(page, 'chest')
  await expect(page.getByRole('button', { name: 'Poista Rinta', exact: true })).toBeHidden()

  // Peilattu puoli valitsee saman lihaksen.
  const mirrored = page.locator('[data-muscle="chest"]').last()
  const box = await mirrored.boundingBox()
  if (box === null) throw new Error('Peilattua rintamuotoa ei löytynyt')
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  await expect(page.getByRole('button', { name: 'Poista Rinta', exact: true })).toBeVisible()

  // Sirusta poisto.
  await page.getByRole('button', { name: 'Poista Rinta', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Poista Rinta', exact: true })).toBeHidden()
})

test('varapolku: lihakset voi valita listasta', async ({ page }) => {
  await completeOnboarding(page, [['Push', ['Penkkipunnerrus']]])
  await openForm(page)

  await page.getByRole('button', { name: /Valitse listasta/ }).click()
  const group = page.getByRole('group', { name: 'Ensisijaiset lihasryhmät' }).first()
  await group.getByRole('button', { name: 'Pakara', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Poista Pakara', exact: true })).toContainText(
    'ensisijainen',
  )

  const secondary = page.getByRole('group', { name: 'Toissijaiset lihasryhmät' }).first()
  await secondary.getByRole('button', { name: 'Pakara', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Poista Pakara', exact: true })).toContainText(
    'toissijainen',
  )
})
