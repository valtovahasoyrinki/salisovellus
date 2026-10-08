import { db } from '@/db/db'
import type { RestTimerState, Timestamp } from '@/domain/types'

/**
 * `meta` on pieni avain–arvo-taulu pysyvälle UI-tilalle, joka ei kuulu
 * domain-malliin: lepoajastimen loppuaikaleima, varmuuskopion aikaleima ja
 * käyttöönoton tila.
 */
const KEYS = {
  restTimer: 'restTimer',
  lastBackupAt: 'lastBackupAt',
  onboardingDone: 'onboardingDone',
} as const

async function getValue<T>(key: string): Promise<T | undefined> {
  const row = await db.meta.get(key)
  return row?.value as T | undefined
}

async function setValue(key: string, value: unknown): Promise<void> {
  await db.meta.put({ key, value })
}

export function getRestTimer(): Promise<RestTimerState | undefined> {
  return getValue<RestTimerState>(KEYS.restTimer)
}

export function setRestTimer(state: RestTimerState | null): Promise<void> {
  return state === null ? db.meta.delete(KEYS.restTimer) : setValue(KEYS.restTimer, state)
}

export function getLastBackupAt(): Promise<Timestamp | undefined> {
  return getValue<Timestamp>(KEYS.lastBackupAt)
}

export function setLastBackupAt(ts: Timestamp): Promise<void> {
  return setValue(KEYS.lastBackupAt, ts)
}

export async function isOnboardingDone(): Promise<boolean> {
  return (await getValue<boolean>(KEYS.onboardingDone)) === true
}

export function setOnboardingDone(done: boolean): Promise<void> {
  return setValue(KEYS.onboardingDone, done)
}
