import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { listExercises } from '@/db/repositories/exerciseRepo'
import { listDoneSessions, listSetsBetween } from '@/db/repositories/sessionRepo'
import { computeRecords, recordLabel } from '@/domain/records'
import { groupSetsBySession } from '@/domain/sessionGroups'
import { MOVEMENT_GROUP_LABELS, MUSCLE_ORDER, muscleLabel, type MovementGroup } from '@/domain/muscles'
import {
  setsByMovementGroup,
  targetStreak,
  weeklySetsByMuscle,
  weeklyWorkoutCounts,
} from '@/domain/weeklySets'
import type { MuscleId, SetEntry, WeekKey } from '@/domain/types'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ListRow } from '@/components/ui/ListRow'
import { ProgressRing } from '@/components/ui/ProgressRing'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { ScreenSkeleton } from '@/components/ui/Skeleton'
import { TextField } from '@/components/ui/TextField'
import { MuscleMap } from '@/components/MuscleMap/MuscleMap'
import { RangeBars } from '@/components/charts/RangeBars'
import { StackedBarChart, type StackSeries } from '@/components/charts/StackedBarChart'
import { AnalysisIcon, FlameIcon, SearchIcon, TrophyIcon } from '@/components/icons'
import { useSettings } from '@/app/useSettings'
import { DAY_MS, formatShortDate, formatWeekKey, weekKeyOf, weekKeysBetween } from '@/lib/date'
import { formatNumber, formatSets, formatVolume, formatWorkoutCount } from '@/lib/format'
import { useNow } from '@/lib/useNow'

/** Yleiskatsauksen aikaikkuna: 12 viikkoa mahtuu palkkikaavioon luettavasti. */
const WEEKS = 12

const SERIES: StackSeries[] = [
  { id: 'push', label: MOVEMENT_GROUP_LABELS.push, colorVar: '--chart-1' },
  { id: 'pull', label: MOVEMENT_GROUP_LABELS.pull, colorVar: '--chart-2' },
  { id: 'legs', label: MOVEMENT_GROUP_LABELS.legs, colorVar: '--chart-3' },
  { id: 'core', label: MOVEMENT_GROUP_LABELS.core, colorVar: '--chart-4' },
]

