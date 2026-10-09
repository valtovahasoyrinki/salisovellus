import { useMemo } from 'react'
import type { DateKey } from '@/domain/types'
import { DAY_MS, addDaysToDateKey, dateKeyOf, formatShortDate, startOfIsoWeek } from '@/lib/date'

/**
 * Treenipäivien lämpökartta (SPEC §6.7): viikot sarakkeina, maanantai ylinnä.
 *
 * Sekventiaalinen ramppi, yksi sävy: tummempi tausta = ei treeniä, kirkkaampi
 * = enemmän työsarjoja.
 */
export interface HeatmapProps {
  /** Työsarjojen määrä päivittäin. */
  countsByDate: Map<DateKey, number>
  /** Montako viikkoa näytetään (viimeisin viimeisenä). */
  weeks?: number
  onSelect?: (dateKey: DateKey) => void
  selectedDate?: DateKey | null
  /** Viimeisin näytettävä hetki. Kutsuja antaa kellon, jotta render on puhdas. */
  now: number
}

/** Vain joka toinen viikonpäivä nimetään, jotta sarake pysyy kapeana. */
const WEEKDAYS = [
  { id: 'ma', label: 'ma' },
  { id: 'ti', label: '' },
  { id: 'ke', label: 'ke' },
  { id: 'to', label: '' },
  { id: 'pe', label: 'pe' },
  { id: 'la', label: '' },
  { id: 'su', label: 'su' },
]

function heatToken(count: number, max: number): string {
  if (count <= 0) return 'var(--heat-0)'
  const ratio = count / Math.max(1, max)
  if (ratio <= 0.25) return 'var(--heat-1)'
  if (ratio <= 0.5) return 'var(--heat-2)'
  if (ratio <= 0.75) return 'var(--heat-3)'
  return 'var(--heat-4)'
}

export function Heatmap({ countsByDate, weeks = 16, onSelect, selectedDate, now }: HeatmapProps) {
  const columns = useMemo(() => {
    const thisWeekMonday = startOfIsoWeek(now)
    const result: Array<{ key: string; days: Array<{ dateKey: DateKey; count: number }> }> = []

    for (let weekIndex = weeks - 1; weekIndex >= 0; weekIndex -= 1) {
      // Keskipäivän lisäys pitää viikon oikeana myös kesäaikasiirtymän yli.
      const monday = startOfIsoWeek(thisWeekMonday - weekIndex * 7 * DAY_MS + DAY_MS / 2)
      const mondayKey = dateKeyOf(monday)
      result.push({
        key: mondayKey,
        days: Array.from({ length: 7 }, (_, dayIndex) => {
          const dateKey = addDaysToDateKey(mondayKey, dayIndex)
          return { dateKey, count: countsByDate.get(dateKey) ?? 0 }
        }),
      })
    }
    return result
  }, [countsByDate, weeks, now])

  const max = useMemo(() => Math.max(1, ...countsByDate.values()), [countsByDate])

  return (
    <div className="flex gap-1.5">
      <div className="flex flex-col gap-1 pt-0.5">
        {WEEKDAYS.map((weekday) => (
          <span key={weekday.id} className="num h-4 text-[0.5625rem] leading-4 text-faint">
            {weekday.label}
          </span>
        ))}
      </div>
      <div className="flex min-w-0 flex-1 justify-between gap-1 overflow-x-auto">
        {columns.map((column) => (
          <div key={column.key} className="flex flex-col gap-1">
            {column.days.map((day) => (
              <button
                key={day.dateKey}
                type="button"
                onClick={() => onSelect?.(day.dateKey)}
                aria-label={`${formatShortDate(new Date(`${day.dateKey}T12:00:00`).getTime())}: ${day.count} työsarjaa`}
                className={`size-4 rounded-[3px] ${
                  selectedDate === day.dateKey ? 'ring-2 ring-accent' : ''
                }`}
                style={{ backgroundColor: heatToken(day.count, max) }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
