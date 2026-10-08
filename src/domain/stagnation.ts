/**
 * Junnauksen tunnistus (SPEC §6.6): liike junnaa, kun uutta e1RM-ennätystä ei
 * ole tullut viimeisellä neljällä kerralla **ja** näistä neljästä
 * ensimmäisestä on kulunut vähintään kolme viikkoa.
 *
 * Kaksi ehtoa yhdessä estävät väärät hälytykset: neljä kertaa kahden viikon
 * sisällä on normaali jakso ilman ennätystä, mutta neljä kertaa kolmessa
 * viikossa ilman nousua on jumi.
 */
import { bestE1rm } from './e1rm'
import type { SessionSetGroup } from './sessionGroups'
import type { Timestamp } from './types'
import { dateKeyOf, daysBetweenDateKeys } from '@/lib/date'

export const STAGNATION_SESSIONS = 4
export const STAGNATION_WEEKS = 3

export interface StagnationResult {
  stagnant: boolean
  /** Kertoja viimeisimmän e1RM-ennätyksen jälkeen. */
  sessionsSinceRecord: number
  /** Täysiä viikkoja viimeisimmästä e1RM-ennätyksestä. */
  weeksSinceRecord: number
}

const EMPTY: StagnationResult = { stagnant: false, sessionsSinceRecord: 0, weeksSinceRecord: 0 }

function fullWeeksBetween(from: Timestamp, to: Timestamp): number {
  return Math.floor(daysBetweenDateKeys(dateKeyOf(from), dateKeyOf(to)) / 7)
}

export function detectStagnation(groups: SessionSetGroup[], now: Timestamp): StagnationResult {
  const entries: Array<{ completedAt: Timestamp; value: number }> = []
  for (const group of groups) {
    const best = bestE1rm(group.sets)
    if (best) entries.push({ completedAt: group.completedAt, value: best.value })
  }
  if (entries.length === 0) return EMPTY

  // Viimeisin kerta, jolla e1RM ylitti kaiken aiemman = tuorein ennätys.
  let recordIndex = 0
  let recordValue = -Infinity
  for (const [index, entry] of entries.entries()) {
    if (entry.value > recordValue) {
      recordValue = entry.value
      recordIndex = index
    }
  }

  const record = entries[recordIndex]
  const sessionsSinceRecord = entries.length - 1 - recordIndex
  const weeksSinceRecord = record ? fullWeeksBetween(record.completedAt, now) : 0

  const windowStart = entries[entries.length - STAGNATION_SESSIONS]
  const stagnant =
    sessionsSinceRecord >= STAGNATION_SESSIONS &&
    windowStart !== undefined &&
    daysBetweenDateKeys(dateKeyOf(windowStart.completedAt), dateKeyOf(now)) >= STAGNATION_WEEKS * 7

  return { stagnant, sessionsSinceRecord, weeksSinceRecord }
}
