import { useId, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { decimate } from '@/lib/decimate'
import { formatShortDate } from '@/lib/date'
import { useChartWidth } from './useChartWidth'

/**
 * Aikasarjakaavio (SPEC §6.8). Oma SVG, koska kosketustooltip halutaan
 * toimimaan yhdellä pointer-kuulijalla ja binäärihaulla ilman komponenttipuun
 * uudelleenrenderöintiä, ja koska usean vuoden data pitää harventaa itse.
 *
 * Yksi sarja, joten selitettä ei tarvita – otsikko kertoo mittarin.
 */
export interface LinePoint {
  /** Aikaleima. */
  t: number
  value: number
  /** Ennätyspiste merkitään kaavioon (SPEC §6.8). */
  record?: boolean
}

export interface LineChartProps {
  points: LinePoint[]
  /** Arvon muotoilu tooltipiin, yksikkö mukaan lukien. */
  formatValue: (value: number) => string
  /** Lyhyempi muotoilu y-akselille, jossa tilaa on vain muutama merkki. */
  formatAxis?: (value: number) => string
  /** Trendiviiva päistään: lineaarisen regression arvot. */
  trend?: { from: number; to: number } | null
  height?: number
  ariaLabel: string
  /** Valittu piste nostetaan esiin ja kutsuja näyttää sen tiedot. */
  selectedT?: number | null
  onSelect?: (point: LinePoint | null) => void
}

const PADDING = { top: 14, right: 12, bottom: 22, left: 40 }
/** Yli tämän pistemäärän polku harvennetaan piirtoa varten. */
const DECIMATE_LIMIT = 400

export function LineChart({
  points,
  formatValue,
  formatAxis,
  trend,
  height = 220,
  ariaLabel,
  selectedT,
  onSelect,
}: LineChartProps) {
  const [ref, width] = useChartWidth()
  const gradientId = useId()
  const reduced = useReducedMotion()
  const [hoverT, setHoverT] = useState<number | null>(null)

  const chart = useMemo(() => {
    if (points.length === 0) return null

    const sorted = [...points].sort((a, b) => a.t - b.t)
    const values = sorted.map((point) => point.value)
    const minValue = Math.min(...values)
    const maxValue = Math.max(...values)
    // Pieni marginaali ylä- ja alareunaan, jotta pisteet eivät osu kehyksiin.
    /*
      Tasainen sarja keskitetään: ilman tätä yhden arvon käyrä piirtyisi
      kiinni yläreunaan ja näyttäisi katkaistulta.
    */
    const span = maxValue - minValue
    const pad = span < 1e-6 ? Math.max(1, Math.abs(maxValue) * 0.1) : span * 0.12
    const low = Math.max(0, minValue - pad)
    const high = maxValue + pad

    const minT = sorted[0]?.t ?? 0
    const maxT = sorted.at(-1)?.t ?? minT + 1
    const spanT = Math.max(1, maxT - minT)
    const innerWidth = Math.max(1, width - PADDING.left - PADDING.right)
    const innerHeight = Math.max(1, height - PADDING.top - PADDING.bottom)

    const x = (t: number): number => PADDING.left + ((t - minT) / spanT) * innerWidth
    const y = (value: number): number =>
      PADDING.top + innerHeight - ((value - low) / Math.max(1e-6, high - low)) * innerHeight

    const screenPoints = sorted.map((point) => ({ ...point, x: x(point.t), y: y(point.value) }))
    const drawn = decimate(screenPoints, DECIMATE_LIMIT)

    const line = drawn.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ')
    const firstDrawn = drawn[0]
    const lastDrawn = drawn.at(-1)
    const area =
      firstDrawn && lastDrawn
        ? `${line} L${lastDrawn.x.toFixed(1)} ${(PADDING.top + innerHeight).toFixed(1)} L${firstDrawn.x.toFixed(1)} ${(PADDING.top + innerHeight).toFixed(1)} Z`
        : ''

    const ticks = [low, (low + high) / 2, high]

    return {
      sorted,
      screenPoints,
      line,
      area,
      ticks,
      x,
      y,
      minT,
      maxT,
      baseline: PADDING.top + innerHeight,
      trendLine:
        trend && screenPoints.length > 1
          ? { x1: x(minT), y1: y(trend.from), x2: x(maxT), y2: y(trend.to) }
          : null,
    }
  }, [points, width, height, trend])

  if (chart === null) {
    return (
      <div ref={ref} className="flex items-center justify-center text-sm text-muted" style={{ height }}>
        Ei vielä dataa
      </div>
    )
  }

  const activeT = hoverT ?? selectedT ?? null
  const active =
    activeT === null
      ? null
      : chart.screenPoints.reduce((best, point) =>
          Math.abs(point.t - activeT) < Math.abs(best.t - activeT) ? point : best,
        )

  /** Lähin piste osoittimen x-koordinaatista – binäärihaku järjestetystä listasta. */
  const pointAtClientX = (clientX: number, rect: DOMRect): LinePoint | null => {
    const localX = clientX - rect.left
    let low = 0
    let high = chart.screenPoints.length - 1
    while (low < high) {
      const mid = (low + high) >> 1
      const current = chart.screenPoints[mid]
      if (!current) break
      if (current.x < localX) low = mid + 1
      else high = mid
    }
    const candidate = chart.screenPoints[low]
    const previous = chart.screenPoints[Math.max(0, low - 1)]
    if (!candidate) return null
    if (previous && Math.abs(previous.x - localX) < Math.abs(candidate.x - localX)) return previous
    return candidate
  }

  return (
    <div ref={ref} className="relative select-none">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={ariaLabel}
        className="touch-pan-y"
        onPointerDown={(event) => {
          const point = pointAtClientX(event.clientX, event.currentTarget.getBoundingClientRect())
          setHoverT(point?.t ?? null)
          onSelect?.(point ?? null)
        }}
        onPointerMove={(event) => {
          if (event.buttons === 0 && event.pointerType === 'mouse') return
          const point = pointAtClientX(event.clientX, event.currentTarget.getBoundingClientRect())
          setHoverT(point?.t ?? null)
          onSelect?.(point ?? null)
        }}
        onPointerLeave={() => setHoverT(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-fill-from)" />
            <stop offset="100%" stopColor="var(--chart-fill-to)" />
          </linearGradient>
        </defs>

        {/* Ruudukko ja asteikko ovat tarkoituksella vaimeita. */}
        {chart.ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={PADDING.left}
              x2={width - PADDING.right}
              y1={chart.y(tick)}
              y2={chart.y(tick)}
              stroke="var(--chart-grid)"
              strokeWidth="1"
            />
            <text
              x={PADDING.left - 6}
              y={chart.y(tick) + 4}
              textAnchor="end"
              className="num"
              fontSize="10"
              fill="var(--text-faint)"
            >
              {(formatAxis ?? formatValue)(tick)}
            </text>
          </g>
        ))}

        <text x={PADDING.left} y={height - 6} fontSize="10" fill="var(--text-faint)" className="num">
          {formatShortDate(chart.minT)}
        </text>
        <text
          x={width - PADDING.right}
          y={height - 6}
          textAnchor="end"
          fontSize="10"
          fill="var(--text-faint)"
          className="num"
        >
          {formatShortDate(chart.maxT)}
        </text>

        <path d={chart.area} fill={`url(#${gradientId})`} />

        {chart.trendLine ? (
          <line
            x1={chart.trendLine.x1}
            y1={chart.trendLine.y1}
            x2={chart.trendLine.x2}
            y2={chart.trendLine.y2}
            stroke="var(--text-faint)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
        ) : null}

        <motion.path
          d={chart.line}
          fill="none"
          stroke="var(--chart-line)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={reduced ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        />

        {/* Ennätykset merkitään kaavioon kultaisella renkaalla. */}
        {chart.screenPoints
          .filter((point) => point.record)
          .map((point) => (
            <circle
              key={`record-${point.t}`}
              cx={point.x}
              cy={point.y}
              r="4.5"
              fill="var(--surface-1)"
              stroke="var(--record)"
              strokeWidth="2"
            />
          ))}

        {active ? (
          <g>
            <line
              x1={active.x}
              x2={active.x}
              y1={PADDING.top}
              y2={chart.baseline}
              stroke="var(--border-strong)"
              strokeWidth="1"
            />
            <circle
              cx={active.x}
              cy={active.y}
              r="5"
              fill="var(--chart-line)"
              stroke="var(--surface-1)"
              strokeWidth="2"
            />
          </g>
        ) : null}
      </svg>

      {active ? (
        <div
          className="pointer-events-none absolute top-1 rounded-lg border border-border bg-surface-2 px-2 py-1 text-xs shadow-[var(--shadow-float)]"
          style={{
            left: Math.min(Math.max(active.x - 50, 0), Math.max(0, width - 104)),
            width: 104,
          }}
        >
          <p className="num font-semibold">{formatValue(active.value)}</p>
          <p className="num text-[0.625rem] text-muted">{formatShortDate(active.t)}</p>
        </div>
      ) : null}
    </div>
  )
}
