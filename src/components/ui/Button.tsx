import type { ReactNode } from 'react'
import { motion, type HTMLMotionProps } from 'motion/react'
import { haptic } from '@/lib/haptics'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'good'
type Size = 'sm' | 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-accent-ink font-semibold active:bg-accent-hover',
  secondary: 'bg-surface-2 text-text border border-border active:bg-surface-3',
  ghost: 'bg-transparent text-muted active:bg-surface-2',
  danger: 'bg-danger-dim text-danger border border-danger/40 active:bg-danger/20',
  good: 'bg-good text-accent-ink font-semibold',
}

// Kosketusalue vähintään 48 px (SPEC §6.3).
const SIZES: Record<Size, string> = {
  sm: 'min-h-12 px-3 text-sm rounded-lg gap-1.5',
  md: 'min-h-12 px-4 text-[0.9375rem] rounded-xl gap-2',
  lg: 'min-h-14 px-5 text-base rounded-2xl gap-2',
}

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: Variant
  size?: Size
  fullWidth?: boolean
  icon?: ReactNode
  children?: ReactNode
}

export function Button({
  variant = 'secondary',
  size = 'md',
  fullWidth = false,
  icon,
  className = '',
  children,
  onClick,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <motion.button
      type={type}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 600, damping: 30 }}
      onClick={(event) => {
        haptic('tap')
        onClick?.(event)
      }}
      className={`inline-flex items-center justify-center transition-colors disabled:opacity-40 ${VARIANTS[variant]} ${SIZES[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </motion.button>
  )
}

export interface IconButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  label: string
  children: ReactNode
  variant?: Variant
}

export function IconButton({ label, children, variant = 'ghost', className = '', onClick, ...rest }: IconButtonProps) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      whileTap={{ scale: 0.92 }}
      transition={{ type: 'spring', stiffness: 600, damping: 30 }}
      onClick={(event) => {
        haptic('tap')
        onClick?.(event)
      }}
      className={`inline-flex size-12 shrink-0 items-center justify-center rounded-xl transition-colors disabled:opacity-40 ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {children}
    </motion.button>
  )
}
