import { useLiveQuery } from 'dexie-react-hooks'
import { DEFAULT_SETTINGS, getSettings } from '@/db/repositories/settingsRepo'
import type { Settings } from '@/domain/types'

/** Asetukset reaktiivisesti. Palauttaa oletukset ennen ensimmäistä latausta. */
export function useSettings(): Settings {
  return useLiveQuery(() => getSettings(), [], DEFAULT_SETTINGS)
}
