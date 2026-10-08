/**
 * Viikkosarjat lihasryhmittäin, Push/Pull/Legs-tasapaino ja viikkotavoitteen
 * putki (SPEC §6.6, §6.8).
 *
 * Ensisijainen lihasryhmä saa sarjasta 1, toissijainen 0,5. Vain työsarjat
 * lasketaan. Viikko on ISO-viikko (ma–su, Europe/Helsinki) – kaikki
 * päivämäärälogiikka tulee `src/lib/date.ts`:stä.
 */
import { MUSCLE_GROUP, type MovementGroup } from './muscles'
import type { Exercise, MuscleId, Session, SetEntry, WeekKey } from './types'
import { setVolume, workSets } from './volume'
import { DAY_MS, epochFromZoned, startOfIsoWeek, weekKeyOf } from '@/lib/date'

export const PRIMARY_SET_WEIGHT = 1
export const SECONDARY_SET_WEIGHT = 0.5

/** Viikkoavaimen maanantai 00:00 Helsinkiä. */
export function weekKeyStart(key: WeekKey): number {
  const year = Number(key.slice(0, 4))
  const week = Number(key.slice(6))
  // ISO-viikko 1 on se viikko, johon 4. tammikuuta osuu.
  const firstWeekMonday = startOfIsoWeek(epochFromZoned(year, 1, 4))
  // Puolen vuorokauden lisäys pitää tuloksen oikeassa viikossa myös
  // kesäaikasiirtymän yli (sama tekniikka kuin lib/date.ts:n weekKeysBetween).
  return startOfIsoWeek(firstWeekMonday + (week - 1) * 7 * DAY_MS + DAY_MS / 2)
}

export function previousWeekKey(key: WeekKey): WeekKey {
  // Maanantai 00:00 − 3,5 vrk osuu aina edellisen viikon torstaille.
  return weekKeyOf(weekKeyStart(key) - 3.5 * DAY_MS)
}

function sortedMap<T>(source: Map<WeekKey, T>): Map<WeekKey, T> {
  return new Map([...source].sort(([a], [b]) => a.localeCompare(b)))
}

/** Viikkosarjat lihasryhmittäin. Liikkeet, joita ei löydy kartasta, ohitetaan. */
export function weeklySetsByMuscle(
  sets: SetEntry[],
  exercises: Map<string, Exercise>,
): Map<WeekKey, Map<MuscleId, number>> {
  const weeks = new Map<WeekKey, Map<MuscleId, number>>()

  for (const set of workSets(sets)) {
    const exercise = exercises.get(set.exerciseId)
    if (!exercise) continue

    const key = weekKeyOf(set.completedAt)
    let muscles = weeks.get(key)
    if (!muscles) {
      muscles = new Map<MuscleId, number>()
      weeks.set(key, muscles)
    }
    for (const muscle of exercise.primaryMuscles) {
      muscles.set(muscle, (muscles.get(muscle) ?? 0) + PRIMARY_SET_WEIGHT)
    }
    for (const muscle of exercise.secondaryMuscles) {
      muscles.set(muscle, (muscles.get(muscle) ?? 0) + SECONDARY_SET_WEIGHT)
    }
  }

  return sortedMap(weeks)
}

/**
 * Sarjan kohdistus liikeryhmiin: liikkeen **ensisijaisten** lihasryhmien
 * liikeryhmät, ja arvo jaetaan tasan, jos ensisijaiset lihakset kuuluvat eri
 * ryhmiin (esim. rinta + etuolkapää = push, mutta etureisi + pakara = legs
 * kokonaan). Liikkeet, joita ei löydy kartasta, ohitetaan.
 */
function byMovementGroup(
  sets: SetEntry[],
  exercises: Map<string, Exercise>,
  valueOf: (set: SetEntry) => number,
): Record<MovementGroup, number> {
  const totals: Record<MovementGroup, number> = { push: 0, pull: 0, legs: 0, core: 0 }

  for (const set of workSets(sets)) {
    const exercise = exercises.get(set.exerciseId)
    if (!exercise) continue
    const groups = new Set<MovementGroup>(
      exercise.primaryMuscles.map((muscle) => MUSCLE_GROUP[muscle]),
    )
    if (groups.size === 0) continue
    const share = valueOf(set) / groups.size
    for (const group of groups) totals[group] += share
  }

  return totals
}

/**
 * Push/Pull/Legs-tasapainon **ensisijainen** mittari (SPEC §6.8): työsarjojen
 * määrä liikeryhmittäin.
 *
 * Sarjamäärä on tasapainon oikea yksikkö, koska kehonpainoliikkeiden volyymi on
 * nolla (ks. `volume.ts`): leuanvedot ja dipit ilman lisäpainoa tekevät työtä,
 * mutta eivät kiloja, joten pelkkä volyymivertailu näyttäisi pull-puolen
 * systemaattisesti todellista pienempänä.
 */
export function setsByMovementGroup(
  sets: SetEntry[],
  exercises: Map<string, Exercise>,
): Record<MovementGroup, number> {
  return byMovementGroup(sets, exercises, () => 1)
}

/**
 * Volyymin jakauma liikeryhmiin (SPEC §6.8), toissijainen mittari
 * `setsByMovementGroup`in rinnalla: kertoo kuormasta, mutta ei näe
 * kehonpainoliikkeiden työtä.
 */
export function volumeByMovementGroup(
  sets: SetEntry[],
  exercises: Map<string, Exercise>,
): Record<MovementGroup, number> {
  return byMovementGroup(sets, exercises, setVolume)
}

/** Päätettyjen treenien määrä viikoittain. Kesken oleva treeni ei lasketa. */
export function weeklyWorkoutCounts(sessions: Session[]): Map<WeekKey, number> {
  const counts = new Map<WeekKey, number>()
  for (const session of sessions) {
    if (session.status !== 'done') continue
    const key = weekKeyOf(session.startedAt)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return sortedMap(counts)
}

/**
 * Putki: peräkkäiset viikot, joilla viikkotavoite täyttyi (SPEC §6.8).
 * Kesken oleva nykyinen viikko lasketaan mukaan vain jos tavoite on jo
 * täynnä – vajaa nykyinen viikko ei katkaise putkea.
 */
export function targetStreak(
  weeklyCounts: Map<WeekKey, number>,
  target: number,
  currentWeek: WeekKey,
): number {
  if (target <= 0) return 0

  let streak = (weeklyCounts.get(currentWeek) ?? 0) >= target ? 1 : 0
  let key = previousWeekKey(currentWeek)
  while ((weeklyCounts.get(key) ?? 0) >= target) {
    streak += 1
    key = previousWeekKey(key)
  }
  return streak
}
