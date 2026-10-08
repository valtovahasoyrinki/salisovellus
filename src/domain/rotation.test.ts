import { describe, expect, it } from 'vitest'
import { nextWorkoutDay } from './rotation'
import type { WorkoutDay } from './types'

const day = (id: string, name: string, order: number): WorkoutDay => ({
  id,
  programId: 'p1',
  name,
  order,
  color: 'day-1',
  icon: 'push',
})

const days = [day('push', 'Push', 0), day('pull', 'Pull', 1), day('legs', 'Legs', 2)]

describe('treenipäivien kierto', () => {
  it('tyhjä ohjelma ei ehdota päivää', () => {
    expect(nextWorkoutDay([], undefined)).toBeUndefined()
  })

  it('ilman historiaa aloitetaan ensimmäisestä päivästä', () => {
    expect(nextWorkoutDay(days, undefined)?.id).toBe('push')
  })

  it('seuraava päivä on ohjelman järjestyksessä seuraava', () => {
    expect(nextWorkoutDay(days, 'push')?.id).toBe('pull')
    expect(nextWorkoutDay(days, 'pull')?.id).toBe('legs')
  })

  it('kierto alkaa viimeisen päivän jälkeen alusta', () => {
    expect(nextWorkoutDay(days, 'legs')?.id).toBe('push')
  })

  it('poistettu päivä palauttaa kierron alkuun', () => {
    expect(nextWorkoutDay(days, 'poistettu')?.id).toBe('push')
  })

  it('järjestys tulee order-kentästä, ei taulukon järjestyksestä', () => {
    const shuffled = [days[2], days[0], days[1]].filter((entry): entry is WorkoutDay => !!entry)
    expect(nextWorkoutDay(shuffled, 'push')?.id).toBe('pull')
  })

  it('yhden päivän ohjelma toistaa samaa päivää', () => {
    expect(nextWorkoutDay([day('full', 'Koko keho', 0)], 'full')?.id).toBe('full')
  })
})
