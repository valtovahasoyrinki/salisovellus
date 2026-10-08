/**
 * Sarjojen ryhmittely treenikerroiksi. Progressio, trendi ja junnaus katsovat
 * dataa "kerta kerrallaan", joten ne käyttävät kaikki tätä samaa ryhmittelyä.
 */
import type { SetEntry, Timestamp } from './types'

/** Yhden liikkeen sarjat yhdellä treenikerralla. */
export interface SessionSetGroup {
  sessionId: string
  /** Ryhmän viimeisen sarjan aikaleima – sama tulkinta kuin sessionRepo:ssa. */
  completedAt: Timestamp
  /** Kaikki sarjat `order`-järjestyksessä, lämmittelyt mukana. */
  sets: SetEntry[]
}

/**
 * Ryhmittelee sarjat sessioittain vanhimmasta uusimpaan. Sarjat säilyvät
 * ryhmän sisällä `order`-järjestyksessä, ja lämmittelyt pysyvät mukana –
 * kutsuja päättää itse, suodattaako ne (`workSets`).
 */
export function groupSetsBySession(sets: SetEntry[]): SessionSetGroup[] {
  const bySession = new Map<string, SetEntry[]>()
  for (const set of sets) {
    const list = bySession.get(set.sessionId)
    if (list) list.push(set)
    else bySession.set(set.sessionId, [set])
  }

  const groups: SessionSetGroup[] = []
  for (const [sessionId, list] of bySession) {
    const ordered = [...list].sort((a, b) => a.order - b.order || a.completedAt - b.completedAt)
    const completedAt = ordered.reduce((latest, set) => Math.max(latest, set.completedAt), 0)
    groups.push({ sessionId, completedAt, sets: ordered })
  }

  // Aikajärjestys; tasapelissä sessionId pitää tuloksen deterministisenä.
  return groups.sort((a, b) => a.completedAt - b.completedAt || a.sessionId.localeCompare(b.sessionId))
}

/** Ryhmät, joissa on vähintään yksi työsarja – analyysin kelvolliset kerrat. */
export function groupsWithWorkSets(groups: SessionSetGroup[]): SessionSetGroup[] {
  return groups.filter((group) => group.sets.some((set) => !set.warmup))
}
