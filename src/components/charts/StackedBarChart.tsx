import { useMemo } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { useChartWidth } from './useChartWidth'

/**
 * Pinottu palkkikaavio viikoittain (SPEC §6.8).
 *
 * Segmenttien väliin jää 2 px pintaväriä, jotta vierekkäiset sarjat erottuvat
 * myös värisokealle; sarjat on lisäksi nimetty selitteessä.
 */
export interface StackSeries {
  id: string
  label: string
  /** CSS-muuttujan nimi, esim. "--chart-1". */
  colorVar: string
}

export interface StackedBarChartProps {
  series: StackSeries[]
  bars: Array<{ key: string; label: string; values: Record<string, number> }>
  formatValue: (value: number) => string
  height?: number
  selectedKey?: string | null
  onSelect?: (key: string) => void
  ariaLabel: string
}

const GAP = 2
const PADDING = { top: 10, bottom: 20 }

export function StackedBarChart({
  series,
  bars,
  formatValue,
  height = 180,
  selectedKey,
  onSelect,
  ariaLabel,
}: StackedBarChartProps) {
  const [ref, width] = useChartWidth()
  const reduced = useReducedMotion()

  const layout = useMemo(() => {
    const totals = bars.map((bar) =>
      series.reduce((sum, item) => sum + (bar.values[item.id] ?? 0), 0),
    )
    const max = Math.max(1, ...totals)
    const innerHeight = Math.max(1, height - PADDING.top - PADDING.bottom)
    const slot = width / Math.max(1, bars.length)
    const barWidth = Math.max(6, Math.min(28, slot - 6))
    return { totals, max, innerHeight, slot, barWidth }
  }, [bars, series, width, height])

  if (bars.length === 0) {
    return (
      <div ref={ref} className="flex items-center justify-center text-sm text-muted" style={{ height }}>
        Ei vielä dataa
      </div>
    )
  }

  return (
    <div ref={ref}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel}>
        {bars.map((bar, index) => {
          const centerX = layout.slot * index + layout.slot / 2
          const total = layout.totals[index] ?? 0
          let cursorY = PADDING.top + layout.innerHeight
          const selected = selectedKey === bar.key

          return (
            <g key={bar.key}>
              {series.map((item) => {
                const value = bar.values[item.id] ?? 0
                if (value <= 0) return null
                const segmentHeight = (value / layout.max) * layout.innerHeight - GAP
                if (segmentHeight <= 0) return null
                cursorY -= segmentHeight + GAP
                return (
                  <motion.rect
                    key={item.id}
                    x={centerX - layout.barWidth / 2}
                    y={cursorY}
                    width={layout.barWidth}
                    height={segmentHeight}
                    rx="3"
                    fill={`var(${item.colorVar})`}
                    opacity={selectedKey && !selected ? 0.45 : 1}
                    initial={reduced ? false : { scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    style={{ transformOrigin: `center ${cursorY + segmentHeight}px` }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  />
                )
              })}

              {/* Kosketusalue on palkkia leveämpi, jotta osuminen on helppoa. */}
              <rect
                x={layout.slot * index}
                y={0}
                width={layout.slot}
                height={height}
                fill="transparent"
                role={onSelect ? 'button' : undefined}
                aria-label={`${bar.label}: ${formatValue(total)}`}
                onPointerDown={() => onSelect?.(bar.key)}
              />

              <text
                x={centerX}
                y={height - 6}
                textAnchor="middle"
                fontSize="9"
                className="num"
                fill={selected ? 'var(--text)' : 'var(--text-faint)'}
              >
                {bar.label}
              </text>
            </g>
          )
        })}
      </svg>

      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {series.map((item) => (
          <li key={item.id} className="flex items-center gap-1.5 text-xs text-muted">
            <span
              className="size-2.5 rounded-[3px]"
              style={{ backgroundColor: `var(${item.colorVar})` }}
              aria-hidden="true"
            />
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  )
}
