import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { getRestTimer, setRestTimer } from '@/db/repositories/metaRepo'
import type { RestTimerState } from '@/domain/types'
import { haptic } from '@/lib/haptics'

/**
 * Lepoajastin (SPEC §6.4).
 *
 * Tila on loppuaikaleima tietokannassa, ei laskuri. Siksi aika on oikein, kun
 * sovellus palaa taustalta tai ladataan uudelleen – iOS pysäyttää ajastimet
 * taustalla, joten laskuriin ei voi luottaa.
 */
interface RestTimerApi {
  state: RestTimerState | null
  remainingSec: number
  /** true lyhyen hetken sen jälkeen, kun ajastin on päättynyt. */
  finished: boolean
  start: (input: { totalSec: number; exerciseName: string; sessionId: string }) => void
  adjust: (deltaSec: number) => void
  skip: () => void
}

const RestTimerContext = createContext<RestTimerApi | null>(null)

export function useRestTimer(): RestTimerApi {
  const api = useContext(RestTimerContext)
  if (!api) throw new Error('useRestTimer vaatii RestTimerProviderin')
  return api
}

function playBeep(): void {
  try {
    const AudioContextCtor = window.AudioContext ?? window.webkitAudioContext
    if (!AudioContextCtor) return
    const context = new AudioContextCtor()
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = 880
    gain.gain.setValueAtTime(0.0001, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.25, context.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.45)
    oscillator.connect(gain).connect(context.destination)
    oscillator.addEventListener('ended', () => void context.close())
    oscillator.start()
    oscillator.stop(context.currentTime + 0.5)
  } catch {
    // Ääni on lisä, ei vaatimus.
  }
}

export interface RestTimerProviderProps {
  children: React.ReactNode
  soundEnabled: boolean
  vibrationEnabled: boolean
}

export function RestTimerProvider({ children, soundEnabled, vibrationEnabled }: RestTimerProviderProps) {
  const stored = useLiveQuery(() => getRestTimer(), [], undefined)
  const state = stored ?? null
  const [, tick] = useState(0)
  const [finished, setFinished] = useState(false)
  const alerted = useRef<number | null>(null)

  /*
    Jäljellä oleva aika luetaan kellosta renderissä ja pakotetaan uusi render
    neljä kertaa sekunnissa. Näin aika on aina oikein myös taustalta
    palattaessa – iOS pysäyttää ajastimet, mutta loppuaikaleima ei muutu.
  */
  useEffect(() => {
    if (state === null) return
    const rerender = (): void => tick((value) => value + 1)
    const id = window.setInterval(rerender, 250)
    document.addEventListener('visibilitychange', rerender)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', rerender)
    }
  }, [state])

  // Kello on tarkoituksella ulkoinen lähde: vain näin aika on oikein, kun
  // sovellus palaa taustalta.
  // oxlint-disable-next-line react/purity
  const remainingSec = state === null ? 0 : Math.max(0, (state.endsAt - Date.now()) / 1000)

  useEffect(() => {
    if (state === null || remainingSec > 0) return
    if (alerted.current === state.endsAt) return
    alerted.current = state.endsAt
    setFinished(true)
    if (soundEnabled) playBeep()
    if (vibrationEnabled) haptic('warn')
    const id = window.setTimeout(() => setFinished(false), 4000)
    return () => window.clearTimeout(id)
  }, [state, remainingSec, soundEnabled, vibrationEnabled])

  const start = useCallback<RestTimerApi['start']>((input) => {
    setFinished(false)
    alerted.current = null
    void setRestTimer({
      endsAt: Date.now() + input.totalSec * 1000,
      totalSec: input.totalSec,
      exerciseName: input.exerciseName,
      sessionId: input.sessionId,
    })
  }, [])

  const adjust = useCallback<RestTimerApi['adjust']>(
    (deltaSec) => {
      if (state === null) return
      const endsAt = Math.max(Date.now(), state.endsAt + deltaSec * 1000)
      alerted.current = null
      setFinished(false)
      void setRestTimer({ ...state, endsAt, totalSec: Math.max(1, state.totalSec + deltaSec) })
    },
    [state],
  )

  const skip = useCallback(() => {
    setFinished(false)
    alerted.current = null
    void setRestTimer(null)
  }, [])

  const api = useMemo<RestTimerApi>(
    () => ({ state, remainingSec, finished, start, adjust, skip }),
    [state, remainingSec, finished, start, adjust, skip],
  )

  return <RestTimerContext.Provider value={api}>{children}</RestTimerContext.Provider>
}
