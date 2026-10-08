import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'

/**
 * Edistymisrengas: viikkotavoite, lepoajastin, liikkeen sarjat (SPEC §6.4, §6.8).
 * Rengas piirtyy viivaa animoimalla – sama tekniikka kuin kaavioiden
 * sisäänpiirrossa (§7), ei layoutia koskevia animaatioita.
 */
export type ProgressTone = 'accent' | 'good' | 'record' | 'warn' | 'danger'

const TONE_STROKE: Record<ProgressTone, string> = {
  accent: 'var(--accent)',
  good: 'var(--good)',
  record: 'var(--record)',
  warn: 'var(--warn)',
  danger: 'var(--danger)',
}

export interface ProgressRingProps {
  /** 0–1, arvot rajataan. */
  progress: number
  size?: number
  strokeWidth?: number
  tone?: ProgressTone
  /** Ruudunlukijan teksti. Ilman tätä rengas on koriste (`aria-hidden`). */
  label?: string
  /** Keskelle sijoitettava sisältö, esim. jäljellä oleva aika. */
  children?: ReactNode
  className?: string
}

export function ProgressRing({
  progress,
  size = 64,
  strokeWidth = 5,
  tone = 'accent',
  label,
  children,
  className = '',
}: ProgressRingProps) {
  const reduced = useReducedMotion()
  const clamped = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const center = size / 2

  return (
    <div
      className={`relative shrink-0 ${className}`}
      style={{ width: size, height: size }}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={TONE_STROKE[tone]}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={false}
          animate={{ strokeDashoffset: circumference * (1 - clamped) }}
          transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 160, damping: 28 }}
        />
      </svg>
      {children ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
      ) : null}
    </div>
  )
}
