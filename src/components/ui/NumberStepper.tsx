import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { MinusIcon, PlusIcon } from '@/components/icons'
import { parseDecimal } from '@/lib/format'
import { haptic } from '@/lib/haptics'

/**
 * Sovelluksen tärkein syöteelementti (SPEC §6.3): paino ja toistot.
 * Iso tasalevyinen luku keskellä, −/+ sivuilla ≥ 48 px. Luvun napautus avaa
 * suoran numerosyötön (pilkku ja piste kelpaavat). −/+ pohjassa pitäminen
 * toistaa muutosta kiihtyvästi, jotta 20 kg:n hyppy ei vaadi kahdeksaa painallusta.
 */

/** Ensimmäinen toisto vasta tauon jälkeen – muuten napautus tulkittaisiin pidoksi. */
const HOLD_DELAY_MS = 420
const REPEAT_START_MS = 150
const REPEAT_MIN_MS = 45
const REPEAT_ACCEL = 0.86

export interface NumberStepperProps {
  value: number
  onChange: (value: number) => void
  /** Yhden napautuksen muutos (liikkeen painonlisäys tai 1 toisto). */
  step: number
  min?: number
  max?: number
  /** Näyttömuotoilu, oletus fi-FI-desimaalipilkku. */
  format?: (value: number) => string
  /** Ruudunlukijan nimi, esim. "Paino kilogrammoina". */
  label: string
  /** Sallii desimaalit suorassa syötössä; muuten syöte pyöristetään kokonaisluvuksi. */
  allowDecimalInput?: boolean
  /** `lg` kirjausnäkymän sarjariville, `md` lomakkeisiin. */
  size?: 'md' | 'lg'
  /** Yksikkö luvun perässä, esim. "kg". */
  unit?: string
  className?: string
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** Liukulukujen kertymä pois: 2,5 + 2,5 ei saa olla 5,000000001. */
function round(value: number): number {
  return Math.round(value * 1000) / 1000
}

export function NumberStepper({
  value,
  onChange,
  step,
  min = Number.NEGATIVE_INFINITY,
  max = Number.POSITIVE_INFINITY,
  format,
  label,
  allowDecimalInput = false,
  size = 'md',
  unit,
  className = '',
}: NumberStepperProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  /** Pidon aikana toistuva muutos tarvitsee tuoreimman arvon ilman uutta ajastinta. */
  const valueRef = useRef(value)
  useEffect(() => {
    valueRef.current = value
  }, [value])
  const timerRef = useRef<number | undefined>(undefined)
  const delayRef = useRef(REPEAT_START_MS)
  const suppressClickRef = useRef(false)

  const display = format ? format(value) : new Intl.NumberFormat('fi-FI').format(value)

  const apply = useCallback(
    (direction: 1 | -1) => {
      const next = clamp(round(valueRef.current + direction * step), min, max)
      if (next === valueRef.current) return
      valueRef.current = next
      haptic('tap')
      onChange(next)
    },
    [max, min, onChange, step],
  )

  const stopHold = useCallback(() => {
    if (timerRef.current !== undefined) {
      window.clearTimeout(timerRef.current)
      timerRef.current = undefined
    }
  }, [])

  useEffect(() => stopHold, [stopHold])

  const startHold = useCallback(
    (direction: 1 | -1) => {
      stopHold()
      suppressClickRef.current = false
      delayRef.current = REPEAT_START_MS
      const repeat = (): void => {
        // Pito on nyt tunnistettu: päästä irti -napsautus ei enää lisää ylimääräistä askelta.
        suppressClickRef.current = true
        apply(direction)
        delayRef.current = Math.max(REPEAT_MIN_MS, delayRef.current * REPEAT_ACCEL)
        timerRef.current = window.setTimeout(repeat, delayRef.current)
      }
      timerRef.current = window.setTimeout(repeat, HOLD_DELAY_MS)
    },
    [apply, stopHold],
  )

  const handleClick = useCallback(
    (direction: 1 | -1) => {
      if (suppressClickRef.current) {
        suppressClickRef.current = false
        return
      }
      apply(direction)
    },
    [apply],
  )

  const openEditor = (): void => {
    setDraft(format ? format(value) : String(value))
    setEditing(true)
  }

  const commit = (): void => {
    setEditing(false)
    const parsed = parseDecimal(draft)
    if (parsed === null) return
    const rounded = allowDecimalInput ? round(parsed) : Math.round(parsed)
    const next = clamp(rounded, min, max)
    if (next !== value) {
      haptic('tap')
      onChange(next)
    }
  }

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  const buttonSize = size === 'lg' ? 'size-14' : 'size-12'
  const valueText = size === 'lg' ? 'text-3xl' : 'text-2xl'

  return (
    <div
      role="group"
      aria-label={label}
      className={`flex items-center gap-1 rounded-xl bg-surface-2 p-1 ${className}`}
    >
      <StepButton
        label={`Vähennä: ${label}`}
        size={buttonSize}
        disabled={value <= min}
        onClick={() => handleClick(-1)}
        onHoldStart={() => startHold(-1)}
        onHoldEnd={stopHold}
      >
        <MinusIcon />
      </StepButton>

      {editing ? (
        <input
          ref={inputRef}
          aria-label={label}
          inputMode="decimal"
          type="text"
          autoComplete="off"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') commit()
            if (event.key === 'Escape') setEditing(false)
          }}
          className={`num min-w-0 flex-1 rounded-lg bg-surface-3 py-1 text-center font-semibold text-text outline-none ${valueText}`}
        />
      ) : (
        <button
          type="button"
          role="spinbutton"
          aria-label={label}
          aria-valuenow={value}
          aria-valuetext={unit ? `${display} ${unit}` : display}
          {...(min === Number.NEGATIVE_INFINITY ? {} : { 'aria-valuemin': min })}
          {...(max === Number.POSITIVE_INFINITY ? {} : { 'aria-valuemax': max })}
          onClick={openEditor}
          onKeyDown={(event) => {
            if (event.key === 'ArrowUp' || event.key === 'ArrowRight') {
              event.preventDefault()
              apply(1)
            }
            if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') {
              event.preventDefault()
              apply(-1)
            }
          }}
          className="flex min-h-12 min-w-0 flex-1 items-baseline justify-center gap-1 rounded-lg px-1"
        >
          <span className={`num font-semibold tracking-tight text-text ${valueText}`}>{display}</span>
          {unit ? <span className="text-xs text-muted">{unit}</span> : null}
        </button>
      )}

      <StepButton
        label={`Lisää: ${label}`}
        size={buttonSize}
        disabled={value >= max}
        onClick={() => handleClick(1)}
        onHoldStart={() => startHold(1)}
        onHoldEnd={stopHold}
      >
        <PlusIcon />
      </StepButton>
    </div>
  )
}

function StepButton({
  label,
  size,
  disabled,
  onClick,
  onHoldStart,
  onHoldEnd,
  children,
}: {
  label: string
  size: string
  disabled: boolean
  onClick: () => void
  onHoldStart: () => void
  onHoldEnd: () => void
  children: React.ReactNode
}) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      disabled={disabled}
      whileTap={{ scale: 0.92 }}
      transition={{ type: 'spring', stiffness: 600, damping: 30 }}
      onClick={onClick}
      onPointerDown={onHoldStart}
      onPointerUp={onHoldEnd}
      onPointerCancel={onHoldEnd}
      onPointerLeave={onHoldEnd}
      onContextMenu={(event) => event.preventDefault()}
      className={`flex ${size} shrink-0 items-center justify-center rounded-lg bg-surface-3 text-text disabled:opacity-35`}
    >
      {children}
    </motion.button>
  )
}
