/** Tallennuksen pysyvyys ja käytetty tila (SPEC §4, §6.11). */

export interface StorageStatus {
  persistent: boolean
  supported: boolean
  usageBytes?: number
  quotaBytes?: number
}

export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) return false
  try {
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}

export async function getStorageStatus(): Promise<StorageStatus> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
    return { persistent: false, supported: false }
  }
  try {
    const estimate = await navigator.storage.estimate()
    const persistent = navigator.storage.persisted ? await navigator.storage.persisted() : false
    return {
      persistent,
      supported: true,
      usageBytes: estimate.usage,
      quotaBytes: estimate.quota,
    }
  } catch {
    return { persistent: false, supported: false }
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} kt`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} Mt`
}
