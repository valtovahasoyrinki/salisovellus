import { describe, expect, it } from 'vitest'
import type { SessionSetGroup } from './sessionGroups'
import { detectStagnation } from './stagnation'
import type { SetEntry } from './types'

const DAY = 86_400_000
const START = Date.parse('2026-01-05T16:00:00Z')

let counter = 0

/** Kerta annettuna päivänä alusta; toistot = 1, joten e1RM on paino. */
const session = (dayOffset: number, weight: number): SessionSetGroup => {
  counter += 1
  const completedAt = START + dayOffset * DAY
  const entry: SetEntry = {
    id: `s${counter}`,
    sessionExerciseId: 'se1',
    sessionId: `sess${counter}`,
    exerciseId: 'ex1',
    order: 0,
    weight,
    reps: 1,
    warmup: false,
    completedAt,
  }
  return { sessionId: entry.sessionId, completedAt, sets: [entry] }
}

describe('junnauksen tunnistus', () => {
  it('tyhjä historia ei junnaa', () => {
    expect(detectStagnation([], START)).toEqual({
      stagnant: false,
      sessionsSinceRecord: 0,
      weeksSinceRecord: 0,
    })
  })

  it('yksi kerta on aina tuore ennätys', () => {
    const result = detectStagnation([session(0, 100)], START)
    expect(result.stagnant).toBe(false)
    expect(result.sessionsSinceRecord).toBe(0)
  })

  it('neljä kertaa ilman ennätystä ja yli kolme viikkoa tunnistetaan junnaukseksi', () => {
    const history = [
      session(0, 100),
      session(7, 97.5),
      session(14, 97.5),
      session(21, 100),
      session(28, 97.5),
    ]
    const result = detectStagnation(history, START + 28 * DAY)
    expect(result.sessionsSinceRecord).toBe(4)
    expect(result.weeksSinceRecord).toBe(4)
    expect(result.stagnant).toBe(true)
  })

  it('neljä tiheää kertaa kahdessa viikossa ei vielä ole junnausta', () => {
    const history = [session(0, 100), session(2, 97.5), session(4, 97.5), session(6, 97.5), session(8, 97.5)]
    const result = detectStagnation(history, START + 8 * DAY)
    expect(result.sessionsSinceRecord).toBe(4)
    expect(result.stagnant).toBe(false)
  })

  it('uusi ennätys nollaa laskurin', () => {
    const history = [
      session(0, 100),
      session(7, 97.5),
      session(14, 97.5),
      session(21, 97.5),
      session(28, 102.5),
    ]
    const result = detectStagnation(history, START + 28 * DAY)
    expect(result.sessionsSinceRecord).toBe(0)
    expect(result.weeksSinceRecord).toBe(0)
    expect(result.stagnant).toBe(false)
  })

  it('saman tuloksen toistaminen ei ole uusi ennätys', () => {
    const history = [
      session(0, 100),
      session(7, 100),
      session(14, 100),
      session(21, 100),
      session(28, 100),
    ]
    expect(detectStagnation(history, START + 28 * DAY).stagnant).toBe(true)
  })

  it('kesäaikasiirtymän yli laskettu kolmen viikon raja pitää', () => {
    // Kerrat 15.3.–12.4.2026, välissä kesäajan alku 29.3.
    const dst = Date.parse('2026-03-15T10:00:00Z')
    const groups: SessionSetGroup[] = [0, 7, 14, 21, 28].map((offset, index) => {
      const completedAt = dst + offset * DAY
      return {
        sessionId: `dst${index}`,
        completedAt,
        sets: [
          {
            id: `dst${index}`,
            sessionExerciseId: 'se1',
            sessionId: `dst${index}`,
            exerciseId: 'ex1',
            order: 0,
            weight: index === 0 ? 100 : 95,
            reps: 1,
            warmup: false,
            completedAt,
          },
        ],
      }
    })
    const result = detectStagnation(groups, dst + 28 * DAY)
    expect(result.weeksSinceRecord).toBe(4)
    expect(result.stagnant).toBe(true)
  })

  it('pelkät lämmittelyt eivät tuota ennätyshistoriaa', () => {
    const group = session(0, 100)
    const warmupOnly: SessionSetGroup = { ...group, sets: [] }
    for (const entry of group.sets) warmupOnly.sets.push({ ...entry, warmup: true })
    const result = detectStagnation([warmupOnly], START)
    expect(result.stagnant).toBe(false)
    expect(result.sessionsSinceRecord).toBe(0)
  })
})
