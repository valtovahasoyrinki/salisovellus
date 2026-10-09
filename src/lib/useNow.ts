import { useEffect, useState } from 'react'

/**
 * Kello, joka päivittyy annetuin välein. Aika luetaan tilaan eikä renderissä,
 * jotta renderöinti pysyy puhtaana.
 *
 * Päivittyy myös heti, kun sovellus palaa taustalta: iOS pysäyttää ajastimet,
 * joten pelkkään intervalliin ei voi luottaa (SPEC §4).
 */
export function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const update = (): void => setNow(Date.now())
    const id = window.setInterval(update, intervalMs)
    document.addEventListener('visibilitychange', update)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', update)
    }
  }, [intervalMs])

  return now
}
