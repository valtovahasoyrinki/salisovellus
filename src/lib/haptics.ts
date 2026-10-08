/**
 * Haptiikka on lisä, ei ainoa palaute: iOS Safari ei tue Vibration APIa
 * (SPEC §4), joten jokainen kutsu on hiljainen no-op siellä.
 */
type Pattern = 'tap' | 'success' | 'record' | 'warn'

const PATTERNS: Record<Pattern, number | number[]> = {
  tap: 12,
  success: [14, 36, 14],
  record: [18, 40, 18, 40, 28],
  warn: [40, 60, 40],
}

let enabled = true

export function setHapticsEnabled(value: boolean): void {
  enabled = value
}

export function haptic(pattern: Pattern = 'tap'): void {
  if (!enabled) return
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return
  try {
    navigator.vibrate(PATTERNS[pattern])
  } catch {
    // Selain voi kieltää värinän ilman käyttäjän elettä – ei haittaa.
  }
}

export function hapticsSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
}
