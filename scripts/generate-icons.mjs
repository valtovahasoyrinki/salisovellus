/**
 * Rasteroi SVG-ikonit PNG:ksi Chromiumilla (Playwright on jo kehitysriippuvuus).
 * Ei verkkoa, ei ulkoisia kuvapalveluita – ikonit syntyvät omasta SVG:stä.
 *
 * Aja: npm run icons
 */
import { readFile, writeFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'

const TARGETS = [
  { source: 'icon.svg', out: 'icon-192.png', size: 192 },
  { source: 'icon.svg', out: 'icon-512.png', size: 512 },
  { source: 'icon.svg', out: 'apple-touch-icon.png', size: 180 },
  { source: 'maskable.svg', out: 'maskable-512.png', size: 512 },
]

/*
  iOS ei käytä manifestin tietoja käynnistyskuvaan, vaan vaatii oman
  apple-touch-startup-image -kuvan laitteen tarkassa pikselikoossa.
  Kohdelaite on iPhone 12 (390 × 844 @3x).
*/
const SPLASH = { out: 'splash-1170x2532.png', width: 1170, height: 2532, icon: 320 }

const browser = await chromium.launch()
try {
  for (const target of TARGETS) {
    const svg = await readFile(new URL(`../public/icons/${target.source}`, import.meta.url), 'utf8')
    const page = await browser.newPage({
      viewport: { width: target.size, height: target.size },
      deviceScaleFactor: 1,
    })
    await page.setContent(
      `<html><body style="margin:0;background:#000"><div style="width:${target.size}px;height:${target.size}px">${svg.replace(/width="512" height="512"/, `width="${target.size}" height="${target.size}"`)}</div></body></html>`,
    )
    const buffer = await page.screenshot({ omitBackground: false })
    await writeFile(new URL(`../public/icons/${target.out}`, import.meta.url), buffer)
    await page.close()
    console.log(`${target.out} (${target.size}px)`)
  }
  const page = await browser.newPage({
    viewport: { width: SPLASH.width, height: SPLASH.height },
    deviceScaleFactor: 1,
  })
  const svg = await readFile(new URL('../public/icons/icon.svg', import.meta.url), 'utf8')
  await page.setContent(
    `<html><body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center;height:${SPLASH.height}px">` +
      `<div style="width:${SPLASH.icon}px;height:${SPLASH.icon}px">${svg.replace(/width="512" height="512"/, `width="${SPLASH.icon}" height="${SPLASH.icon}"`)}</div>` +
      '</body></html>',
  )
  const buffer = await page.screenshot()
  await writeFile(new URL(`../public/icons/${SPLASH.out}`, import.meta.url), buffer)
  await page.close()
  console.log(`${SPLASH.out} (${SPLASH.width}×${SPLASH.height})`)
} finally {
  await browser.close()
}
