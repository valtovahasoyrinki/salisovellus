import { ensureSettings } from '@/db/repositories/settingsRepo'
import { requestPersistentStorage } from '@/lib/storage'

/**
 * Ennen ensimmäistä piirtoa tehtävät kertatoimet: asetusrivi olemassa ja teema
 * asetettu, jotta vaalea teema ei välähdä tummana (SPEC §4). Vain yksi rivi
 * luetaan – kaikki raskaampi jää `syncLibrary`-funktioon, joka ajetaan vasta
 * piirron jälkeen. Virhe ei kaada sovellusta.
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

/**
 * Liikekirjaston synkronointi (SPEC §6.1) ensimmäisen piirron jälkeen.
 *
 * Tämä ei saa viivästyttää käynnistystä: tyhjään tietokantaan kirjoitetaan 125
 * riviä, mikä kestää hidastetulla puhelimella satoja millisekunteja. Siemendata
 * tuodaan dynaamisesti, jotta se ei ole käynnistyksen kriittisellä polulla.
 * Näkymät lukevat liikkeet `useLiveQuery`-kyselyillä, jotka päivittyvät itse,
 * ja käyttöönotto odottaa saman funktion omassa kutsussaan.
 */
export function syncLibrary(): void {
  void import('@/db/seed/seedLibrary')
    .then(({ syncExerciseLibrary }) => syncExerciseLibrary())
    .catch((error: unknown) => {
      console.error('Liikekirjaston synkronointi epäonnistui', error)
    })
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
