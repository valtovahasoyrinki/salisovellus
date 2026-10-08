import { useId, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ChevronDownIcon } from '@/components/icons'
import { haptic } from '@/lib/haptics'

/**
 * Avautuva osio: historian kuukausiryhmät ja liikkeen lisätiedot (SPEC §6.7).
 * Koon muutos tehdään Motionin layout-animaationa (transform), ei korkeutta
 * animoimalla – sääntö: vain `transform` ja `opacity` (§7).
 */
export interface CollapsibleProps {
  title: ReactNode
  subtitle?: ReactNode
  /** Otsikkorivin oikea reuna, esim. kuukauden volyymi. */
  trailing?: ReactNode
  defaultOpen?: boolean
  children: ReactNode
  className?: string
}

export function Collapsible({
  title,
  subtitle,
  trailing,
  defaultOpen = false,
  children,
  className = '',
}: CollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen)
  const reduced = useReducedMotion()
  const bodyId = useId()
  const spring = reduced ? { duration: 0 } : { type: 'spring' as const, stiffness: 420, damping: 34 }

  return (
    <motion.div
      layout
      transition={spring}
      className={`overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface-1 ${className}`}
    >
      <motion.div layout="position" transition={spring}>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => {
            haptic('tap')
            setOpen((current) => !current)
          }}
          className="flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left"
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[0.9375rem] font-medium text-text">{title}</span>
            {subtitle ? <span className="mt-0.5 block truncate text-xs text-muted">{subtitle}</span> : null}
          </span>
          {trailing}
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={spring}
            className="shrink-0 text-faint"
          >
            <ChevronDownIcon size={20} />
          </motion.span>
        </button>
      </motion.div>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="body"
            id={bodyId}
            layout="position"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={spring}
            className="border-t border-border px-4 py-3"
          >
            {children}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  )
}
