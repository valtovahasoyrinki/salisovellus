import { ensureSettings } from '@/db/repositories/settingsRepo'
import { requestPersistentStorage } from '@/lib/storage'

/**
 * Käynnistyksessä tehtävät kertatoimet: asetusrivi olemassa ja tallennuksen
 * pysyvyys pyydetty (SPEC §4). Virhe ei kaada sovellusta – kirjaaminen on
 * tärkeämpää kuin nämä.
 */
export async function bootstrap(): Promise<void> {
  try {
    const settings = await ensureSettings()
    applyThemeAttribute(settings.theme === 'system' ? systemTheme() : settings.theme)
  } catch (error) {
    console.error('Asetusten alustus epäonnistui', error)
  }
  void requestPersistentStorage()
}

export function systemTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined' || !window.matchMedia) return 'dark'
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function applyThemeAttribute(theme: 'dark' | 'light'): void {
  document.documentElement.dataset.theme = theme
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#000000' : '#fbfbfc')
}
