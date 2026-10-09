import { defineConfig, devices } from '@playwright/test'

/**
 * E2E ajetaan tuotantonipulla (`vite preview`), jotta service worker ja
 * precache ovat mukana – ne ovat osa testattavaa toiminnallisuutta (SPEC §8).
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : [['html', { open: 'never' }], ['list']],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    locale: 'fi-FI',
    timezoneId: 'Europe/Helsinki',
  },
  projects: [
    { name: 'iphone-12', use: { ...devices['iPhone 12'] } },
    { name: 'pixel-5', use: { ...devices['Pixel 5'] } },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    /*
      Ei uudelleenkäyttöä: vanha preview-palvelin tarjoilisi edellisen buildin,
      jolloin testit ajettaisiin eri koodia vasten kuin työpuussa on.
    */
    reuseExistingServer: false,
    timeout: 180_000,
  },
})
