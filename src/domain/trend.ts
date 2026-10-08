/**
 * Kehityksen trendi (SPEC §6.6, §6.8): lineaarinen regressio parhaista
 * e1RM-arvoista, ilmaistuna prosentteina neljää viikkoa kohti.
 *
 * Trendi näytetään vain, jos datapisteitä on vähintään 4 – harvemmalla
 * aineistolla suora kertoo enemmän sattumasta kuin kehityksestä.
 */
import { bestE1rm } from './e1rm'
import type { SessionSetGroup } from './sessionGroups'
import { dateKeyOf, daysBetweenDateKeys } from '@/lib/date'

export const TREND_MIN_POINTS = 4
const DAYS_PER_PERIOD = 28

export interface TrendPoint {
  /** Päiviä ensimmäisestä pisteestä (kalenteripäiviä, kesäaikaturvallinen). */
  x: number
  y: number
}

export interface TrendResult {
  /** Regressiosuoran muutos prosentteina 4 viikossa. */
  changePctPer4Weeks: number
  pointCount: number
  firstValue: number
  lastValue: number
  /** Suoran kulmakerroin yksikköinä/päivä – analyysikaavion trendiviiva. */
  slopePerDay: number
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Pienimmän neliösumman suora. `null`, jos pisteitä on alle kaksi tai kaikki
 * pisteet ovat samalla x-koordinaatilla (suoraa ei ole määritelty).
 */
export function linearRegression(
  points: Array<{ x: number; y: number }>,
): { slope: number; intercept: number } | null {
  if (points.length < 2) return null

  let sumX = 0
  let sumY = 0
  for (const point of points) {
    sumX += point.x
    sumY += point.y
  }
  const meanX = sumX / points.length
  const meanY = sumY / points.length

  let covariance = 0
  let variance = 0
  for (const point of points) {
    const dx = point.x - meanX
    covariance += dx * (point.y - meanY)
    variance += dx * dx
  }
  if (variance === 0) return null

  const slope = covariance / variance
  return { slope, intercept: meanY - slope * meanX }
}

/** Parhaat e1RM-pisteet kerroittain, x = päiviä ensimmäisestä kerrasta. */
export function e1rmPoints(groups: SessionSetGroup[]): TrendPoint[] {
  const values: Array<{ completedAt: number; value: number }> = []
  for (const group of groups) {
    const best = bestE1rm(group.sets)
    if (best) values.push({ completedAt: group.completedAt, value: best.value })
  }
  const first = values[0]
  if (!first) return []

  const firstKey = dateKeyOf(first.completedAt)
  return values.map((entry) => ({
    x: daysBetweenDateKeys(firstKey, dateKeyOf(entry.completedAt)),
    y: entry.value,
  }))
}

export function e1rmTrend(groups: SessionSetGroup[]): TrendResult | null {
  const points = e1rmPoints(groups)
  if (points.length < TREND_MIN_POINTS) return null

  const line = linearRegression(points)
  if (!line) return null

  const firstValue = points[0]?.y ?? 0
  const lastValue = points.at(-1)?.y ?? 0
  // Vertailutaso on suoran arvo ensimmäisessä pisteessä (x = 0 → intercept).
  // Jos suora alkaa nollasta tai sen alta, käytetään ensimmäistä mittausta.
  const baseline = line.intercept > 0 ? line.intercept : firstValue
  const changePctPer4Weeks =
    baseline > 0 ? round2(((line.slope * DAYS_PER_PERIOD) / baseline) * 100) : 0

  return {
    changePctPer4Weeks,
    pointCount: points.length,
    firstValue,
    lastValue,
    slopePerDay: line.slope,
  }
}
