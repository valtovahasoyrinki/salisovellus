/**
 * Ruutu pidetään päällä treenin aikana (SPEC §6.3).
 * Jos Screen Wake Lock -rajapintaa ei ole (iOS < 16.4), tämä on hiljainen no-op.
 */
let sentinel: WakeLockSentinel | null = null
let wanted = false

function supported(): boolean {
  return typeof navigator !== 'undefined' && 'wakeLock' in navigator
}

async function acquire(): Promise<void> {
  if (!supported() || sentinel !== null || !wanted) return
  try {
    sentinel = await navigator.wakeLock.request('screen')
    sentinel.addEventListener('release', () => {
      sentinel = null
    })
  } catch {
    sentinel = null
  }
}

function onVisibilityChange(): void {
  if (document.visibilityState === 'visible' && wanted) {
    void acquire()
  }
}

export async function enableWakeLock(): Promise<void> {
  if (wanted) return
  wanted = true
  document.addEventListener('visibilitychange', onVisibilityChange)
  await acquire()
}

export async function disableWakeLock(): Promise<void> {
  wanted = false
  document.removeEventListener('visibilitychange', onVisibilityChange)
  if (sentinel !== null) {
    try {
      await sentinel.release()
    } catch {
      // Lukko voi olla jo vapautettu.
    }
    sentinel = null
  }
}

export function wakeLockSupported(): boolean {
  return supported()
}
