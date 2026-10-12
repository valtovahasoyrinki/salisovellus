import type { Page } from '@playwright/test'

/** Käyttöönotto läpi: liikekirjasto siemennetään ja ohjelma luodaan. */
export async function completeOnboarding(
  page: Page,
  plan: Array<[string, string[]]> = [['Push', ['Penkkipunnerrus', 'Pystypunnerrus']]],
): Promise<void> {
  await page.goto('/#/onboarding')
  await page.getByRole('button', { name: 'Aloita' }).click()
  await page.getByRole('button', { name: 'Valitse liikkeet' }).click()

  for (const [day, exercises] of plan) {
    await page.getByRole('button', { name: day, exact: true }).click()
    await page.getByRole('button', { name: 'Lisää liike' }).click()
    for (const name of exercises) {
      await page.getByPlaceholder('Esim. penkki').fill(name)
      /*
        Täsmällinen osuma ja Playwrightin automaattinen odotus: pelkkä
        ensimmäinen rivi valitsisi "Kapea penkkipunnerrus", jos suodatus ei ole
        vielä ehtinyt päivittyä.
      */
      await page
        .locator('[role="dialog"] li', { has: page.getByText(name, { exact: true }) })
        .first()
        .click()
    }
    await page.keyboard.press('Escape')
  }

  await page.getByRole('button', { name: 'Valmis' }).click()
  await page.waitForURL(/#\/$/)
}

/** Tyhjentää sovelluksen tietokannan, jotta testi alkaa puhtaalta pöydältä. */
export async function resetDatabase(page: Page): Promise<void> {
  await page.goto('/')
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase('salisovellus')
      for (const event of ['success', 'error', 'blocked']) {
        request.addEventListener(event, () => resolve())
      }
    })
  })
  await page.reload()
}

/**
 * Napauttaa lihasmuotoa kartalla sieltä, mistä käyttäjä sitä napauttaisi:
 * pisteestä, joka on **selaimen mukaan** muodon täytön sisällä.
 *
 * Rajauslaatikon keskipiste ei riitä – kaarevalla kaistaleella (hauis, leveä
 * selkälihas) se voi olla muodon ulkopuolella, jopa naapurilihaksen sisällä.
 * Piste etsitään `isPointInFill`-kyselyllä ja muunnetaan ruutukoordinaateiksi
 * elementin omalla matriisilla, joten testi ei nojaa sovelluksen omaan
 * osumalaskentaan. Napautus tehdään hiirellä, koska osuma lasketaan
 * SVG-juuressa koordinaateista eikä päällimmäisestä elementistä.
 */
export async function tapMuscle(page: Page, muscle: string, mirrored = false): Promise<void> {
  const shapes = page.locator(`[data-muscle="${muscle}"]`)
  const shape = mirrored ? shapes.last() : shapes.first()
  await shape.scrollIntoViewIfNeeded()

  const point = await shape.evaluate((element) => {
    const path = element as SVGGeometryElement
    const matrix = path.getScreenCTM()
    if (!matrix) return null

    /*
      Piste pitää olla muodon täytön sisällä eikä minkään päälle piirretyn
      muodon alla – muuten napautus osuisi siihen, minkä käyttäjä näkee päällä
      (hauis on piirretty sivuolkapään päälle).
    */
    const siblings = [
      ...(path.parentElement?.querySelectorAll('[data-muscle]') ?? []),
    ] as SVGGeometryElement[]
    const muscle = path.getAttribute('data-muscle')
    const above = siblings
      .slice(siblings.indexOf(path) + 1)
      .filter((other) => other.getAttribute('data-muscle') !== muscle)

    const box = path.getBBox()
    const fractions = [0.5, 0.4, 0.6, 0.3, 0.7, 0.2, 0.8, 0.1, 0.9]
    for (const fx of fractions) {
      for (const fy of fractions) {
        const candidate = new DOMPoint(box.x + box.width * fx, box.y + box.height * fy)
        if (!path.isPointInFill(candidate)) continue
        if (above.some((other) => other.isPointInFill(candidate))) continue
        const screen = candidate.matrixTransform(matrix)
        return { x: screen.x, y: screen.y }
      }
    }
    return null
  })

  if (point === null) throw new Error(`Lihasmuodon ${muscle} täytöstä ei löytynyt pistettä`)
  await page.mouse.click(point.x, point.y)
}

/** Vaihtaa lihaskartan takanäkymään (selkä, pakarat, takareidet). */
export async function showBackView(page: Page): Promise<void> {
  await page.getByRole('tab', { name: 'Takaa' }).click()
}

/**
 * Odottaa, että sileä vieritys on päättynyt: kesken treenin luotu liike
 * vieritetään näkyviin, ja Playwright voi ehtiä napauttaa vanhaan kohtaan,
 * koska vieritysanimaation alussa kaksi peräkkäistä ruudunpäivitystä voivat
 * näyttää samalta. Tämä odottaa oikeaa signaalia eikä kiinteää viivettä.
 */
export async function waitForScrollEnd(page: Page): Promise<void> {
  await page.waitForFunction(
    () =>
      new Promise<boolean>((resolve) => {
        const start = window.scrollY
        requestAnimationFrame(() =>
          requestAnimationFrame(() => resolve(Math.abs(window.scrollY - start) < 1)),
        )
      }),
  )
}
