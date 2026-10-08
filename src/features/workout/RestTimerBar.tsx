import { AnimatePresence, motion } from 'motion/react'
import { useRestTimer } from '@/app/providers/RestTimerProvider'
import { Button } from '@/components/ui/Button'
import { formatClock } from '@/lib/date'

/**
 * Kelluva lepoajastin (SPEC §6.4): jäljellä oleva aika, edistymisrengas sekä
 * −15 s / +15 s / ohita. Näkyy koko treenin ajan, myös muissa näkymissä.
 */
export function RestTimerBar({ inWorkout }: { inWorkout: boolean }) {
  const { state, remainingSec, finished, adjust, skip } = useRestTimer()

  const bottomClass = inWorkout
    ? 'bottom-[calc(env(safe-area-inset-bottom,0px)+0.75rem)]'
    : 'bottom-[calc(env(safe-area-inset-bottom,0px)+5.25rem)]'

  return (
    <AnimatePresence>
      {state ? (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
          className={`fixed inset-x-3 z-40 mx-auto max-w-lg ${bottomClass}`}
        >
          <div
            className={`flex items-center gap-3 rounded-2xl border bg-surface-2/95 px-3 py-2.5 backdrop-blur-xl shadow-[var(--shadow-float)] ${
              finished ? 'border-good' : 'border-border'
            }`}
          >
            <ProgressRing
              remainingSec={remainingSec}
              totalSec={state.totalSec}
              finished={finished}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-muted">
                {finished ? 'Lepo ohi' : 'Lepo'} · {state.exerciseName}
              </p>
              <p className={`num text-xl font-semibold tabular-nums ${finished ? 'text-good' : 'text-text'}`}>
                {formatClock(remainingSec)}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="secondary" onClick={() => adjust(-15)} aria-label="Vähennä 15 sekuntia">
                −15
              </Button>
              <Button size="sm" variant="secondary" onClick={() => adjust(15)} aria-label="Lisää 15 sekuntia">
                +15
              </Button>
              <Button size="sm" variant={finished ? 'primary' : 'ghost'} onClick={skip}>
                {finished ? 'Selvä' : 'Ohita'}
              </Button>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

const RADIUS = 17
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function ProgressRing({
  remainingSec,
  totalSec,
  finished,
}: {
  remainingSec: number
  totalSec: number
  finished: boolean
}) {
  const progress = totalSec > 0 ? Math.min(1, Math.max(0, remainingSec / totalSec)) : 0
  return (
    <svg width="42" height="42" viewBox="0 0 42 42" aria-hidden="true" className="shrink-0 -rotate-90">
      <circle cx="21" cy="21" r={RADIUS} fill="none" stroke="var(--border)" strokeWidth="3.5" />
      <circle
        cx="21"
        cy="21"
        r={RADIUS}
        fill="none"
        stroke={finished ? 'var(--good)' : 'var(--accent)'}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
        style={{ transition: 'stroke-dashoffset 250ms linear' }}
      />
    </svg>
  )
}
