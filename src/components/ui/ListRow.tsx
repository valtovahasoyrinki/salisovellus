import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ChevronRightIcon } from '@/components/icons'
import { haptic } from '@/lib/haptics'

/**
 * Listarivi: asetukset, liikekirjasto ja ohjelma käyttävät samaa riviä, jotta
 * kosketusalue ja kohdistus pysyvät samoina koko sovelluksessa (≥ 56 px).
 * `to` tekee rivistä linkin, `onClick` painikkeen; muuten rivi on pelkkä tieto.
 */
export interface ListRowProps {
  title: ReactNode
  subtitle?: ReactNode
  /** Ikoni tai liikkeen oma kuva vasemmassa reunassa. */
  leading?: ReactNode
  /** Oikea reuna: arvo, kytkin tai merkintä. Ilman tätä navigointirivi saa nuolen. */
  trailing?: ReactNode
  to?: string
  onClick?: () => void
  className?: string
}

export function ListRow({ title, subtitle, leading, trailing, to, onClick, className = '' }: ListRowProps) {
  const interactive = to !== undefined || onClick !== undefined
  const base = `flex w-full min-h-14 items-center gap-3 px-4 py-2.5 text-left ${className}`

  const content = (
    <>
      {leading ? (
        <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-2 text-muted">
          {leading}
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.9375rem] text-text">{title}</span>
        {subtitle ? <span className="mt-0.5 block truncate text-xs text-muted">{subtitle}</span> : null}
      </span>
      {trailing ?? (interactive ? <ChevronRightIcon className="shrink-0 text-faint" size={20} /> : null)}
    </>
  )

  if (to !== undefined) {
    return (
      <Link to={to} className={`${base} active:bg-surface-2`} onClick={() => haptic('tap')}>
        {content}
      </Link>
    )
  }

  if (onClick !== undefined) {
    return (
      <button
        type="button"
        className={`${base} active:bg-surface-2`}
        onClick={() => {
          haptic('tap')
          onClick()
        }}
      >
        {content}
      </button>
    )
  }

  return <div className={base}>{content}</div>
}

/** Rivien erotin: ohut viiva vain rivien väliin, ei listan reunoihin. */
export function ListGroup({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`divide-y divide-border overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface-1 ${className}`}
    >
      {children}
    </div>
  )
}
