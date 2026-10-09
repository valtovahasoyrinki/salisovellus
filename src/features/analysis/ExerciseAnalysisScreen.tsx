import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { getExercise } from '@/db/repositories/exerciseRepo'
import { listSetsForExercise } from '@/db/repositories/sessionRepo'
import { bestE1rm, setE1rm } from '@/domain/e1rm'
import { computeRecords, recordLabel } from '@/domain/records'
import { groupSetsBySession, type SessionSetGroup } from '@/domain/sessionGroups'
import { detectStagnation } from '@/domain/stagnation'
import { e1rmTrend } from '@/domain/trend'
import { bestSetByReps, heaviestSet, totalVolume, workSets } from '@/domain/volume'
import type { Exercise, RecordKind, SetEntry } from '@/domain/types'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { ScreenSkeleton } from '@/components/ui/Skeleton'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { LineChart, type LinePoint } from '@/components/charts/LineChart'
import { AnalysisIcon, TrophyIcon } from '@/components/icons'
import { DAY_MS, formatDate, formatShortDate } from '@/lib/date'
import { formatNumber, formatPercentDelta, formatVolume, formatWeight } from '@/lib/format'
import { useNow } from '@/lib/useNow'

type Metric = 'e1rm' | 'heaviest' | 'volume' | 'reps'
type Range = '1m' | '3m' | '6m' | '1y' | 'all'

const METRICS: Array<{ value: Metric; label: string }> = [
  { value: 'e1rm', label: 'e1RM' },
  { value: 'heaviest', label: 'Raskain' },
  { value: 'volume', label: 'Volyymi' },
  { value: 'reps', label: 'Toistot' },
]

/** Ennätykset näytetään aina samassa järjestyksessä. */
const RECORD_ORDER: RecordKind[] = ['heaviest', 'best_e1rm', 'most_reps_at_weight', 'best_set_volume']

const RANGES: Array<{ value: Range; label: string; days: number | null }> = [
  { value: '1m', label: '1 kk', days: 30 },
  { value: '3m', label: '3 kk', days: 90 },
  { value: '6m', label: '6 kk', days: 182 },
  { value: '1y', label: '1 v', days: 365 },
  { value: 'all', label: 'Kaikki', days: null },
]

/** Kertakohtainen arvo valitulla mittarilla. */
function metricValue(metric: Metric, group: SessionSetGroup): number | null {
  const sets = workSets(group.sets)
  if (sets.length === 0) return null
  switch (metric) {
    case 'e1rm':
      return bestE1rm(sets)?.value ?? null
    case 'heaviest':
      return heaviestSet(sets)?.weight ?? null
    case 'volume':
      return totalVolume(sets)
    case 'reps':
      return bestSetByReps(sets)?.reps ?? null
  }
}

