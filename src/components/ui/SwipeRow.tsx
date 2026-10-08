import { useState, type ReactNode } from 'react'
import { motion, useAnimationControls } from 'motion/react'
import { TrashIcon } from '@/components/icons'
import { haptic } from '@/lib/haptics'

/**
 * Pyyhkäisy poistaa (SPEC §6.3). Riittävä matka tai nopeus laukaisee poiston;
 * lyhyempi pyyhkäisy jättää poistoalueen näkyviin, jolloin poisto vaatii vielä
 * napautuksen. Kumoaminen on kutsujan vastuulla (`useToast` antaa Kumoa-painikkeen),
 * joten tämä komponentti vain kutsuu `onDelete`.
 */

/** Paljastuva poistoalue ja sen ylittävä laukaisumatka. */
const REVEAL_PX = 112
const DELETE_PX = 148
const DELETE_VELOCITY = -520

export interface SwipeRowProps {
  onDelete: () => void
  children: ReactNode
  /** Poiston nimi ruudunlukijalle, esim. "Poista sarja 3". */
  deleteLabel: string
  className?: string
}

export function SwipeRow({ onDelete, children, deleteLabel, className = '' }: SwipeRowProps) {
  const controls = useAnimationControls()
  const [revealed, setRevealed] = useState(false)

  const settle = (open: boolean): void => {
    setRevealed(open)
    void controls.start(
      { x: open ? -REVEAL_PX : 0 },
      { type: 'spring', stiffness: 520, damping: 40 },
    )
  }

  const remove = (): void => {
    haptic('warn')
    setRevealed(false)
    void controls.start({ x: 0 }, { duration: 0 })
    onDelete()
  }

  return (
    <div className={`relative overflow-hidden rounded-[var(--radius-card)] ${className}`}>
      {/* Punainen alue vain oikeassa reunassa: rivin alla ei näy punaista reunaviivaa. */}
      <div className="absolute inset-y-0 right-0 flex w-36 items-stretch justify-end bg-danger">
        <button
          type="button"
          aria-label={deleteLabel}
          onClick={remove}
          onFocus={() => settle(true)}
          onBlur={() => settle(false)}
          className="flex w-28 flex-col items-center justify-center gap-0.5 text-accent-ink"
        >
          <TrashIcon size={20} />
          <span className="text-xs font-semibold">Poista</span>
        </button>
      </div>

      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -REVEAL_PX, right: 0 }}
        dragElastic={{ left: 0.3, right: 0 }}
        dragMomentum={false}
        animate={controls}
        onDragEnd={(_, info) => {
          if (info.offset.x < -DELETE_PX || info.velocity.x < DELETE_VELOCITY) {
            remove()
            return
          }
          settle(info.offset.x < -REVEAL_PX / 2)
        }}
        onTap={() => {
          if (revealed) settle(false)
        }}
        className="relative bg-surface-1"
      >
        {children}
      </motion.div>
    </div>
  )
}