export default function OverviewScreen() {
  const navigate = useNavigate()
  const settings = useSettings()
  const now = useNow(60_000)
  const [selectedWeek, setSelectedWeek] = useState<WeekKey | null>(null)
  const [query, setQuery] = useState('')

  const from = useMemo(() => now - WEEKS * 7 * DAY_MS, [now])
  const sessions = useLiveQuery(() => listDoneSessions(), [], undefined)
  const exercises = useLiveQuery(() => listExercises(), [], undefined)
  const sets = useLiveQuery(
    (): Promise<SetEntry[]> => listSetsBetween(from, now + DAY_MS),
    [from],
    undefined,
  )

  const data = useMemo(() => {
    if (!sessions || !exercises || !sets) return null

    const exerciseMap = new Map(exercises.map((exercise) => [exercise.id, exercise]))
    const currentWeek = weekKeyOf(now)
    const weekKeys = weekKeysBetween(from, now)
    const weeklyWorkouts = weeklyWorkoutCounts(sessions)
    const perWeekMuscles = weeklySetsByMuscle(sets, exerciseMap)

    // Pinottu kaavio käyttää neljää liikeryhmää – 18 lihasryhmän väripaletti
    // ei olisi luettava eikä värisokeusturvallinen (PLAN.md §7).
    const bars = weekKeys.map((key) => {
      const weekSets = sets.filter((set) => weekKeyOf(set.completedAt) === key)
      const groups = setsByMovementGroup(weekSets, exerciseMap)
      return {
        key,
        label: formatWeekKey(key).replace('vk ', ''),
        values: groups as unknown as Record<string, number>,
      }
    })

    /*
      Oletusvalinta on viimeisin viikko, jossa on työsarjoja: kesken oleva
      viikko voi olla tyhjä, eikä tyhjä jakauma kerro mitään.
    */
    const latestWithData = [...weekKeys].reverse().find((key) => (perWeekMuscles.get(key)?.size ?? 0) > 0)
    const activeWeek = selectedWeek ?? latestWithData ?? currentWeek
    const muscleCounts = perWeekMuscles.get(activeWeek) ?? new Map<MuscleId, number>()
    const muscleItems = MUSCLE_ORDER.filter((id) => (muscleCounts.get(id) ?? 0) > 0).map((id) => ({
      id,
      label: muscleLabel(id),
      value: muscleCounts.get(id) ?? 0,
    }))

    // Lämpökartan kuormitus 0–1 suhteessa ohjealueen ylärajaan.
    const muscleIntensity: Partial<Record<MuscleId, number>> = {}
    for (const [muscle, value] of muscleCounts) {
      muscleIntensity[muscle] = Math.min(1, value / Math.max(1, settings.weeklySetsRange.max))
    }

    const groupTotals = setsByMovementGroup(sets, exerciseMap)
    const volumeTotal = sets.reduce((sum, set) => sum + Math.max(0, set.weight) * set.reps, 0)

    // Tuoreimmat ennätykset: viimeisen 60 päivän sarjoista.
    const bySetExercise = new Map<string, SetEntry[]>()
    for (const set of sets) {
      const list = bySetExercise.get(set.exerciseId)
      if (list) list.push(set)
      else bySetExercise.set(set.exerciseId, [set])
    }
    const recentRecords = [...bySetExercise.entries()]
      .flatMap(([exerciseId, exerciseSets]) => {
        const exercise = exerciseMap.get(exerciseId)
        if (!exercise) return []
        const records = computeRecords(exerciseSets)
        return Object.entries(records.best).flatMap(([kind, entry]) =>
          entry && entry.set.completedAt >= now - 60 * DAY_MS
            ? [
                {
                  exerciseId,
                  name: exercise.name,
                  kind: kind as Parameters<typeof recordLabel>[0],
                  value: entry.value,
                  at: entry.set.completedAt,
                },
              ]
            : [],
        )
      })
      .sort((a, b) => b.at - a.at)
      .slice(0, 5)

    const exercisesWithHistory = [...bySetExercise.keys()]
      .flatMap((id) => {
        const exercise = exerciseMap.get(id)
        return exercise ? [exercise] : []
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'fi'))

    return {
      currentWeek,
      activeWeek,
      bars,
      muscleItems,
      muscleIntensity,
      groupTotals,
      volumeTotal,
      recentRecords,
      exercisesWithHistory,
      weekDone: weeklyWorkouts.get(currentWeek) ?? 0,
      streak: targetStreak(weeklyWorkouts, settings.weeklyTarget, currentWeek),
      sessionCount: sessions.length,
      groupCount: groupSetsBySession(sets).length,
    }
  }, [
    sessions,
    exercises,
    sets,
    now,
    from,
    selectedWeek,
    settings.weeklyTarget,
    settings.weeklySetsRange,
  ])

  if (data === null) return <ScreenSkeleton />

  if (data.sessionCount === 0) {
    return (
      <>
        <ScreenHeader title="Analyysi" />
        <EmptyState
          title="Ei vielä dataa"
          description="Kirjaa ensimmäinen treeni, niin viikkosarjat, tasapaino ja ennätykset ilmestyvät tähän."
          icon={<AnalysisIcon size={28} />}
        />
      </>
    )
  }

  const groupMax = Math.max(1, ...Object.values(data.groupTotals))
  const filteredExercises = data.exercisesWithHistory.filter((exercise) =>
    exercise.name.toLocaleLowerCase('fi').includes(query.trim().toLocaleLowerCase('fi')),
  )

  return (
    <>
      <ScreenHeader title="Analyysi" subtitle={`${WEEKS} viikon jakso`} />

      <div className="space-y-3 px-4 pt-3 pb-6">
        <Card className="flex items-center gap-4 p-4">
          <ProgressRing
            progress={settings.weeklyTarget > 0 ? data.weekDone / settings.weeklyTarget : 0}
            size={60}
            strokeWidth={6}
            tone={data.weekDone >= settings.weeklyTarget ? 'good' : 'accent'}
            label={`Viikkotavoite ${data.weekDone} / ${settings.weeklyTarget}`}
          >
            <span className="num text-sm font-semibold">
              {data.weekDone}/{settings.weeklyTarget}
            </span>
          </ProgressRing>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold">Viikkotavoite</h2>
            <p className="num mt-0.5 text-xs text-muted">{formatWorkoutCount(data.weekDone)} tällä viikolla</p>
            <p className="num text-xs text-muted">
              {formatVolume(data.volumeTotal)} / {WEEKS} vk
            </p>
            {data.streak > 0 ? (
              <Badge variant="good" icon={<FlameIcon size={14} />} className="mt-1.5">
                {data.streak} viikon putki
              </Badge>
            ) : null}
          </div>
        </Card>

        <Card className="p-3">
          <h2 className="px-1 text-sm font-semibold">Työsarjat viikoittain</h2>
          <p className="px-1 pb-2 text-xs text-muted">
            Napauta viikkoa nähdäksesi sen lihasryhmäjakauman.
          </p>
          <StackedBarChart
            series={SERIES}
            bars={data.bars}
            formatValue={(value) => `${formatSets(value)} sarjaa`}
            selectedKey={data.activeWeek}
            onSelect={(key) => setSelectedWeek(key)}
            ariaLabel="Työsarjat liikeryhmittäin viikoittain"
          />
        </Card>

        <Card className="p-4">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold">Viikkosarjat lihasryhmittäin</h2>
            <span className="num text-xs text-muted">{formatWeekKey(data.activeWeek)}</span>
          </div>
          {data.muscleItems.length === 0 ? (
            <p className="mt-2 text-sm text-muted">Ei työsarjoja tällä viikolla.</p>
          ) : (
            <div className="mt-3 space-y-4">
              {/* Lihaskartta kertoo yhdellä silmäyksellä, mikä jäi treenaamatta. */}
              <div className="flex justify-center">
                <MuscleMap view="both" intensity={data.muscleIntensity} className="w-44" />
              </div>
              <RangeBars
                items={data.muscleItems}
                range={settings.weeklySetsRange}
                formatValue={formatSets}
                ariaLabel="Viikkosarjat lihasryhmittäin"
              />
            </div>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="text-sm font-semibold">Push / Pull / Legs -tasapaino</h2>
          <ul className="mt-3 space-y-2">
            {SERIES.map((item) => {
              const value = data.groupTotals[item.id as MovementGroup]
              return (
                <li key={item.id} className="flex items-center gap-2">
                  <span className="w-24 shrink-0 text-xs text-muted">{item.label}</span>
                  <span className="h-5 min-w-0 flex-1 overflow-hidden rounded-md bg-surface-2">
                    <span
                      className="block h-full rounded-md"
                      style={{
                        width: `${(value / groupMax) * 100}%`,
                        backgroundColor: `var(${item.colorVar})`,
                      }}
                    />
                  </span>
                  <span className="num w-10 shrink-0 text-right text-xs">{formatSets(value)}</span>
                </li>
              )
            })}
          </ul>
          <p className="mt-2 text-xs text-muted">
            Mittarina työsarjat: kehonpainoliikkeillä ei ole kilogrammavolyymia.
          </p>
        </Card>

        {data.recentRecords.length > 0 ? (
          <Card>
            <h2 className="flex items-center gap-2 px-4 pt-3 pb-1 text-sm font-semibold">
              <TrophyIcon size={16} className="text-record" />
              Tuoreimmat ennätykset
            </h2>
            <ul className="divide-y divide-border">
              {data.recentRecords.map((record) => (
                <li key={`${record.exerciseId}-${record.kind}`}>
                  <ListRow
                    to={`/analysis/exercise/${record.exerciseId}`}
                    title={record.name}
                    subtitle={`${recordLabel(record.kind)} · ${formatShortDate(record.at)}`}
                    trailing={
                      <span className="num text-sm">
                        {record.kind === 'best_set_volume'
                          ? formatVolume(record.value)
                          : `${formatNumber(Math.round(record.value * 10) / 10)} kg`}
                      </span>
                    }
                  />
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        <Card>
          <h2 className="px-4 pt-3 pb-2 text-sm font-semibold">Liikekohtainen analyysi</h2>
          <div className="px-4 pb-2">
            <TextField
              label="Hae liikettä"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Esim. penkki"
              type="search"
              autoComplete="off"
            />
          </div>
          {filteredExercises.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-muted">Ei osumia.</p>
          ) : (
            <ul className="divide-y divide-border">
              {filteredExercises.slice(0, 12).map((exercise) => (
                <li key={exercise.id}>
                  <ListRow
                    to={`/analysis/exercise/${exercise.id}`}
                    title={exercise.name}
                    leading={<SearchIcon size={18} className="text-faint" />}
                  />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <button
          type="button"
          className="w-full py-2 text-center text-sm text-muted"
          onClick={() => void navigate('/history')}
        >
          Avaa historia
        </button>
      </div>
    </>
  )
}
