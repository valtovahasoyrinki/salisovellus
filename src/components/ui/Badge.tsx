import type { ReactNode } from 'react'

/** Pieni merkintä: ennätys, arkistoitu, parannus (SPEC §6.5, §7). */
export type BadgeVariant = 'neutral' | 'good' | 'record' | 'danger'

/*
  Tekstin kontrasti mitattu molemmissa teemoissa (WCAG AA, 4,5:1):
  vihreä ja punainen kestävät oman sävyisen läpikuultavan pinnan päällä,
  mutta kulta (--record) ei yllä vaaleassa teemassa 4,5:1:een millään pinnalla,
  joten ennätysmerkin teksti on --text ja väri tulee reunasta ja ikonista.
*/
const VARIANTS: Record<BadgeVariant, string> = {
  neutral: 'border-border bg-surface-2 text-muted',
  good: 'border-good/45 bg-good/12 text-good',
  record: 'border-record/60 bg-record/12 text-text [&>svg]:text-record',
  danger: 'border-danger/45 bg-danger/12 text-danger',
}

export interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  icon?: ReactNode
  className?: string
}

export function Badge({ children, variant = 'neutral', icon, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium ${VARIANTS[variant]} ${className}`}
    >
      {icon}
      {children}
    </span>
  )
}
