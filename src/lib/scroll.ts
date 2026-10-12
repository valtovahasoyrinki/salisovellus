/**
 * Vieritysapuri kirjausnäkymälle (SPEC §6.3): kesken treenin luotu liike
 * vieritetään näkyviin.
 *
 * Kortti syntyy vasta kun Dexien live-kysely on päivittynyt, eli muutaman
 * ruudunpäivityksen päästä kirjoituksesta. Siksi elementtiä odotetaan
 * `requestAnimationFrame`-silmukassa sen sijaan, että vieritys tehtäisiin
 * efektissä – näin kutsu pysyy siinä tapahtumassa, joka vierityksen aiheutti.
 */
const MAX_FRAMES = 30

export function scrollIntoViewWhenReady(id: string, smooth: boolean, frames = MAX_FRAMES): void {
  const element = document.getElementById(id)
  if (element) {
    element.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'center' })
    return
  }
  if (frames <= 0) return
  requestAnimationFrame(() => scrollIntoViewWhenReady(id, smooth, frames - 1))
}
