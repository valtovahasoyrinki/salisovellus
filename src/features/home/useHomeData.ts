import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { listExercises } from '@/db/repositories/exerciseRepo'
import { getActiveProgram, listDays } from '@/db/repositories/programRepo'
import {
  getActiveSession,
  getLastDoneSession,
  listDoneSessions,
  listSetsBetween,
} from '@/db/repositories/sessionRepo'
import { getLastBackupAt } from '@/db/repositories/metaRepo'
import { generateInsights, insightsForHome, type Insight } from '@/domain/insights'
import { groupSetsBySession } from '@/domain/sessionGroups'
import {
  setsByMovementGroup,
  weeklySetsByMuscle,
  weeklyWorkoutCounts,
  targetStreak,
} from '@/domain/weeklySets'
import { nextWorkoutDay } from '@/domain/rotation'
import type { RepRange, Session, SetEntry, WorkoutDay } from '@/domain/types'
import { DAY_MS, weekKeyOf } from '@/lib/date'
import { useNow } from '@/lib/useNow'

/**
 * Analyysin aikaikkuna kotinäkymässä. 16 viikkoa riittää trendeihin,
 * junnauksen havaitsemiseen ja viikkosarjoihin, eikä koko historiaa tarvitse
 * lukea joka käynnistyksellä (SPEC §8: 3 vuotta dataa).
 */
const WINDOW_DAYS = 112

export interface HomeData {
  /** Sama kello kuin laskennassa, jotta näkymä ei lue aikaa renderissä. */
  now: number
  loading: boolean
  activeSession: Session | null
  days: WorkoutDay[]
  nextDay: WorkoutDay | undefined
  lastDone: Session | null
  recentSessions: Session[]
  weekDoneCount: number
  weeklyTargetStreak: number
  insights: Insight[]
  daysSinceBackup: number | null
}

export function useHomeData(weeklyTarget: number, weeklySetsRange: RepRange): HomeData {
  // Minuutin tarkkuus riittää kotinäkymän luvuille.
  const now = useNow(60_000)

  const activeSession = useLiveQuery(async () => (await getActiveSession()) ?? null, [], undefined)
  const lastDone = useLiveQuery(async () => (await getLastDoneSession()) ?? null, [], undefined)
  const program = useLiveQuery(async () => (await getActiveProgram()) ?? null, [], undefined)
  const days = useLiveQuery(
    async () => (program ? listDays(program.id) : []),
    [program?.id],
    undefined,
  )
  const sessions = useLiveQuery(() => listDoneSessions(), [], undefined)
  const exercises = useLiveQuery(() => listExercises(), [], undefined)
  const lastBackupAt = useLiveQuery(async () => (await getLastBackupAt()) ?? null, [], undefined)

  // Aikaikkunan sarjat yhdellä indeksoidulla kyselyllä.
  const windowStart = useMemo(() => now - WINDOW_DAYS * DAY_MS, [now])
  const windowSets = useLiveQuery(
    (): Promise<SetEntry[]> => listSetsBetween(windowStart, now + DAY_MS),
    [windowStart],
    undefined,
  )

  const currentWeek = weekKeyOf(now)

  const derived = useMemo(() => {
    if (!sessions || !exercises || !windowSets) {
      return {
        weekDoneCount: 0,
        weeklyTargetStreak: 0,
        insights: [] as Insight[],
        recentSessions: [] as Session[],
      }
    }

    const exerciseMap = new Map(exercises.map((exercise) => [exercise.id, exercise]))
    const weeklyWorkouts = weeklyWorkoutCounts(sessions)
    const weeklySets = weeklySetsByMuscle(windowSets, exerciseMap)
    const setsByGroup = setsByMovementGroup(windowSets, exerciseMap)

    // Liikkeiden historia oivalluksille: vain aikaikkunan sisällä kirjatut liikkeet.
    const byExercise = new Map<string, SetEntry[]>()
    for (const set of windowSets) {
      const list = byExercise.get(set.exerciseId)
      if (list) list.push(set)
      else byExercise.set(set.exerciseId, [set])
    }

    const insightExercises = [...byExercise.entries()].flatMap(([exerciseId, sets]) => {
      const exercise = exerciseMap.get(exerciseId)
      if (!exercise || exercise.archived) return []
      return [{ exercise, groups: groupSetsBySession(sets) }]
    })

    const insights = generateInsights({
      now,
      currentWeek,
      weeklyTarget,
      weeklyWorkouts,
      weeklySets,
      weeklySetsRange,
      setsByGroup,
      exercises: insightExercises,
    })

    return {
      weekDoneCount: weeklyWorkouts.get(currentWeek) ?? 0,
      weeklyTargetStreak: targetStreak(weeklyWorkouts, weeklyTarget, currentWeek),
      insights: insightsForHome(insights, 3),
      recentSessions: sessions.slice(0, 3),
    }
  }, [sessions, exercises, windowSets, now, currentWeek, weeklyTarget, weeklySetsRange])

  return {
    now,
    loading:
      activeSession === undefined ||
      days === undefined ||
      sessions === undefined ||
      exercises === undefined ||
      windowSets === undefined,
    activeSession: activeSession ?? null,
    days: days ?? [],
    nextDay: nextWorkoutDay(days ?? [], lastDone?.dayId),
    lastDone: lastDone ?? null,
    daysSinceBackup:
      lastBackupAt === undefined || lastBackupAt === null
        ? null
        : Math.floor((now - lastBackupAt) / DAY_MS),
    ...derived,
  }
}
