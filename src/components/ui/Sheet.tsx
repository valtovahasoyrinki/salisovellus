import { useEffect, useId } from 'react'
import { AnimatePresence, motion } from 'motion/react'

/**
 * Bottom sheet jousifysiikalla (SPEC §7). Avautuu alareunasta, koska
 * sovellusta käytetään yhdellä kädellä.
 */
export interface SheetProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  /** Korkeampi lomake tarvitsee enemmän tilaa kuin lyhyt valintalista. */
  size?: 'auto' | 'tall'
}

export function Sheet({ open, onClose, title, children, size = 'auto' }: SheetProps) {
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <motion.div
            className="absolute inset-0 bg-[var(--overlay)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) onClose()
            }}
            className={`relative z-10 w-full max-w-lg rounded-t-[var(--radius-sheet)] border-t border-border bg-surface-1 pb-[env(safe-area-inset-bottom,0px)] shadow-[var(--shadow-sheet)] ${
              size === 'tall' ? 'h-[88dvh]' : 'max-h-[88dvh]'
            } flex flex-col`}
          >
            <div className="flex items-center justify-center pt-2.5">
              <span className="h-1 w-10 rounded-full bg-border-strong" />
            </div>
            <h2 id={titleId} className="px-5 pt-2 pb-3 text-base font-semibold">
              {title}
            </h2>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">{children}</div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  )
}