export default function ExerciseAnalysisScreen() {
  const { exerciseId = '' } = useParams()
  const navigate = useNavigate()
  const [metric, setMetric] = useState<Metric>('e1rm')
  const [range, setRange] = useState<Range>('3m')
  const [selectedT, setSelectedT] = useState<number | null>(null)
  const now = useNow(60_000)

  const exercise = useLiveQuery(
    async () => (await getExercise(exerciseId)) ?? null,
    [exerciseId],
    undefined,
  )
  const allSets = useLiveQuery(
    (): Promise<SetEntry[]> => listSetsForExercise(exerciseId),
    [exerciseId],
    undefined,
  )

  // Kehonpaino- ja kestoliikkeillä e1RM ei ole mielekäs (PLAN.md §7, oletus 13).
  const defaultMetric: Metric = exercise?.kind === 'weight_reps' ? 'e1rm' : 'reps'
  const activeMetric = exercise && exercise.kind !== 'weight_reps' && metric === 'e1rm' ? defaultMetric : metric

  const data = useMemo(() => {
    if (!allSets) return null
    const groups = groupSetsBySession(allSets)
    const days = RANGES.find((item) => item.value === range)?.days ?? null
    const from = days === null ? 0 : now - days * DAY_MS
    const visible = groups.filter((group) => group.completedAt >= from)

    const records = computeRecords(allSets)
    const recordSetIds = new Set(
      Object.values(records.best).flatMap((entry) => (entry ? [entry.set.id] : [])),
    )

    const points: LinePoint[] = visible.flatMap((group) => {
      const value = metricValue(activeMetric, group)
      if (value === null) return []
      return [
        {
          t: group.completedAt,
          value,
          record: group.sets.some((set) => recordSetIds.has(set.id)),
        },
      ]
    })

    const trendResult = activeMetric === 'e1rm' ? e1rmTrend(visible) : null
    const stagnation = detectStagnation(groups, now)

    return { groups, visible, points, records, trendResult, stagnation }
  }, [allSets, range, activeMetric, now])

  const selectedGroup = useMemo(() => {
    if (!data || selectedT === null) return null
    return data.visible.find((group) => group.completedAt === selectedT) ?? null
  }, [data, selectedT])

  if (exercise === undefined || data === null) return <ScreenSkeleton />
  if (exercise === null) {
    return (
      <>
        <ScreenHeader title="Analyysi" back="/analysis" />
        <p className="px-4 pt-6 text-sm text-muted">Liikettä ei löytynyt.</p>
      </>
    )
  }

  if (data.groups.length === 0) {
    return (
      <>
        <ScreenHeader title={exercise.name} back="/analysis" />
        <EmptyState
          title="Ei vielä kirjauksia"
          description="Kirjaa liikkeestä ensimmäinen treeni, niin käyrä ja ennätykset ilmestyvät tähän."
          icon={<AnalysisIcon size={28} />}
        />
      </>
    )
  }

  const format = (value: number): string => {
    if (activeMetric === 'volume') return formatVolume(value)
    if (activeMetric === 'reps') return formatNumber(value)
    return `${formatNumber(Math.round(value * 10) / 10)} kg`
  }

  const metricOptions = METRICS.filter(
    (item) => item.value !== 'e1rm' || exercise.kind === 'weight_reps',
  )

  return (
    <>
      <ScreenHeader
        title={exercise.name}
        subtitle={`${data.groups.length} kertaa kirjattu`}
        back="/analysis"
      />

      <div className="space-y-3 px-4 pt-3 pb-6">
        <SegmentedControl
          options={metricOptions}
          value={activeMetric}
          onChange={setMetric}
          ariaLabel="Mittari"
        />
        <SegmentedControl
          options={RANGES.map(({ value, label }) => ({ value, label }))}
          value={range}
          onChange={setRange}
          ariaLabel="Aikaväli"
        />

        <Card className="p-3">
          <div className="flex items-baseline justify-between gap-2 px-1 pb-1">
            <h2 className="text-sm font-semibold">
              {METRICS.find((item) => item.value === activeMetric)?.label}
            </h2>
            {data.trendResult ? (
              <span
                className={`num text-xs ${
                  data.trendResult.changePctPer4Weeks > 0 ? 'text-good' : 'text-muted'
                }`}
              >
                {formatPercentDelta(data.trendResult.changePctPer4Weeks)} / 4 vk
              </span>
            ) : (
              <span className="text-xs text-faint">Trendi vaatii 4 kertaa</span>
            )}
          </div>
          <LineChart
            points={data.points}
            formatValue={format}
            formatAxis={(value) => formatNumber(Math.round(value * 10) / 10)}
            ariaLabel={`${exercise.name}: ${METRICS.find((item) => item.value === activeMetric)?.label} aikajanalla`}
            trend={
              data.trendResult && data.points.length > 1
                ? { from: data.trendResult.firstValue, to: data.trendResult.lastValue }
                : null
            }
            selectedT={selectedT}
            onSelect={(point) => setSelectedT(point?.t ?? null)}
          />
        </Card>

        {selectedGroup ? (
          <Card className="p-4">
            <h2 className="text-sm font-semibold">{formatDate(selectedGroup.completedAt)}</h2>
            <ul className="num mt-2 space-y-1 text-sm">
              {selectedGroup.sets.map((set, index) => (
                <li key={set.id} className="flex justify-between gap-3">
                  <span className="text-muted">
                    {set.warmup ? 'Lämmittely' : `Sarja ${index + 1}`}
                  </span>
                  <span>
                    {formatWeight(set.weight)} × {set.reps}
                    {setE1rm(set) === null ? '' : ` · e1RM ${formatNumber(setE1rm(set) ?? 0)}`}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        ) : (
          <p className="px-1 text-xs text-muted">Napauta kaaviota nähdäksesi kerran sarjat.</p>
        )}

        {data.stagnation.stagnant ? (
          <Card className="border-warn/40 p-4">
            <h2 className="text-sm font-semibold">Junnaa</h2>
            <p className="num mt-1 text-sm text-muted">
              Ei uutta e1RM-ennätystä {data.stagnation.sessionsSinceRecord} kerran aikana (
              {data.stagnation.weeksSinceRecord} viikkoa). Vaihda toistoaluetta tai kevennä viikko.
            </p>
          </Card>
        ) : null}

        <Card className="p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <TrophyIcon size={16} className="text-record" />
            Ennätykset
          </h2>
          <ul className="mt-2 space-y-1.5 text-sm">
            {RECORD_ORDER.flatMap((kind) => {
              const record = data.records.best[kind]
              if (!record) return []
              return [
                <li key={kind} className="flex items-baseline justify-between gap-3">
                  <span className="text-muted">{recordLabel(kind)}</span>
                  <span className="num text-right">
                    {kind === 'most_reps_at_weight'
                      ? `${record.set.reps} × ${formatWeight(record.set.weight)}`
                      : kind === 'best_set_volume'
                        ? formatVolume(record.value)
                        : `${formatNumber(record.value)} kg`}
                    <span className="block text-[0.625rem] text-faint">
                      {formatShortDate(record.set.completedAt)}
                    </span>
                  </span>
                </li>,
              ]
            })}
          </ul>
        </Card>

        <Card className="p-4">
          <h2 className="text-sm font-semibold">Edellinen vs. paras</h2>
          <PreviousVsBest groups={data.groups} exercise={exercise} />
        </Card>

        <button
          type="button"
          className="w-full py-2 text-center text-sm text-muted"
          onClick={() => void navigate(`/exercises/${exercise.id}`)}
        >
          Avaa liikkeen tiedot
        </button>
      </div>
    </>
  )
}

/** Viimeisin kerta suhteessa parhaaseen (SPEC §6.8). */
function PreviousVsBest({ groups, exercise }: { groups: SessionSetGroup[]; exercise: Exercise }) {
  const last = groups.at(-1)
  if (!last) return null

  const useE1rm = exercise.kind === 'weight_reps'
  const lastValue = useE1rm
    ? (bestE1rm(workSets(last.sets))?.value ?? null)
    : (bestSetByReps(workSets(last.sets))?.reps ?? null)

  const bestValue = groups.reduce<number | null>((best, group) => {
    const value = useE1rm
      ? (bestE1rm(workSets(group.sets))?.value ?? null)
      : (bestSetByReps(workSets(group.sets))?.reps ?? null)
    if (value === null) return best
    return best === null || value > best ? value : best
  }, null)

  if (lastValue === null || bestValue === null) {
    return <p className="mt-1 text-sm text-muted">Ei vertailukelpoisia työsarjoja.</p>
  }

  const diffPct = bestValue === 0 ? 0 : ((lastValue - bestValue) / bestValue) * 100
  const unit = useE1rm ? ' kg' : ' toistoa'

  return (
    <div className="num mt-2 flex items-end justify-between gap-3 text-sm">
      <div>
        <p className="text-xs text-muted">Viimeksi</p>
        <p className="text-lg font-semibold">
          {formatNumber(Math.round(lastValue * 10) / 10)}
          {unit}
        </p>
      </div>
      <div className="text-right">
        <p className="text-xs text-muted">Paras</p>
        <p className="text-lg font-semibold">
          {formatNumber(Math.round(bestValue * 10) / 10)}
          {unit}
        </p>
      </div>
      <Badge variant={diffPct >= 0 ? 'good' : 'neutral'}>
        {diffPct === 0 ? 'Tasoissa' : formatPercentDelta(diffPct)}
      </Badge>
    </div>
  )
}
