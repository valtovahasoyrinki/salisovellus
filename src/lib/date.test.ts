import { describe, expect, it } from 'vitest'
import {
  addDaysToDateKey,
  dateKeyOf,
  daysBetweenDateKeys,
  endOfDay,
  formatClock,
  formatDayLabel,
  formatDuration,
  formatMonthYear,
  formatShortDate,
  isoWeekOf,
  startOfDay,
  startOfIsoWeek,
  timestampFromDateKey,
  weekKeyOf,
  weekKeysBetween,
  zonedParts,
} from './date'

const ts = (iso: string): number => Date.parse(iso)

describe('päiväavain Helsingin aikavyöhykkeessä', () => {
  it('käyttää Helsingin vuorokautta, ei UTC:tä', () => {
    // 21:30 UTC on jo seuraava päivä Helsingissä (UTC+3 kesäaikana).
    expect(dateKeyOf(ts('2026-10-08T21:30:00Z'))).toBe('2026-10-09')
    expect(dateKeyOf(ts('2026-10-08T12:00:00Z'))).toBe('2026-10-08')
  })

  it('päivän alku ja loppu rajaavat täsmälleen yhden vuorokauden', () => {
    const start = startOfDay(ts('2026-10-08T12:00:00Z'))
    expect(start).toBe(ts('2026-10-07T21:00:00Z'))
    expect(endOfDay(start)).toBe(start + 86_400_000 - 1)
  })
})

describe('kesäaikasiirtymä', () => {
  it('kevään siirtymäpäivä on 23 tuntia', () => {
    const start = startOfDay(ts('2026-03-29T10:00:00Z'))
    expect(start).toBe(ts('2026-03-28T22:00:00Z'))
    // Seuraavan päivän alku on vain 23 h myöhemmin: kello siirtyi eteenpäin.
    const nextStart = startOfDay(ts('2026-03-30T10:00:00Z'))
    expect((nextStart - start) / 3_600_000).toBe(23)
  })

  it('syksyn siirtymäpäivä on 25 tuntia', () => {
    const start = startOfDay(ts('2026-10-25T10:00:00Z'))
    expect(start).toBe(ts('2026-10-24T21:00:00Z'))
    const nextStart = startOfDay(ts('2026-10-26T10:00:00Z'))
    expect((nextStart - start) / 3_600_000).toBe(25)
  })

  it('päiväavaimen aikaleima osuu oikeaan päivään myös siirtymäpäivänä', () => {
    expect(dateKeyOf(timestampFromDateKey('2026-03-29'))).toBe('2026-03-29')
    expect(dateKeyOf(timestampFromDateKey('2026-10-25'))).toBe('2026-10-25')
  })

  it('päivien lisäys ei liu u siirtymän yli', () => {
    expect(addDaysToDateKey('2026-03-28', 1)).toBe('2026-03-29')
    expect(addDaysToDateKey('2026-10-24', 2)).toBe('2026-10-26')
    expect(daysBetweenDateKeys('2026-03-28', '2026-03-30')).toBe(2)
  })
})

describe('ISO-viikot', () => {
  it('viikko alkaa maanantaista', () => {
    // Sunnuntai 11.10.2026 kuuluu samaan viikkoon kuin maanantai 5.10.
    expect(startOfIsoWeek(ts('2026-10-11T10:00:00Z'))).toBe(startOfIsoWeek(ts('2026-10-05T10:00:00Z')))
    expect(zonedParts(startOfIsoWeek(ts('2026-10-11T10:00:00Z'))).isoWeekday).toBe(1)
  })

  it('vuodenvaihde ratkeaa torstaisäännöllä', () => {
    // 1.1.2027 on perjantai -> kuuluu vuoden 2026 viikkoon 53.
    expect(weekKeyOf(ts('2027-01-01T10:00:00Z'))).toBe('2026-W53')
    // 1.1.2026 on torstai -> vuoden 2026 ensimmäinen viikko.
    expect(weekKeyOf(ts('2026-01-01T10:00:00Z'))).toBe('2026-W01')
    expect(isoWeekOf(ts('2026-12-28T10:00:00Z'))).toEqual({ year: 2026, week: 53 })
  })

  it('viikkoavaimet ovat katkeamaton sarja kesäaikasiirtymän yli', () => {
    const keys = weekKeysBetween(ts('2026-10-05T10:00:00Z'), ts('2026-11-09T10:00:00Z'))
    expect(keys).toEqual(['2026-W41', '2026-W42', '2026-W43', '2026-W44', '2026-W45', '2026-W46'])
    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe('muotoilu', () => {
  it('lyhyt päivämäärä on muodossa "to 8.10."', () => {
    expect(formatShortDate(ts('2026-10-08T12:00:00Z'))).toBe('to 8.10.')
  })

  it('kuukausiotsikko on isolla alkukirjaimella', () => {
    expect(formatMonthYear(ts('2026-10-08T12:00:00Z'))).toBe('Lokakuu 2026')
  })

  it('tänään ja eilen tunnistetaan', () => {
    const now = ts('2026-10-08T12:00:00Z')
    expect(formatDayLabel(now, now)).toBe('Tänään')
    expect(formatDayLabel(ts('2026-10-07T12:00:00Z'), now)).toBe('Eilen')
    expect(formatDayLabel(ts('2026-10-06T12:00:00Z'), now)).toBe('ti 6.10.')
  })

  it('ajastin ja kesto muotoillaan luettavasti', () => {
    expect(formatClock(150)).toBe('2:30')
    expect(formatClock(-5)).toBe('0:00')
    expect(formatClock(605)).toBe('10:05')
    expect(formatDuration(45)).toBe('45 s')
    expect(formatDuration(2880)).toBe('48 min')
    expect(formatDuration(4320)).toBe('1 h 12 min')
    expect(formatDuration(7200)).toBe('2 h')
  })
})
