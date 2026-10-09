/**
 * Täyttää selaimen IndexedDB:n käyttöliittymän kautta kuvakaappauksia ja
 * manuaalista tarkistusta varten: käyttöönotto läpi ja liikkeet kolmeen
 * päivään. Ei tuotantokoodia – kehitystyökalu.
 *
 * Viedään funktiona, jotta kuvakaappausskripti voi käyttää samaa polkua.
 */
export async function seedViaUi(page, baseUrl) {
  const PLAN = [
    ['Push', ['Penkkipunnerrus', 'Pystypunnerrus', 'Vinopenkkipunnerrus käsipainoilla', 'Sivunostot']],
    ['Pull', ['Kulmasoutu', 'Leuanveto', 'Ylätalja', 'Hammerkääntö']],
    ['Legs', ['Takakyykky', 'Romanialainen maastaveto', 'Jalkaprässi', 'Pohjenousu']],
  ]

  await page.goto(`${baseUrl}/#/onboarding`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Aloita' }).click()
  await page.waitForTimeout(400)
  await page.getByRole('button', { name: 'Valitse liikkeet' }).click()
  await page.waitForTimeout(400)

  for (const [day, exercises] of PLAN) {
    await page.getByRole('button', { name: day, exact: true }).click()
    await page.waitForTimeout(200)
    await page.getByRole('button', { name: 'Lisää liike' }).click()
    await page.waitForTimeout(300)
    for (const name of exercises) {
      const search = page.getByPlaceholder('Esim. penkki')
      await search.fill(name)
      await page.waitForTimeout(250)
      const row = page
        .locator('[role="dialog"] li', { has: page.getByText(name, { exact: true }) })
        .first()
      await row.click({ timeout: 5000 }).catch(() => {})
      await page.waitForTimeout(150)
    }
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
  }

  await page.getByRole('button', { name: 'Valmis' }).click()
  await page.waitForTimeout(600)
}
