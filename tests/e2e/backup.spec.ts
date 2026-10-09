import { readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { completeOnboarding } from './helpers'

/**
 * Vienti ja tuonti (SPEC §6.10, §8): vienti → tuonti säilyttää datan
 * identtisenä. Tämä on sovelluksen kriittisin polku, koska data on vain
 * puhelimessa.
 */
test('vienti ja tuonti säilyttävät datan identtisenä', async ({ page }) => {
  /*
    Safari tukee Web Share APIa tiedostoille, joten jako avaisi järjestelmän
    jakoikkunan eikä lataustapahtumaa syntyisi. Testissä jako kytketään pois,
    jolloin kaikilla selaimilla kulkee sama latausvarapolku. Jaon kutsuminen
    testataan erikseen alempana.
  */
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true })
    Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true })
  })

  await completeOnboarding(page, [['Push', ['Penkkipunnerrus']]])

  // Kirjataan treeni, jotta vietävää dataa on.
  await page.getByRole('button', { name: /^Aloita Push/ }).click()
  await page.getByRole('button', { name: 'Kuittaa 1' }).first().click()
  await page.getByRole('button', { name: 'Kuittaa 2' }).first().click()
  await page.getByRole('button', { name: 'Päätä', exact: true }).click()
  await page.getByRole('button', { name: 'Päätä treeni' }).click()
  await page.getByRole('button', { name: 'Valmis' }).click()

  /**
   * Tilannekuva kannasta vertailua varten. Luetaan suoraan IndexedDB:stä,
   * koska testi ajetaan tuotantonipulla, jossa moduulipolkuja ei ole.
   */
  const snapshot = async (): Promise<unknown> =>
    page.evaluate(async () => {
      const request = indexedDB.open('salisovellus')
      const database = await new Promise<IDBDatabase>((resolve) => {
        request.addEventListener('success', () => resolve(request.result))
      })
      const readAll = (store: string): Promise<unknown[]> =>
        new Promise((resolve) => {
          const query = database.transaction(store).objectStore(store).getAll()
          query.addEventListener('success', () => resolve(query.result as unknown[]))
        })
      const sorted = async (store: string): Promise<unknown[]> => {
        const rows = (await readAll(store)) as Array<{ id: string }>
        return [...rows].sort((a, b) => a.id.localeCompare(b.id))
      }
      const result = {
        exercises: await sorted('exercises'),
        sessions: await sorted('sessions'),
        sets: await sorted('setEntries'),
        days: await sorted('workoutDays'),
        dayExercises: await sorted('dayExercises'),
      }
      database.close()
      return result
    })

  const before = await snapshot()

  // Vienti: ladataan tiedosto levylle.
  await page.goto('/#/settings/backup')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Vie JSON ja jaa' }).click()
  const download = await downloadPromise
  const file = join(tmpdir(), `salisovellus-e2e-${Date.now()}.json`)
  await download.saveAs(file)

  const exported = JSON.parse(await readFile(file, 'utf8')) as { data: { sessions: unknown[] } }
  expect(exported.data.sessions).toHaveLength(1)

  // Kaiken datan poisto asetuksista (kaksoisvahvistus).
  await page.goto('/#/settings')
  await page.getByRole('button', { name: 'Poista kaikki data' }).click()
  await page.getByRole('button', { name: 'Jatka' }).click()
  await page.getByRole('button', { name: 'Poista kaikki', exact: true }).click()
  await expect(page).toHaveURL(/#\/onboarding$/)

  // Tuonti takaisin korvaavana.
  await page.goto('/#/settings/backup')
  await page.getByRole('button', { name: 'Tuo JSON' }).click()
  await page.locator('input[type="file"]').setInputFiles(file)
  await expect(page.getByText('Tuotavan tiedoston sisältö')).toBeVisible()
  await expect(page.getByText(/1 treeniä/)).toBeVisible()
  await page.getByRole('button', { name: 'Korvaa', exact: true }).click()
  await page.getByRole('button', { name: 'Tuo', exact: true }).click()
  // Vahvistusikkunan oma Korvaa-painike (sama nimi kuin esikatselussa).
  await page.getByRole('alertdialog').getByRole('button', { name: 'Korvaa', exact: true }).click()
  await expect(page.getByText(/Tuotu:/)).toBeVisible()

  const after = await snapshot()
  expect(after).toEqual(before)

  // Data näkyy myös käyttöliittymässä.
  await page.goto('/#/history')
  await expect(page.getByRole('link', { name: /Push/ }).first()).toBeVisible()
})

test('vienti käyttää jakoa, kun selain tukee sitä', async ({ page }) => {
  await page.addInitScript(() => {
    const shared: string[] = []
    Object.defineProperty(window, 'sharedFiles', { value: shared, configurable: true })
    Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true })
    Object.defineProperty(navigator, 'share', {
      value: async (data: { files?: File[] }) => {
        shared.push(data.files?.[0]?.name ?? '')
      },
      configurable: true,
    })
  })

  await completeOnboarding(page)
  await page.goto('/#/settings/backup')
  await page.getByRole('button', { name: 'Vie JSON ja jaa' }).click()
  await expect(page.getByText('Varmuuskopio viety')).toBeVisible()

  const shared = await page.evaluate(() => (window as unknown as { sharedFiles: string[] }).sharedFiles)
  expect(shared).toHaveLength(1)
  expect(shared[0]).toMatch(/^salisovellus-\d{4}-\d{2}-\d{2}-\d{4}\.json$/)
})

test('kelvoton tiedosto hylätään selkeällä viestillä', async ({ page }) => {
  await completeOnboarding(page)

  const file = join(tmpdir(), `salisovellus-e2e-invalid-${Date.now()}.json`)
  await writeFile(file, JSON.stringify({ jotain: 'muuta' }))

  await page.goto('/#/settings/backup')
  await page.getByRole('button', { name: 'Tuo JSON' }).click()
  await page.locator('input[type="file"]').setInputFiles(file)
  await expect(page.getByText(/ei ole kelvollinen varmuuskopio/)).toBeVisible()
  await expect(page.getByText('Tuotavan tiedoston sisältö')).toBeHidden()
})
