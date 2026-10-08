/**
 * Päivämäärälogiikka. Ainoa paikka, jossa aikavyöhykettä ja viikkoja lasketaan.
 *
 * Kaikki muotoilu on kiinnitetty Helsingin aikavyöhykkeeseen ja fi-FI-asuun
 * (SPEC §2), joten näkymät ovat oikein myös jos laite on toisella vyöhykkeellä.
 * Viikko on ISO-viikko (alkaa maanantaista).
 */
import type { DateKey, Timestamp, WeekKey } from '@/domain/types'

export const TIME_ZONE = 'Europe/Helsinki'
export const DAY_MS = 86_400_000

const WEEKDAYS_SHORT = ['ma', 'ti', 'ke', 'to', 'pe', 'la', 'su'] as const
const WEEKDAYS_LONG = [
  'maanantai',
  'tiistai',
  'keskiviikko',
  'torstai',
  'perjantai',
  'lauantai',
  'sunnuntai',
] as const
const MONTHS = [
  'tammikuu',
  'helmikuu',
  'maaliskuu',
  'huhtikuu',
  'toukokuu',
  'kesäkuu',
  'heinäkuu',
  'elokuu',
  'syyskuu',
  'lokakuu',
  'marraskuu',
  'joulukuu',
] as const

const partsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

export interface ZonedParts {
  year: number
  /** 1–12 */
  month: number
  day: number
  hour: number
  minute: number
  second: number
  /** 1 = maanantai … 7 = sunnuntai */
  isoWeekday: number
}

function pad(value: number, length = 2): string {
  return String(value).padStart(length, '0')
}

function isoWeekdayOf(year: number, month: number, day: number): number {
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  return weekday === 0 ? 7 : weekday
}

/** Aikaleima puretaan Helsingin seinäkellon osiin. */
export function zonedParts(ts: Timestamp): ZonedParts {
  const parts = partsFormatter.formatToParts(ts)
  const get = (type: Intl.DateTimeFormatPartTypes): number => {
    const part = parts.find((candidate) => candidate.type === type)
    return part ? Number(part.value) : 0
  }
  const year = get('year')
  const month = get('month')
  const day = get('day')
  return {
    year,
    month,
    day,
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
    isoWeekday: isoWeekdayOf(year, month, day),
  }
}

/**
 * Helsingin seinäkellon aika epoch-millisekunneiksi.
 *
 * Kaksi kierrosta riittää myös kesäaikasiirtymissä: ensimmäinen arvaus
 * korjataan vyöhykesiirtymällä, toinen varmistaa tuloksen siirtymätunnin
 * molemmin puolin.
 */
export function epochFromZoned(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
): Timestamp {
  const asUtc = Date.UTC(year, month - 1, day, hour, minute, second)
  let ts = asUtc
  for (let i = 0; i < 3; i += 1) {
    const parts = zonedParts(ts)
    const zonedAsUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    )
    const offset = zonedAsUtc - ts
    const next = asUtc - offset
    if (next === ts) break
    ts = next
  }
  return ts
}

export function dateKeyOf(ts: Timestamp): DateKey {
  const { year, month, day } = zonedParts(ts)
  return `${year}-${pad(month)}-${pad(day)}`
}

export function parseDateKey(key: DateKey): { year: number; month: number; day: number } {
  const [year, month, day] = key.split('-').map(Number)
  return { year: year ?? 0, month: month ?? 1, day: day ?? 1 }
}

/** Päivän alku (00:00 Helsinkiä) annetusta hetkestä. */
export function startOfDay(ts: Timestamp): Timestamp {
  const { year, month, day } = zonedParts(ts)
  return epochFromZoned(year, month, day)
}

/** Päivän loppu (23:59:59.999 Helsinkiä). */
export function endOfDay(ts: Timestamp): Timestamp {
  return startOfDay(ts + DAY_MS) - 1
}

/** Aikaleima päiväavaimesta, oletuksena klo 18:00 paikallista aikaa (jälkikirjaus). */
export function timestampFromDateKey(key: DateKey, hour = 18, minute = 0): Timestamp {
  const { year, month, day } = parseDateKey(key)
  return epochFromZoned(year, month, day, hour, minute)
}

export function addDaysToDateKey(key: DateKey, days: number): DateKey {
  const { year, month, day } = parseDateKey(key)
  return dateKeyOf(epochFromZoned(year, month, day, 12) + days * DAY_MS)
}

/** Kokonaisia kalenteripäiviä avainten välillä (b − a). */
export function daysBetweenDateKeys(a: DateKey, b: DateKey): number {
  const pa = parseDateKey(a)
  const pb = parseDateKey(b)
  return Math.round(
    (Date.UTC(pb.year, pb.month - 1, pb.day) - Date.UTC(pa.year, pa.month - 1, pa.day)) / DAY_MS,
  )
}

