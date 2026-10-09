import { describe, expect, it } from 'vitest'
import { filterExercises } from '@/db/repositories/exerciseRepo'
import type { Exercise } from '@/domain/types'
import { EMPTY_FORM, formFromExercise, validateExerciseForm } from './exerciseSchema'

const existing = [
  { id: 'e1', name: 'Penkkipunnerrus' },
  { id: 'e2', name: 'Takakyykky' },
]

const valid = {
  ...EMPTY_FORM,
  name: 'Kulmasoutu',
  primaryMuscles: ['upper_back' as const],
}

describe('liikelomakkeen validointi', () => {
  it('hyväksyy kelvollisen liikkeen ja siistii välilyönnit', () => {
    const result = validateExerciseForm({ ...valid, name: '  Kulmasoutu  ' }, existing)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.values.name).toBe('Kulmasoutu')
  })

  it('hylkää tyhjän nimen', () => {
    const result = validateExerciseForm({ ...valid, name: '   ' }, existing)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.name).toBe('Anna liikkeelle nimi')
  })

  it('hylkää saman nimen kirjainkoosta riippumatta', () => {
    const result = validateExerciseForm({ ...valid, name: 'penkkiPUNNERRUS' }, existing)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.name).toContain('jo olemassa')
  })

  it('sallii oman nimen säilyttämisen muokkauksessa', () => {
    const result = validateExerciseForm({ ...valid, name: 'Penkkipunnerrus' }, existing, 'e1')
    expect(result.ok).toBe(true)
  })

  it('vaatii vähintään yhden ensisijaisen lihasryhmän', () => {
    const result = validateExerciseForm({ ...valid, primaryMuscles: [] }, existing)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.primaryMuscles).toContain('ensisijainen')
  })

  it('vaatii positiivisen painonlisäyksen', () => {
    const result = validateExerciseForm({ ...valid, increment: 0 }, existing)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.increment).toContain('suurempi kuin nolla')
  })

  it('hylkää toistoalueen, jossa alaraja on ylärajaa suurempi', () => {
    const result = validateExerciseForm({ ...valid, repMin: 12, repMax: 8 }, existing)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.repMax).toContain('alaraja')
  })
})

describe('lomakkeen esitäyttö liikkeestä', () => {
  it('kopioi arvot muokattavaksi ilman viittauksia alkuperäiseen', () => {
    const exercise: Exercise = {
      id: 'e1',
      name: 'Penkkipunnerrus',
      primaryMuscles: ['chest'],
      secondaryMuscles: ['triceps'],
      equipment: 'barbell',
      kind: 'weight_reps',
      increment: 2.5,
      defaultRestSec: 180,
      defaultRepRange: { min: 6, max: 10 },
      notes: 'Jalat tukevasti maassa',
      archived: false,
      isCustom: false,
      createdAt: 0,
    }
    const form = formFromExercise(exercise)
    form.primaryMuscles.push('lats')
    expect(exercise.primaryMuscles).toEqual(['chest'])
    expect(form.repMin).toBe(6)
    expect(form.repMax).toBe(10)
    expect(form.notes).toBe('Jalat tukevasti maassa')
  })
})

const make = (
  id: string,
  name: string,
  primary: Exercise['primaryMuscles'],
  secondary: Exercise['secondaryMuscles'] = [],
): Exercise => ({
  id,
  name,
  primaryMuscles: primary,
  secondaryMuscles: secondary,
  equipment: 'barbell',
  kind: 'weight_reps',
  increment: 2.5,
  defaultRestSec: 150,
  defaultRepRange: { min: 6, max: 10 },
  notes: '',
  archived: false,
  isCustom: false,
  createdAt: 0,
})

describe('liikkeiden suodatus', () => {
  const list = [
    make('1', 'Penkkipunnerrus', ['chest'], ['triceps']),
    make('2', 'Takakyykky', ['quads'], ['glutes']),
    make('3', 'Ylätalja', ['lats'], ['biceps']),
  ]

  it('löytää liikkeen nimen osalla kirjainkoosta riippumatta', () => {
    expect(filterExercises(list, 'PENKKI', 'all').map((e) => e.id)).toEqual(['1'])
    expect(filterExercises(list, 'talja', 'all').map((e) => e.id)).toEqual(['3'])
  })

  it('suodattaa lihasryhmällä myös toissijaisista', () => {
    expect(filterExercises(list, '', 'chest').map((e) => e.id)).toEqual(['1'])
    expect(filterExercises(list, '', 'biceps').map((e) => e.id)).toEqual(['3'])
  })

  it('yhdistää haun ja suodattimen', () => {
    expect(filterExercises(list, 'kyykky', 'chest')).toEqual([])
    expect(filterExercises(list, 'kyykky', 'quads').map((e) => e.id)).toEqual(['2'])
  })
})
