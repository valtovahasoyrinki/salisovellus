import { expect, test } from '@playwright/test'

/**
 * Savutesti perustalle: sovellus käynnistyy, navigaatio toimii ja
 * service worker precachettaa sovelluksen niin, että se avautuu lentotilassa
 * (SPEC §4, §8).
 */
test('sovellus käynnistyy ja navigaatio toimii', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Koti', level: 1 })).toBeVisible()

  const nav = page.getByRole('navigation', { name: 'Päänavigaatio' })
  for (const label of ['Historia', 'Analyysi', 'Ohjelma']) {
    await nav.getByRole('link', { name: label }).click()
    await expect(page.getByRole('heading', { name: label, level: 1 })).toBeVisible()
  }
  await nav.getByRole('link', { name: 'Koti' }).click()
  await expect(page).toHaveURL(/#\/$/)
})

test('sovellus avautuu offline-tilassa service workerin precachesta', async ({ page, context }) => {
  await page.goto('/')
  await page.waitForFunction(async () => {
    const registration = await navigator.serviceWorker.getRegistration()
    return registration?.active?.state === 'activated'
  }, undefined, { timeout: 30_000 })
  // Precache valmistuu aktivoinnin jälkeen; varmistetaan vielä ohjaus.
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, undefined, {
    timeout: 30_000,
  })

  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Koti', level: 1 })).toBeVisible()
  await context.setOffline(false)
})
