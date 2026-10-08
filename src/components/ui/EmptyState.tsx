import type { ReactNode } from 'react'

/** Tyhjä tila = ohje + toiminto, ei pelkkä tyhjä ruutu (SPEC §7). */
export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string
  description: string
  action?: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center px-8 py-12 text-center">
      {icon ? <div className="mb-3 text-faint">{icon}</div> : null}
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-muted">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
