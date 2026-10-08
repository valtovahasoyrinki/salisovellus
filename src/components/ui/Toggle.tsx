import { motion, useReducedMotion } from 'motion/react'
import { haptic } from '@/lib/haptics'

/**
 * Saavutettava kytkin (SPEC §6.11: ääni, värinä, pysyvyys).
 * `role="switch"` + `aria-checked`, kosketusalue ≥ 48 px, nuppi liikkuu
 * jousella – vain `transform`, ei layout-muutoksia.
 */
export interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  /** Ruudunlukijan nimi. Jätä pois vain, jos kytkin on `<label>`-elementin sisällä. */
  label: string
  disabled?: boolean
  className?: string
}

export function Toggle({ checked, onChange, label, disabled = false, className = '' }: ToggleProps) {
  const reduced = useReducedMotion()

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => {
        haptic('tap')
        onChange(!checked)
      }}
      className={`flex min-h-12 w-14 shrink-0 items-center justify-center disabled:opacity-40 ${className}`}
    >
      <span
        className={`flex h-8 w-13 items-center rounded-full border transition-colors ${
          checked ? 'border-accent bg-accent' : 'border-border-strong bg-surface-3'
        }`}
      >
        <motion.span
          animate={{ x: checked ? 23 : 3 }}
          transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 700, damping: 32 }}
          className={`size-6 rounded-full ${checked ? 'bg-accent-ink' : 'bg-muted'}`}
        />
      </span>
    </button>
  )
}
