import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { ChevronLeftIcon } from '@/components/icons'
import { IconButton } from '@/components/ui/Button'

export interface ScreenHeaderProps {
  title: string
  subtitle?: string
  /** Takaisin-painike. Jos annettu polku, navigoi sinne, muuten askel taakse. */
  back?: string | true
  action?: ReactNode
}

export function ScreenHeader({ title, subtitle, back, action }: ScreenHeaderProps) {
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/85 px-2 backdrop-blur-xl safe-top">
      <div className="flex min-h-14 items-center gap-1">
        {back ? (
          <IconButton
            label="Takaisin"
            onClick={() => {
              if (back === true) void navigate(-1)
              else void navigate(back)
            }}
          >
            <ChevronLeftIcon />
          </IconButton>
        ) : (
          <span className="w-2" />
        )}
        <div className="min-w-0 flex-1 px-1">
          <h1 className="truncate text-lg font-semibold tracking-tight">{title}</h1>
          {subtitle ? <p className="truncate text-xs text-muted">{subtitle}</p> : null}
        </div>
        {action}
      </div>
    </header>
  )
}
