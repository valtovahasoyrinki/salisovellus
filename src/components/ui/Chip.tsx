import type { ReactNode } from 'react'
import { haptic } from '@/lib/haptics'

/**
 * Suodatinvalinta (SPEC §6.2: liikekirjaston haku ja suodatus lihasryhmittäin).
 * Valinta näkyy sekä täytöstä että reunasta – pelkkä väri ei riitä salin
 * valaistuksessa eikä värisokealle.
 */
export interface ChipProps {
  label: string
  selected: boolean
  onClick: () => void
  /** Osumien määrä suodattimen perässä, esim. "Rinta 12". */
  count?: number
  icon?: ReactNode
}

export function Chip({ label, selected, onClick, count, icon }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => {
        haptic('tap')
        onClick()
      }}
      className={`flex min-h-12 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm whitespace-nowrap transition-colors ${
        selected
          ? 'border-accent bg-accent text-accent-ink font-semibold'
          : 'border-border bg-surface-2 text-muted'
      }`}
    >
      {icon}
      {label}
      {count === undefined ? null : (
        <span className={`num text-xs ${selected ? 'text-accent-ink/70' : 'text-muted'}`}>{count}</span>
      )}
    </button>
  )
}

/**
 * Vaakavieritettävä suodatinrivi. Vierii vain vaakasuunnassa, koko leveydeltä:
 * negatiivinen marginaali antaa chipsien jatkua ruudun reunaan asti.
 */
export function ChipRow({
  children,
  label,
  className = '',
}: {
  children: ReactNode
  label: string
  className?: string
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={`-mx-4 flex gap-2 overflow-x-auto overscroll-x-contain px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
    >
      {children}
    </div>
  )
}
