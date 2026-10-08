/**
 * Treenipäivien kierto (SPEC §6.6): seuraava päivä on viimeksi tehdyn päivän
 * seuraaja ohjelman järjestyksessä, ja viimeisen jälkeen aloitetaan alusta.
 * Kierto ei ole sidottu viikonpäiviin (SPEC §2).
 */
import type { WorkoutDay } from './types'

function inProgramOrder(days: WorkoutDay[]): WorkoutDay[] {
  return [...days].sort((a, b) => a.order - b.order)
}

/**
 * Seuraava treenipäivä. `undefined` vain jos ohjelmassa ei ole päiviä.
 * Jos viimeksi tehtyä päivää ei enää ole ohjelmassa (se poistettiin),
 * kierto aloitetaan alusta.
 */
export function nextWorkoutDay(
  days: WorkoutDay[],
  lastDoneDayId: string | undefined,
): WorkoutDay | undefined {
  const ordered = inProgramOrder(days)
  if (ordered.length === 0) return undefined

  const lastIndex = ordered.findIndex((day) => day.id === lastDoneDayId)
  if (lastIndex === -1) return ordered[0]
  return ordered[(lastIndex + 1) % ordered.length]
}
