import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '@/db/repositories/settingsRepo'
import type { Settings } from '@/domain/types'
import { capitalizeFirst, quickDefaults } from './QuickExerciseForm'
import { validateExerciseForm, type ExerciseFormValues } from './exerciseSchema'

const settings: Settings = {
  ...DEFAULT_SETTINGS,
  defaultRestSec: 120,
  increments: { ...DEFAULT_SETTINGS.increments, machine: 5 },
}

/** Pikalomakkeen arvot: nimi ja lihakset käyttäjältä, loput johdettuina. */
function valuesFor(name: string, overrides: Partial<ExerciseFormValues> = {}): ExerciseFormValues {
  const derived = quickDefaults(overrides.equipment ?? 'machine', settings)
  return {
    name,
    primaryMuscles: ['chest'],
    secondaryMuscles: [],
    equipment: 'machine',
    notes: '',
    ...derived,
    ...overrides,
  }
}

describe('pikalomakkeen nimi', () => {
  it('nostaa ensimmäisen kirjaimen isoksi', () => {
    expect(capitalizeFirst('pec dec')).toBe('Pec dec')
  })

  it('jättää valmiiksi ison kirjaimen ennalleen', () => {
    expect(capitalizeFirst('Pec dec')).toBe('Pec dec')
  })

  it('käsittelee ääkköset ja alkuvälilyönnit', () => {
    expect(capitalizeFirst('  älyvapaa veto')).toBe('Älyvapaa veto')
  })

  it('tyhjä hakusana tuottaa tyhjän nimen', () => {
    expect(capitalizeFirst('   ')).toBe('')
  })
})

describe('pikalomakkeen johdetut oletukset', () => {
  it('ottaa painonlisäyksen asetuksista välineen mukaan', () => {
    expect(quickDefaults('machine', settings).increment).toBe(5)
    expect(quickDefaults('barbell', settings).increment).toBe(
      DEFAULT_SETTINGS.increments.barbell,
    )
  })

  it('ottaa levon asetusten oletuksesta', () => {
    expect(quickDefaults('cable', settings).defaultRestSec).toBe(120)
  })

  it('kehonpaino tuottaa kehonpainotyypin, muut paino × toistot', () => {
    expect(quickDefaults('bodyweight', settings).kind).toBe('bodyweight')
    expect(quickDefaults('dumbbell', settings).kind).toBe('weight_reps')
  })

  it('toistoalue on 8–12', () => {
    const defaults = quickDefaults('machine', settings)
    expect([defaults.repMin, defaults.repMax]).toEqual([8, 12])
  })

  it('puuttuva painonlisäys asetuksissa korvataan välineen oletuksella', () => {
    // Vanhasta varmuuskopiosta tuotu asetusrivi voi olla vajaa.
    const partial = { ...settings, increments: {} } as unknown as Settings
    expect(quickDefaults('barbell', partial).increment).toBeGreaterThan(0)
  })
})

describe('pikalomakkeen validointi', () => {
  it('hyväksyy nimen ja yhden ensisijaisen lihaksen', () => {
    const result = validateExerciseForm(valuesFor('Pec dec'), [])
    expect(result.ok).toBe(true)
  })

  it('vaatii nimen', () => {
    const result = validateExerciseForm(valuesFor('   '), [])
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.name).toBe('Anna liikkeelle nimi')
  })

  it('vaatii vähintään yhden ensisijaisen lihaksen', () => {
    const result = validateExerciseForm(valuesFor('Pec dec', { primaryMuscles: [] }), [])
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.primaryMuscles).toContain('ensisijainen')
  })

  it('hylkää yli 60 merkin nimen', () => {
    const result = validateExerciseForm(valuesFor('P'.repeat(61)), [])
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.name).toBe('Nimi on liian pitkä')
  })

  it('hylkää täsmälleen samannimisen liikkeen kirjainkoosta riippumatta', () => {
    const result = validateExerciseForm(valuesFor('pec dec'), [{ id: 'x', name: 'Pec Dec' }])
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.name).toBe('Samanniminen liike on jo olemassa')
  })

  it('siistii nimen reunavälilyönnit tallennuksessa', () => {
    const result = validateExerciseForm(valuesFor('  Pec dec  '), [])
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.values.name).toBe('Pec dec')
  })
})
