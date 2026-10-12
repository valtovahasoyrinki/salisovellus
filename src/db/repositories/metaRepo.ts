import { db } from '@/db/db'
import type { RestTimerState, Timestamp } from '@/domain/types'

/**
 * `meta` on pieni avain–arvo-taulu pysyvälle UI-tilalle, joka ei kuulu
 * domain-malliin: lepoajastimen loppuaikaleima, varmuuskopion aikaleima,
 * käyttöönoton tila ja asennettu liikekirjaston versio.
 */
const KEYS = {
  restTimer: 'restTimer',
  lastBackupAt: 'lastBackupAt',
  onboardingDone: 'onboardingDone',
  libraryVersion: 'libraryVersion',
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

/**
 * Asennettu liikekirjaston versio (SPEC §6.1). Puuttuva arvo tarkoittaa
 * 1.0-asennusta, jossa avainta ei vielä kirjoitettu.
 */
export function getLibraryVersion(): Promise<number | undefined> {
  return getValue<number>(KEYS.libraryVersion)
}

export function setLibraryVersion(version: number): Promise<void> {
  return setValue(KEYS.libraryVersion, version)
}

export function clearLibraryVersion(): Promise<void> {
  return db.meta.delete(KEYS.libraryVersion)
}
