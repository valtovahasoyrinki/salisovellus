import { useRef } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import type { ExerciseKind, SetEntry } from '@/domain/types'
import { NumberStepper } from '@/components/ui/NumberStepper'
import { SwipeRow } from '@/components/ui/SwipeRow'
import { CheckIcon } from '@/components/icons'
import { haptic } from '@/lib/haptics'
import { formatNumber, formatRepsDelta, formatWeightDelta } from '@/lib/format'

/** Pitkän painalluksen kesto lämmittelymerkinnälle (SPEC §6.3). */
const LONG_PRESS_MS = 450

export interface SetRowProps {
  /** Rivin tunnus: työsarjan numero tai "L" lämmittelylle. */
  label: string
  weight: number
  reps: number
  warmup: boolean
  durationSec?: number
  kind: ExerciseKind
  increment: number
  /** Kirjattu rivi vs. esitäytetty ehdotus. */
  logged: boolean
  /** Edellisen kerran vastaava työsarja vertailuun. */
  previousSet?: SetEntry
  onChange: (patch: { weight?: number; reps?: number; durationSec?: number }) => void
  onToggleWarmup: () => void
  /** Vain esitäytetyllä rivillä: kuittaus tallentaa sarjan. */
  onConfirm?: () => void
  onDelete: () => void
  deleteLabel: string
}

export function SetRow({
  label,
  weight,
  reps,
  warmup,
  durationSec,
  kind,
  increment,
  logged,
  previousSet,
  onChange,
  onToggleWarmup,
  onConfirm,
  onDelete,
  deleteLabel,
}: SetRowProps) {
  const pressTimer = useRef<number | null>(null)
  const longPressed = useRef(false)
  const reduced = useReducedMotion()

  const startPress = (): void => {
    longPressed.current = false
    pressTimer.current = window.setTimeout(() => {
      longPressed.current = true
      haptic('success')
      onToggleWarmup()
    }, LONG_PRESS_MS)
  }

  const endPress = (): void => {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
  }

  const isTime = kind === 'time'

  return (
    <SwipeRow onDelete={onDelete} deleteLabel={deleteLabel}>
      <motion.div
        layout={reduced ? false : 'position'}
        className={`flex items-center gap-2 rounded-xl border px-2 py-2 ${
          logged
            ? warmup
              ? 'border-border bg-surface-2/60'
              : 'border-good-dim bg-good-dim/40'
            : 'border-border bg-surface-1'
        }`}
      >
        <button
          type="button"
          // Pitkä painallus merkitsee lämmittelysarjaksi; napautus kertoo saman.
          onPointerDown={startPress}
          onPointerUp={endPress}
          onPointerLeave={endPress}
          onClick={() => {
            if (!longPressed.current) onToggleWarmup()
          }}
          aria-label={warmup ? `${label}: lämmittelysarja, poista merkintä` : `${label}: merkitse lämmittelysarjaksi`}
          className={`num flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold ${
            warmup ? 'bg-surface-3 text-muted' : 'bg-surface-2 text-text'
          }`}
        >
          {warmup ? 'L' : label}
        </button>

        <div className="min-w-0 flex-1">
          {/*
            Paino ja toistot omilla riveillään: kaksi askellinta rinnakkain ei
            mahdu 390 px:n ruudulle ilman että numerot kutistuvat lukukelvottomiksi.
          */}
          <div className="flex flex-col gap-1.5">
            {isTime ? (
              <NumberStepper
                label="Kesto sekunteina"
                value={durationSec ?? 45}
                onChange={(value) => onChange({ durationSec: value })}
                step={5}
                min={0}
                max={3600}
                unit="s"
                size="lg"
              />
            ) : (
              <>
                <NumberStepper
                  label="Paino kilogrammoina"
                  value={weight}
                  onChange={(value) => onChange({ weight: value })}
                  step={increment}
                  min={kind === 'bodyweight' ? -200 : 0}
                  max={500}
                  unit="kg"
                  format={formatNumber}
                  allowDecimalInput
                  size="lg"
                />
                <NumberStepper
                  label="Toistot"
                  value={reps}
                  onChange={(value) => onChange({ reps: value })}
                  step={1}
                  min={1}
                  max={100}
                  unit="toistoa"
                  size="lg"
                />
              </>
            )}
          </div>
          {warmup ? null : <Comparison weight={weight} reps={reps} previousSet={previousSet} />}
        </div>

        {logged ? (
          <span
            className="flex size-12 shrink-0 items-center justify-center rounded-xl text-good"
            aria-label="Sarja kirjattu"
          >
            <motion.span
              initial={reduced ? false : { scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 600, damping: 24 }}
            >
              <CheckIcon size={24} />
            </motion.span>
          </span>
        ) : (
          <motion.button
            type="button"
            onClick={onConfirm}
            whileTap={reduced ? undefined : { scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 600, damping: 28 }}
            aria-label={`Kuittaa ${label}`}
            className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-ink"
          >
            <CheckIcon size={24} />
          </motion.button>
        )}
      </motion.div>
    </SwipeRow>
  )
}

/**
 * Vertailu edelliskertaan heti rivillä (SPEC §6.3): parannus vihreällä,
 * heikompi tulos neutraalina.
 */
function Comparison({
  weight,
  reps,
  previousSet,
}: {
  weight: number
  reps: number
  previousSet?: SetEntry
}) {
  if (!previousSet) return null

  const weightDelta = weight - previousSet.weight
  const repsDelta = reps - previousSet.reps
  if (weightDelta === 0 && repsDelta === 0) return null

  const improved = weightDelta > 0 || (weightDelta === 0 && repsDelta > 0)
  const parts: string[] = []
  if (weightDelta !== 0) parts.push(formatWeightDelta(weightDelta))
  if (repsDelta !== 0) parts.push(formatRepsDelta(repsDelta))

  return (
    <p className={`num mt-1 pl-1 text-xs ${improved ? 'text-good' : 'text-muted'}`}>
      {parts.join(' · ')}
    </p>
  )
}
