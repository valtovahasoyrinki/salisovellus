import { NavLink, useLocation, useNavigate } from 'react-router'
import { motion } from 'motion/react'
import { AnalysisIcon, DumbbellIcon, HistoryIcon, HomeIcon, ProgramIcon } from '@/components/icons'
import { haptic } from '@/lib/haptics'

const ITEMS = [
  { to: '/', label: 'Koti', Icon: HomeIcon },
  { to: '/history', label: 'Historia', Icon: HistoryIcon },
  { to: '/analysis', label: 'Analyysi', Icon: AnalysisIcon },
  { to: '/program', label: 'Ohjelma', Icon: ProgramIcon },
] as const

export interface BottomNavProps {
  /** Käynnissä oleva treeni: painike vaihtuu "Jatka treeniä" -pikakuvakkeeksi. */
  activeSessionId?: string
}

export function BottomNav({ activeSessionId }: BottomNavProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const onWorkout = location.pathname.startsWith('/workout')

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface-1/95 backdrop-blur-xl safe-bottom"
      aria-label="Päänavigaatio"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-between px-1">
        {ITEMS.slice(0, 2).map((item) => (
          <NavItem key={item.to} {...item} />
        ))}

        <button
          type="button"
          onClick={() => {
            haptic('tap')
            void navigate(activeSessionId ? `/workout/${activeSessionId}` : '/workout/new')
          }}
          className="relative -mt-5 flex min-h-12 w-16 flex-col items-center justify-start"
          aria-label={activeSessionId ? 'Jatka treeniä' : 'Aloita treeni'}
        >
          <motion.span
            whileTap={{ scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className={`flex size-14 items-center justify-center rounded-full border shadow-[var(--shadow-float)] ${
              onWorkout || activeSessionId
                ? 'border-accent bg-accent text-accent-ink'
                : 'border-border-strong bg-surface-3 text-text'
            }`}
          >
            <DumbbellIcon size={26} />
          </motion.span>
          <span className="mt-1 text-[0.625rem] font-medium text-muted">
            {activeSessionId ? 'Jatka' : 'Treeni'}
          </span>
        </button>

        {ITEMS.slice(2).map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </div>
    </nav>
  )
}

function NavItem({ to, label, Icon }: (typeof ITEMS)[number]) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      onClick={() => haptic('tap')}
      className={({ isActive }) =>
        `flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[0.625rem] font-medium transition-colors ${
          isActive ? 'text-text' : 'text-faint'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={22} />
          <span>{label}</span>
          {isActive ? (
            <motion.span
              layoutId="nav-indicator"
              className="absolute top-0 h-0.5 w-8 rounded-full bg-accent"
              transition={{ type: 'spring', stiffness: 450, damping: 35 }}
            />
          ) : null}
        </>
      )}
    </NavLink>
  )
}
