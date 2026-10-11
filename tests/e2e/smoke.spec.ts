import { expect, test } from '@playwright/test'
import { completeOnboarding } from './helpers'

/**
 * Savutesti: sovellus käynnistyy, ohjaa ensimmäisellä kerralla käyttöönottoon,
 * navigaatio toimii ja service worker precachettaa sovelluksen niin, että se
 * avautuu lentotilassa (SPEC §4, §8).
 */
test('ensimmäinen avaus ohjaa käyttöönottoon', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/#\/onboarding$/)
  await expect(page.getByRole('heading', { name: 'Salisovellus', level: 1 })).toBeVisible()
})

test('navigaatio vie jokaiseen päänäkymään', async ({ page }) => {
  await completeOnboarding(page)

  const nav = page.getByRole('navigation', { name: 'Päänavigaatio' })
  for (const [label, heading] of [
    ['Historia', 'Historia'],
    ['Analyysi', 'Analyysi'],
    ['Ohjelma', 'Ohjelma'],
  ]) {
    await nav.getByRole('link', { name: label }).click()
    await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible()
  }

  await nav.getByRole('link', { name: 'Koti' }).click()
  await expect(page).toHaveURL(/#\/$/)
  await expect(page.getByRole('heading', { name: 'Salisovellus', level: 1 })).toBeVisible()
})

test('sovellus avautuu offline-tilassa service workerin precachesta', async ({ page, context }) => {
  await page.goto('/')
  await page.waitForFunction(
    async () => {
      const registration = await navigator.serviceWorker.getRegistration()
      return registration?.active?.state === 'activated'
    },
    undefined,
    { timeout: 30_000 },
  )
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, undefined, {
    timeout: 30_000,
  })

  await context.setOffline(true)
  await page.reload()
  // Sovellusrunko latautuu precachesta myös ilman verkkoa.
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await context.setOffline(false)
})
