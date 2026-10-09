import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { listDoneSessions, listSetsBetween } from '@/db/repositories/sessionRepo'
import { workSets } from '@/domain/volume'
import type { DateKey, Session, SetEntry } from '@/domain/types'
import { Card } from '@/components/ui/Card'
import { Collapsible } from '@/components/ui/Collapsible'
import { EmptyState } from '@/components/ui/EmptyState'
import { ListRow } from '@/components/ui/ListRow'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { ScreenSkeleton } from '@/components/ui/Skeleton'
import { Heatmap } from '@/components/charts/Heatmap'
import { CalendarIcon, HistoryIcon } from '@/components/icons'
import {
  DAY_MS,
  dateKeyOf,
  formatDuration,
  formatMonthYear,
  formatShortDate,
  formatTime,
  monthKeyOf,
} from '@/lib/date'
import { formatSetCount, formatVolume } from '@/lib/format'
import { useNow } from '@/lib/useNow'

/** Lämpökartan pituus viikkoina. */
const HEATMAP_WEEKS = 16

export default function HistoryScreen() {
  const now = useNow(60_000)
  const [selectedDate, setSelectedDate] = useState<DateKey | null>(null)

  const sessions = useLiveQuery(() => listDoneSessions(), [], undefined)
  const heatmapSets = useLiveQuery(
    (): Promise<SetEntry[]> => listSetsBetween(now - HEATMAP_WEEKS * 7 * DAY_MS, now + DAY_MS),
    [now],
    undefined,
  )

  const months = useMemo(() => {
    if (!sessions) return null
    const grouped = new Map<string, Session[]>()
    for (const session of sessions) {
      const key = monthKeyOf(session.startedAt)
      const list = grouped.get(key)
      if (list) list.push(session)
      else grouped.set(key, [session])
    }
    return [...grouped.entries()]
  }, [sessions])

  const countsByDate = useMemo(() => {
    const counts = new Map<DateKey, number>()
    for (const set of heatmapSets ?? []) {
      if (set.warmup) continue
      const key = dateKeyOf(set.completedAt)
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return counts
  }, [heatmapSets])

  const setsBySession = useLiveQuery(
    async (): Promise<Map<string, SetEntry[]>> => {
      const recent = await listDoneSessions()
      const earliest = recent.at(-1)?.startedAt ?? Date.now()
      const all = await listSetsBetween(earliest - DAY_MS, Date.now() + DAY_MS)
      const map = new Map<string, SetEntry[]>()
      for (const set of all) {
        const list = map.get(set.sessionId)
        if (list) list.push(set)
        else map.set(set.sessionId, [set])
      }
      return map
    },
    [],
    undefined,
  )

  if (months === null) return <ScreenSkeleton />

  if (months.length === 0) {
    return (
      <>
        <ScreenHeader title="Historia" />
        <EmptyState
          title="Ei treenejä vielä"
          description="Kirjatut treenit kerääntyvät tähän kuukausittain. Myös unohtuneen treenin voi lisätä jälkikäteen."
          icon={<HistoryIcon size={28} />}
        />
      </>
    )
  }

  const selectedSessions =
    selectedDate === null
      ? []
      : (sessions ?? []).filter((session) => session.dateKey === selectedDate)

  return (
    <>
      <ScreenHeader title="Historia" subtitle={`${sessions?.length ?? 0} treeniä`} />

      <div className="space-y-3 px-4 pt-3 pb-6">
        <Card className="p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <CalendarIcon size={16} className="text-muted" />
            Viimeiset {HEATMAP_WEEKS} viikkoa
          </h2>
          <div className="mt-3">
            <Heatmap
              countsByDate={countsByDate}
              weeks={HEATMAP_WEEKS}
              now={now}
              selectedDate={selectedDate}
              onSelect={(dateKey) => setSelectedDate(dateKey === selectedDate ? null : dateKey)}
            />
          </div>
          {selectedDate === null ? null : (
            <div className="mt-3 border-t border-border pt-3">
              <p className="num text-xs text-muted">
                {formatShortDate(new Date(`${selectedDate}T12:00:00`).getTime())}
              </p>
              {selectedSessions.length === 0 ? (
                <p className="mt-1 text-sm text-muted">Ei treeniä tänä päivänä.</p>
              ) : (
                <ul className="mt-1 space-y-1">
                  {selectedSessions.map((session) => (
                    <li key={session.id}>
                      <ListRow
                        to={`/history/${session.id}`}
                        title={session.dayName}
                        subtitle={formatTime(session.startedAt)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Card>

        {months.map(([monthKey, monthSessions]) => {
          const first = monthSessions[0]
          if (!first) return null
          const monthVolume = monthSessions.reduce((sum, session) => {
            const sets = setsBySession?.get(session.id) ?? []
            return sum + workSets(sets).reduce((acc, set) => acc + Math.max(0, set.weight) * set.reps, 0)
          }, 0)

          return (
            <Collapsible
              key={monthKey}
              title={formatMonthYear(first.startedAt)}
              subtitle={`${monthSessions.length} treeniä`}
              trailing={<span className="num text-xs text-muted">{formatVolume(monthVolume)}</span>}
              defaultOpen={months[0]?.[0] === monthKey}
            >
              <ul className="divide-y divide-border">
                {monthSessions.map((session) => {
                  const sets = workSets(setsBySession?.get(session.id) ?? [])
                  const volume = sets.reduce((acc, set) => acc + Math.max(0, set.weight) * set.reps, 0)
                  return (
                    <li key={session.id}>
                      <ListRow
                        to={`/history/${session.id}`}
                        title={session.dayName}
                        subtitle={`${formatShortDate(session.startedAt)} · ${formatSetCount(sets.length)}${
                          session.endedAt
                            ? ` · ${formatDuration((session.endedAt - session.startedAt) / 1000)}`
                            : ''
                        }`}
                        trailing={<span className="num text-xs text-muted">{formatVolume(volume)}</span>}
                      />
                    </li>
                  )
                })}
              </ul>
            </Collapsible>
          )
        })}
      </div>
    </>
  )
}