export interface IsoWeek {
  year: number
  week: number
}

export function isoWeekOf(ts: Timestamp): IsoWeek {
  const { year, month, day } = zonedParts(ts)
  const utcDate = Date.UTC(year, month - 1, day)
  const mondayIndex = (new Date(utcDate).getUTCDay() + 6) % 7
  const thursday = utcDate + (3 - mondayIndex) * DAY_MS
  const isoYear = new Date(thursday).getUTCFullYear()
  const firstThursday = Date.UTC(isoYear, 0, 4)
  const firstMondayIndex = (new Date(firstThursday).getUTCDay() + 6) % 7
  const firstWeekMonday = firstThursday - firstMondayIndex * DAY_MS
  const week = Math.floor((thursday - firstWeekMonday) / (7 * DAY_MS)) + 1
  return { year: isoYear, week }
}

export function weekKeyOf(ts: Timestamp): WeekKey {
  const { year, week } = isoWeekOf(ts)
  return `${year}-W${pad(week)}`
}

/** Maanantai 00:00 Helsinkiä. */
export function startOfIsoWeek(ts: Timestamp): Timestamp {
  const parts = zonedParts(ts)
  const mondayUtc = Date.UTC(parts.year, parts.month - 1, parts.day) - (parts.isoWeekday - 1) * DAY_MS
  const monday = new Date(mondayUtc)
  return epochFromZoned(monday.getUTCFullYear(), monday.getUTCMonth() + 1, monday.getUTCDate())
}

/** Viikkoavaimet aikajärjestyksessä väliltä [from, to] (molemmat mukana). */
export function weekKeysBetween(from: Timestamp, to: Timestamp): WeekKey[] {
  const keys: WeekKey[] = []
  let cursor = startOfIsoWeek(from)
  const last = startOfIsoWeek(to)
  while (cursor <= last) {
    keys.push(weekKeyOf(cursor))
    // Keskipäivä + 7 vrk välttää kesäaikasiirtymän tunnin heiton.
    cursor = startOfIsoWeek(cursor + 7 * DAY_MS + DAY_MS / 2)
  }
  return keys
}

export function monthKeyOf(ts: Timestamp): string {
  const { year, month } = zonedParts(ts)
  return `${year}-${pad(month)}`
}

/* --- Muotoilu --------------------------------------------------------------- */

/** "ma 12.10." */
export function formatShortDate(ts: Timestamp): string {
  const { day, month, isoWeekday } = zonedParts(ts)
  return `${WEEKDAYS_SHORT[isoWeekday - 1]} ${day}.${month}.`
}

/** "ma 12.10.2026" */
export function formatDate(ts: Timestamp): string {
  const { year, day, month, isoWeekday } = zonedParts(ts)
  return `${WEEKDAYS_SHORT[isoWeekday - 1]} ${day}.${month}.${year}`
}

/** "maanantai 12.10.2026" */
export function formatDateLong(ts: Timestamp): string {
  const { year, day, month, isoWeekday } = zonedParts(ts)
  return `${WEEKDAYS_LONG[isoWeekday - 1]} ${day}.${month}.${year}`
}

/** "18:05" */
export function formatTime(ts: Timestamp): string {
  const { hour, minute } = zonedParts(ts)
  return `${pad(hour)}:${pad(minute)}`
}

/** "Lokakuu 2026" */
export function formatMonthYear(ts: Timestamp): string {
  const { year, month } = zonedParts(ts)
  const name = MONTHS[month - 1] ?? ''
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${year}`
}

/** "Tänään", "Eilen" tai "ma 12.10." */
export function formatDayLabel(ts: Timestamp, now: Timestamp = Date.now()): string {
  const diff = daysBetweenDateKeys(dateKeyOf(ts), dateKeyOf(now))
  if (diff === 0) return 'Tänään'
  if (diff === 1) return 'Eilen'
  return formatShortDate(ts)
}

/** Ajastinasu "2:30" tai "12:05". Negatiivinen rajataan nollaan. */
export function formatClock(totalSeconds: number): string {
  const clamped = Math.max(0, Math.round(totalSeconds))
  const minutes = Math.floor(clamped / 60)
  return `${minutes}:${pad(clamped % 60)}`
}

/** Treenin kesto: "1 h 12 min" tai "48 min". */
export function formatDuration(totalSeconds: number): string {
  const clamped = Math.max(0, Math.round(totalSeconds))
  const hours = Math.floor(clamped / 3600)
  const minutes = Math.round((clamped % 3600) / 60)
  if (hours === 0) return `${minutes} min`
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`
}

/** "vk 41" */
export function formatWeekKey(key: WeekKey): string {
  const week = Number(key.slice(6))
  return `vk ${week}`
}
