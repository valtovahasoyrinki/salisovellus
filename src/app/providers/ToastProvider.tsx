import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useRestTimer } from '@/app/providers/RestTimerProvider'
import { newId } from '@/lib/id'

export interface ToastAction {
  label: string
  onAction: () => void
}

interface Toast {
  id: string
  message: string
  tone: 'neutral' | 'good' | 'danger'
  action?: ToastAction
}

interface ToastApi {
  show: (message: string, options?: { tone?: Toast['tone']; action?: ToastAction; durationMs?: number }) => void
}

const ToastContext = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const api = useContext(ToastContext)
  if (!api) throw new Error('useToast vaatii ToastProviderin')
  return api
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  // Kelluva lepoajastin on ruudun alalaidassa: ilmoitukset nousevat sen yläpuolelle.
  const { state: restTimer } = useRestTimer()
  const timers = useRef(new Map<string, number>())

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
    const timer = timers.current.get(id)
    if (timer !== undefined) {
      window.clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const show = useCallback<ToastApi['show']>(
    (message, options) => {
      const toast: Toast = {
        id: newId(),
        message,
        tone: options?.tone ?? 'neutral',
        ...(options?.action ? { action: options.action } : {}),
      }
      // Enintään kaksi yhtä aikaa: kirjausnäkymä ei saa peittyä ilmoituksiin.
      setToasts((current) => [...current.slice(-1), toast])
      timers.current.set(
        toast.id,
        window.setTimeout(() => dismiss(toast.id), options?.durationMs ?? 4000),
      )
    },
    [dismiss],
  )

  const api = useMemo<ToastApi>(() => ({ show }), [show])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className={`pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 px-3 ${
          restTimer === null
            ? 'pb-[calc(env(safe-area-inset-bottom,0px)+5.5rem)]'
            : 'pb-[calc(env(safe-area-inset-bottom,0px)+10rem)]'
        }`}
        aria-live="polite"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              /*
                Ilmoitus ei ota napautuksia vastaan: vain mahdollinen
                toimintopainike on klikattava. Muuten ilmoitus peittäisi sen
                alla olevan käyttöliittymän – esimerkiksi ennätysilmoitus osui
                lihaskartan päälle 360 px leveällä ruudulla.
              */
              className="pointer-events-none flex w-full max-w-sm items-center justify-between gap-3 rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm shadow-[var(--shadow-float)]"
            >
              <span
                className={
                  toast.tone === 'good'
                    ? 'text-good'
                    : toast.tone === 'danger'
                      ? 'text-danger'
                      : 'text-text'
                }
              >
                {toast.message}
              </span>
              {toast.action ? (
                <button
                  type="button"
                  className="pointer-events-auto min-h-11 shrink-0 rounded-lg px-3 font-semibold text-accent"
                  onClick={() => {
                    toast.action?.onAction()
                    dismiss(toast.id)
                  }}
                >
                  {toast.action.label}
                </button>
              ) : null}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
