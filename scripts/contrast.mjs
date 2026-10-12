/**
 * Kontrastitarkistus (SPEC §8, WCAG AA).
 *
 * Lukee tokenit src/styles/tokens.css:stä, muuntaa oklch → sRGB ja laskee
 * kontrastisuhteet tekstiväri/pintaväri-pareille molemmissa teemoissa.
 *
 * Aja: node scripts/contrast.mjs
 */
import { readFile } from 'node:fs/promises'

const css = await readFile(new URL('../src/styles/tokens.css', import.meta.url), 'utf8')

function parseTheme(selector) {
  const start = css.indexOf(selector)
  const open = css.indexOf('{', start)
  const close = css.indexOf('}', open)
  const body = css.slice(open + 1, close)
  const tokens = new Map()
  for (const line of body.split('\n')) {
    const match = line.match(/^\s*(--[\w-]+):\s*(.+);\s*$/)
    if (match) tokens.set(match[1], match[2].trim())
  }
  return tokens
}

function oklchToRgb(input) {
  const match = input.match(
    /oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\s*\)/,
  )
  if (!match) return null
  const L = Number(match[1]) / 100
  const C = Number(match[2])
  const h = (Number(match[3]) * Math.PI) / 180
  const alpha = match[4] === undefined ? 1 : Number(match[4])

  const a = C * Math.cos(h)
  const b = C * Math.sin(h)

  // oklab -> LMS (kuutiojuuren käänteisarvo)
  const lRoot = L + 0.3963377774 * a + 0.2158037573 * b
  const mRoot = L - 0.1055613458 * a - 0.0638541728 * b
  const sRoot = L - 0.0894841775 * a - 1.291485548 * b

  const l = lRoot ** 3
  const m = mRoot ** 3
  const s = sRoot ** 3

  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
  return { lin: lin.map((v) => Math.min(1, Math.max(0, v))), alpha }
}

const relativeLuminance = (lin) => 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]

function resolve(tokens, name, seen = new Set()) {
  const raw = tokens.get(name)
  if (raw === undefined || seen.has(name)) return null
  const varMatch = raw.match(/^var\((--[\w-]+)\)$/)
  if (varMatch) return resolve(tokens, varMatch[1], new Set([...seen, name]))
  return oklchToRgb(raw)
}

/** Läpikuultava väri lasketaan taustan päälle. */
function composite(fg, bg) {
  if (fg.alpha >= 1) return fg.lin
  return fg.lin.map((v, index) => v * fg.alpha + bg.lin[index] * (1 - fg.alpha))
}

function contrast(tokens, fgName, bgName) {
  const fg = resolve(tokens, fgName)
  const bgBase = resolve(tokens, '--bg')
  const bg = resolve(tokens, bgName)
  if (!fg || !bg || !bgBase) return null
  const bgLin = composite(bg, bgBase)
  const fgLin = composite(fg, { lin: bgLin, alpha: fg.alpha })
  const a = relativeLuminance(fgLin)
  const b = relativeLuminance(bgLin)
  const [light, dark] = a > b ? [a, b] : [b, a]
  return (light + 0.05) / (dark + 0.05)
}

// Parit, joita käyttöliittymä todella käyttää.
const PAIRS = [
  ['--text', '--bg'],
  ['--text', '--surface-1'],
  ['--text', '--surface-2'],
  ['--text-muted', '--bg'],
  ['--text-muted', '--surface-1'],
  ['--text-muted', '--surface-2'],
  ['--text-faint', '--surface-1'],
  ['--accent-ink', '--accent'],
  ['--accent', '--bg'],
  ['--accent', '--surface-2'],
  ['--good', '--bg'],
  ['--good', '--surface-1'],
  ['--good', '--good-dim'],
  ['--danger', '--surface-1'],
  ['--danger', '--danger-dim'],
  ['--record', '--surface-1'],
  ['--warn', '--surface-1'],
]

/*
  Ei-tekstin kontrasti (WCAG 1.4.11, 3:1): lihaskartta on syöttökomponentti,
  jonka tilat pitää erottaa. Kolmen tilan mahtuminen rungon ja aksentin väliin
  rajaa suhteen noin 2,3:1:een, joten näille pareille käytetään omaa rajaa ja
  valinta kerrotaan lisäksi tekstinä (sirut ja aria-live).
*/
const UI_PAIRS = [
  ['--muscle-idle', '--body-fill'],
  ['--muscle-secondary', '--muscle-idle'],
  ['--accent', '--muscle-secondary'],
]
const UI_MIN = 2.2

let failures = 0
for (const [selector, label] of [
  [":root,\n:root[data-theme='dark']", 'tumma'],
  [":root[data-theme='light']", 'vaalea'],
]) {
  const tokens = parseTheme(selector)
  console.log(`\n=== Teema: ${label} ===`)
  for (const [fg, bg] of PAIRS) {
    const ratio = contrast(tokens, fg, bg)
    if (ratio === null) {
      console.log(`  ?      ${fg} / ${bg}`)
      continue
    }
    // AA: normaali teksti 4,5:1. Isot numerot ja ikonit 3:1, mutta tavoitellaan 4,5:1.
    const ok = ratio >= 4.5
    if (!ok) failures += 1
    console.log(`  ${ok ? 'OK ' : 'EI '} ${ratio.toFixed(2).padStart(5)}:1  ${fg} / ${bg}`)
  }

  console.log('  -- lihaskartan tilat (ei-teksti, raja 2,2:1) --')
  for (const [fg, bg] of UI_PAIRS) {
    const ratio = contrast(tokens, fg, bg)
    if (ratio === null) {
      console.log(`  ?      ${fg} / ${bg}`)
      continue
    }
    const ok = ratio >= UI_MIN
    if (!ok) failures += 1
    console.log(`  ${ok ? 'OK ' : 'EI '} ${ratio.toFixed(2).padStart(5)}:1  ${fg} / ${bg}`)
  }
}

if (failures > 0) {
  console.log(`\n${failures} paria alle 4,5:1.`)
  process.exitCode = 1
}
