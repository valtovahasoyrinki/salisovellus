import { motion } from 'motion/react'
import { haptic } from '@/lib/haptics'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: Array<SegmentedOption<T>>
  value: T
  onChange: (value: T) => void
  ariaLabel: string
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="flex gap-0.5 rounded-xl border border-border bg-surface-2 p-0.5"
    >
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => {
              haptic('tap')
              onChange(option.value)
            }}
            className="relative min-h-10 flex-1 rounded-[0.625rem] px-2 text-xs font-medium"
          >
            {selected ? (
              <motion.span
                layoutId={`segment-${ariaLabel}`}
                className="absolute inset-0 rounded-[0.625rem] bg-surface-3"
                transition={{ type: 'spring', stiffness: 500, damping: 36 }}
              />
            ) : null}
            <span className={`relative ${selected ? 'text-text' : 'text-muted'}`}>{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
