import { describe, expect, it } from 'vitest'
import {
  formatPercentDelta,
  formatRepRange,
  formatRepsDelta,
  formatSets,
  formatVolume,
  formatWeight,
  formatWeightDelta,
  parseDecimal,
  roundWeight,
} from './format'

/** fi-FI käyttää tuhaterottimena sitovaa välilyöntiä (U+00A0). */
const NBSP = '\u00a0'

describe('numeroiden muotoilu fi-FI', () => {
  it('paino käyttää desimaalipilkkua', () => {
    expect(formatWeight(82.5)).toBe('82,5 kg')
    expect(formatWeight(100)).toBe('100 kg')
    expect(formatWeight(-2.5)).toBe('−2,5 kg')
  })

  it('muutokset näytetään etumerkillä', () => {
    expect(formatWeightDelta(2.5)).toBe('+2,5 kg')
    expect(formatWeightDelta(-2.5)).toBe('−2,5 kg')
    expect(formatWeightDelta(0)).toBe('±0 kg')
    expect(formatRepsDelta(1)).toBe('+1 toisto')
    expect(formatRepsDelta(3)).toBe('+3 toistoa')
    expect(formatPercentDelta(4.13)).toBe('+4,1 %')
    expect(formatPercentDelta(0)).toBe('±0,0 %')
  })

  it('volyymi ja sarjamäärät pyöristetään järkevästi', () => {
    expect(formatVolume(12_450.4)).toBe(`12${NBSP}450 kg`)
    expect(formatSets(14.5)).toBe('14,5')
    expect(formatRepRange({ min: 6, max: 10 })).toBe('6–10')
    expect(formatRepRange({ min: 8, max: 8 })).toBe('8')
  })
})

describe('painon jäsennys syötteestä', () => {
  it('pilkku ja piste käyvät molemmat', () => {
    expect(parseDecimal('82,5')).toBe(82.5)
    expect(parseDecimal('82.5')).toBe(82.5)
    expect(parseDecimal(' 82,5 kg ')).toBe(82.5)
  })

  it('negatiivinen lisäpaino avustetuissa liikkeissä kelpaa', () => {
    expect(parseDecimal('-15')).toBe(-15)
    expect(parseDecimal('−15')).toBe(-15)
  })

  it('kelvoton syöte palauttaa null', () => {
    expect(parseDecimal('')).toBeNull()
    expect(parseDecimal('abc')).toBeNull()
    expect(parseDecimal('-')).toBeNull()
  })

  it('pyöristys lähimpään 0,25 kg:aan', () => {
    expect(roundWeight(82.6)).toBe(82.5)
    expect(roundWeight(82.63)).toBe(82.75)
  })
})
