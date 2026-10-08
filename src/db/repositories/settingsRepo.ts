import { db } from '@/db/db'
import type { Equipment, Settings } from '@/domain/types'

/** Painonlisäykset välineen mukaan (PLAN.md §7, oletus 7). */
export const DEFAULT_INCREMENTS: Record<Equipment, number> = {
  barbell: 2.5,
  dumbbell: 1.25,
  machine: 2.5,
  cable: 2.5,
  bodyweight: 1.25,
  other: 2.5,
}

export const DEFAULT_SETTINGS: Settings = {
  id: 'app',
  weeklyTarget: 4,
  increments: DEFAULT_INCREMENTS,
  defaultRestSec: 150,
  restSoundEnabled: true,
  restVibrationEnabled: true,
  theme: 'dark',
  weeklySetsRange: { min: 10, max: 20 },
}

export async function getSettings(): Promise<Settings> {
  const stored = await db.settings.get('app')
  // Vanhempi rivi voi puuttua kentistä, jotka on lisätty myöhemmin.
  return { ...DEFAULT_SETTINGS, ...stored, id: 'app' }
}

export async function ensureSettings(): Promise<Settings> {
  const settings = await getSettings()
  await db.settings.put(settings)
  return settings
}

export async function updateSettings(patch: Partial<Omit<Settings, 'id'>>): Promise<void> {
  const current = await getSettings()
  await db.settings.put({ ...current, ...patch, id: 'app' })
}
