import { motion, useReducedMotion } from 'motion/react'

/**
 * Vaakapalkit ohjealueen kanssa (SPEC §6.8): viikkosarjat lihasryhmittäin ja
 * ohjealue 10–20 työsarjaa.
 *
 * Vaakapalkit 18 lihasryhmälle ovat luettavampi kuin yhtä monen värin pinottu
 * palkki – yksi värisarja riittää, kun vertailukohta on ohjealue eikä toinen
 * lihasryhmä (PLAN.md §7).
 */
export interface RangeBarItem {
  id: string
  label: string
  value: number
}

export interface RangeBarsProps {
  items: RangeBarItem[]
  range: { min: number; max: number }
  formatValue: (value: number) => string
  ariaLabel: string
}

export function RangeBars({ items, range, formatValue, ariaLabel }: RangeBarsProps) {
  const reduced = useReducedMotion()
  const max = Math.max(range.max * 1.25, ...items.map((item) => item.value), 1)

  return (
    <ul className="space-y-1.5" aria-label={ariaLabel}>
      {items.map((item) => {
        const below = item.value < range.min
        const above = item.value > range.max
        return (
          <li key={item.id} className="flex items-center gap-2">
            <span className="w-28 shrink-0 truncate text-xs text-muted">{item.label}</span>
            <span className="relative h-6 min-w-0 flex-1 overflow-hidden rounded-md bg-surface-2">
              {/* Ohjealue taustana: palkin pituus kertoo suhteen siihen. */}
              <span
                className="absolute inset-y-0 bg-surface-3"
                style={{
                  left: `${(range.min / max) * 100}%`,
                  width: `${((range.max - range.min) / max) * 100}%`,
                }}
                aria-hidden="true"
              />
              <motion.span
                className="absolute inset-y-0 left-0 rounded-r-md"
                style={{
                  backgroundColor: below
                    ? 'var(--warn)'
                    : above
                      ? 'var(--chart-4)'
                      : 'var(--chart-1)',
                }}
                initial={reduced ? false : { width: 0 }}
                animate={{ width: `${Math.min(100, (item.value / max) * 100)}%` }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              />
            </span>
            <span className="num w-9 shrink-0 text-right text-xs">{formatValue(item.value)}</span>
          </li>
        )
      })}
      <li className="num flex items-center gap-2 pt-1 text-[0.625rem] text-faint">
        <span className="w-28 shrink-0" />
        <span>
          Ohjealue {range.min}–{range.max} työsarjaa viikossa
        </span>
      </li>
    </ul>
  )
}
