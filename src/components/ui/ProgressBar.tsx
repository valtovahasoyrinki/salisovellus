import { motion, useReducedMotion } from 'motion/react'
import type { ProgressTone } from '@/components/ui/ProgressRing'

/**
 * Edistymispalkki: viikkotavoite ja viikkosarjojen ohjealue (SPEC §6.8).
 * Täyttö animoidaan `scaleX`:llä, joten animaatio on puhdasta transformia.
 */
const TONE_BG: Record<ProgressTone, string> = {
  accent: 'bg-accent',
  good: 'bg-good',
  record: 'bg-record',
  warn: 'bg-warn',
  danger: 'bg-danger',
}

export interface ProgressBarProps {
  /** 0–1, arvot rajataan. Yli menevä osa näkyy täytenä palkkina. */
  progress: number
  tone?: ProgressTone
  /** Ruudunlukijan teksti. Ilman tätä palkki on koriste. */
  label?: string
  /** Ohjealue osuuksina (0–1), esim. 10–20 sarjaa viikossa. */
  zone?: { from: number; to: number }
  height?: number
  className?: string
}

export function ProgressBar({
  progress,
  tone = 'accent',
  label,
  zone,
  height = 8,
  className = '',
}: ProgressBarProps) {
  const reduced = useReducedMotion()
  const clamped = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0))

  return (
    <div
      className={`relative w-full overflow-hidden rounded-full bg-surface-3 ${className}`}
      style={{ height }}
      {...(label
        ? {
            role: 'progressbar',
            'aria-label': label,
            'aria-valuenow': Math.round(clamped * 100),
            'aria-valuemin': 0,
            'aria-valuemax': 100,
          }
        : { 'aria-hidden': true })}
    >
      {zone ? (
        <span
          aria-hidden="true"
          className="absolute inset-y-0 bg-border-strong"
          style={{
            left: `${Math.max(0, Math.min(1, zone.from)) * 100}%`,
            width: `${Math.max(0, Math.min(1, zone.to - zone.from)) * 100}%`,
          }}
        />
      ) : null}
      <motion.span
        className={`absolute inset-y-0 left-0 w-full origin-left rounded-full ${TONE_BG[tone]}`}
        initial={false}
        animate={{ scaleX: clamped }}
        transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 180, damping: 26 }}
      />
    </div>
  )
}
