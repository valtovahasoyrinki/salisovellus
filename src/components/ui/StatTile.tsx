import type { ReactNode } from 'react'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'

/**
 * Yksi luku + selite + valinnainen muutos (SPEC §6.5, §6.8).
 * Vihreä vain parannukselle, heikompi tulos neutraalisti – ei punaista (§7).
 */
/** Oletusmuotoilu muutokselle: pelkkä etumerkki. Moduulitasolla, jotta viite pysyy samana. */
function defaultFormatDelta(value: number): string {
  return value > 0 ? `+${value}` : String(value)
}

export interface StatTileProps {
  label: string
  value: number
  format: (value: number) => string
  /** Muutos edelliseen kertaan. Etumerkki määrää sävyn. */
  delta?: number
  formatDelta?: (value: number) => string
  /** Mittari, jossa pienempi luku on parempi (esim. lepoaika). */
  lowerIsBetter?: boolean
  icon?: ReactNode
  className?: string
}

export function StatTile({
  label,
  value,
  format,
  delta,
  formatDelta = defaultFormatDelta,
  lowerIsBetter = false,
  icon,
  className = '',
}: StatTileProps) {
  const improved = delta === undefined ? false : lowerIsBetter ? delta < 0 : delta > 0

  return (
    <div
      className={`flex min-w-0 flex-col gap-1 rounded-[var(--radius-card)] border border-border bg-surface-1 px-3 py-2.5 ${className}`}
    >
      <div className="flex items-center gap-1.5 text-muted">
        {icon}
        <span className="truncate text-[0.6875rem] font-medium tracking-wide uppercase">{label}</span>
      </div>
      <AnimatedNumber
        value={value}
        format={format}
        className="text-xl font-semibold tracking-tight text-text"
      />
      {delta === undefined || delta === 0 ? null : (
        <span className={`num text-xs font-medium ${improved ? 'text-good' : 'text-muted'}`}>
          {formatDelta(delta)}
        </span>
      )}
    </div>
  )
}
