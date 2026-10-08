import { AnimatePresence, motion } from 'motion/react'
import { Button } from '@/components/ui/Button'

/**
 * Vahvistus tuhoaville toiminnoille. `details` kertoo tarkalleen mitä katoaa
 * (SPEC §5), esim. "12 treeniä ja 148 sarjaa poistuu pysyvästi."
 */
export interface ConfirmDialogProps {
  open: boolean
  title: string
  details?: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'neutral'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  details,
  confirmLabel = 'Poista',
  cancelLabel = 'Peruuta',
  tone = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-6">
          <motion.div
            className="absolute inset-0 bg-[var(--overlay)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
          />
          <motion.div
            role="alertdialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.94, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-surface-1 p-5"
          >
            <h2 className="text-base font-semibold">{title}</h2>
            {details ? <p className="mt-2 text-sm text-muted">{details}</p> : null}
            <div className="mt-5 flex gap-2">
              <Button variant="secondary" fullWidth onClick={onCancel}>
                {cancelLabel}
              </Button>
              <Button variant={tone === 'danger' ? 'danger' : 'primary'} fullWidth onClick={onConfirm}>
                {confirmLabel}
              </Button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  )
}
