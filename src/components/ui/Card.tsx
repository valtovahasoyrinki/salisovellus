import type { ReactNode } from 'react'

export function Card({
  children,
  className = '',
  as: Tag = 'div',
  id,
}: {
  children: ReactNode
  className?: string
  as?: 'div' | 'section' | 'article' | 'li'
  /** Ankkuri vierittämiseen (esim. kesken treenin luotu liikekortti). */
  id?: string
}) {
  return (
    <Tag id={id} className={`rounded-[var(--radius-card)] border border-border bg-surface-1 ${className}`}>
      {children}
    </Tag>
  )
}

export function CardHeader({ title, subtitle, action }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 pt-4">
      <div className="min-w-0">
        <h2 className="truncate text-[0.9375rem] font-semibold text-text">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-xs text-muted">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  )
}
