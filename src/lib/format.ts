/** Numeroiden ja tekstien muotoilu fi-FI-asuun (desimaalipilkku, kg). */

const weightFormatter = new Intl.NumberFormat('fi-FI', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})
const integerFormatter = new Intl.NumberFormat('fi-FI', { maximumFractionDigits: 0 })
const percentFormatter = new Intl.NumberFormat('fi-FI', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})
const setsFormatter = new Intl.NumberFormat('fi-FI', { maximumFractionDigits: 1 })

/** "82,5" */
export function formatNumber(value: number): string {
  return weightFormatter.format(value)
}

/** "82,5 kg" */
export function formatWeight(value: number): string {
  return `${weightFormatter.format(value)} kg`
}

/** "+2,5 kg" / "−2,5 kg" (oikea miinusmerkki) */
export function formatWeightDelta(value: number): string {
  if (value === 0) return '±0 kg'
  const sign = value > 0 ? '+' : '−'
  return `${sign}${weightFormatter.format(Math.abs(value))} kg`
}

/** "+1 toisto" / "+3 toistoa" */
export function formatRepsDelta(value: number): string {
  if (value === 0) return '±0 toistoa'
  const sign = value > 0 ? '+' : '−'
  const abs = Math.abs(value)
  return `${sign}${integerFormatter.format(abs)} ${abs === 1 ? 'toisto' : 'toistoa'}`
}

/** "12 450 kg" */
export function formatVolume(value: number): string {
  return `${integerFormatter.format(Math.round(value))} kg`
}

/** "+4,1 %" */
export function formatPercentDelta(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '±'
  return `${sign}${percentFormatter.format(Math.abs(value))} %`
}

/** "14,5" (viikkosarjat voivat olla puolikkaita) */
export function formatSets(value: number): string {
  return setsFormatter.format(value)
}

/** "6–10" */
export function formatRepRange(range: { min: number; max: number }): string {
  return range.min === range.max ? `${range.min}` : `${range.min}–${range.max}`
}

/**
 * Painon jäsennys käyttäjän syötteestä: pilkku ja piste käyvät molemmat,
 * välilyönnit ja "kg" siivotaan. Virheellinen syöte palauttaa null.
 */
export function parseDecimal(input: string): number | null {
  const cleaned = input
    .replace(/\s| /g, '')
    .replace(/kg$/i, '')
    .replace('−', '-')
    .replace(',', '.')
  if (cleaned === '' || cleaned === '-') return null
  const value = Number(cleaned)
  return Number.isFinite(value) ? value : null
}

/** Pyöristys lähimpään 0,25 kg:aan – levypainojen tarkkuus riittää. */
export function roundWeight(value: number): number {
  return Math.round(value * 4) / 4
}

/** "3 sarjaa" / "1 sarja" */
export function formatSetCount(count: number): string {
  return `${integerFormatter.format(count)} ${count === 1 ? 'sarja' : 'sarjaa'}`
}

/** "4 treeniä" / "1 treeni" */
export function formatWorkoutCount(count: number): string {
  return `${integerFormatter.format(count)} ${count === 1 ? 'treeni' : 'treeniä'}`
}
