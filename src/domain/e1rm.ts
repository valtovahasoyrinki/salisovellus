/**
 * Arvioitu yhden toiston maksimi (SPEC §6.6).
 *
 * Kaava on Epley: `paino × (1 + toistot / 30)`. Yhden toiston sarjassa arvio on
 * paino sellaisenaan. Yli 12 toiston sarjoja ei käytetä, koska Epley yliarvioi
 * pitkillä sarjoilla – ne näkyvät silti volyymissa ja toistoennätyksissä.
 */
import type { SetEntry } from './types'
import { workSets } from './volume'

/** Toistoalue, jolla e1RM on riittävän tarkka (SPEC §6.6). */
export const E1RM_MIN_REPS = 1
export const E1RM_MAX_REPS = 12

/** Kahden desimaalin tarkkuus riittää ja pitää vertailut vakaina (liukuluvut). */
function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Palauttaa e1RM:n tai `null`, jos sarjasta ei voi laskea mielekästä arviota.
 *
 * `null` tulee kolmesta syystä:
 * - toistot alle 1 tai yli 12 (SPEC §6.6),
 * - paino nolla tai negatiivinen: kehonpainoliikkeen kirjattu paino on vain
 *   lisäpaino (avustetuissa negatiivinen), eikä kehonpainoa seurata (SPEC §10),
 *   joten ulkoisesta kuormasta ei saa vertailukelpoista maksimia,
 * - syöte ei ole äärellinen luku.
 */
export function e1rm(weight: number, reps: number): number | null {
  if (!Number.isFinite(weight) || !Number.isFinite(reps)) return null
  if (reps < E1RM_MIN_REPS || reps > E1RM_MAX_REPS) return null
  if (weight <= 0) return null
  if (reps === 1) return round2(weight)
  return round2(weight * (1 + reps / 30))
}

/** Sarjan e1RM, tai `null` jos sarja ei kelpaa e1RM-laskentaan. */
export function setE1rm(set: SetEntry): number | null {
  return e1rm(set.weight, set.reps)
}

/**
 * Paras e1RM annetuista sarjoista. Lämmittelyt jätetään huomiotta (SPEC §6.6).
 * Tasatilanteessa voittaa aikaisempi sarja, jotta tulos on vakaa.
 */
export function bestE1rm(sets: SetEntry[]): { value: number; set: SetEntry } | null {
  let best: { value: number; set: SetEntry } | null = null
  for (const set of workSets(sets)) {
    const value = setE1rm(set)
    if (value === null) continue
    if (best === null || value > best.value) best = { value, set }
  }
  return best
}
