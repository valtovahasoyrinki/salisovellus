import { useEffect, useRef, useState } from 'react'
import { animate } from 'motion'

/**
 * Numeroiden muutokset rullaavat (SPEC §7). Arvo animoidaan imperatiivisesti,
 * jotta React ei renderöi joka kehyksellä.
 */
export function AnimatedNumber({
  value,
  format,
  className = '',
  durationSec = 0.5,
}: {
  value: number
  format: (value: number) => string
  className?: string
  durationSec?: number
}) {
  const [text, setText] = useState(() => format(value))
  const previous = useRef(value)

  useEffect(() => {
    const from = previous.current
    previous.current = value
    if (from === value) {
      // oxlint-disable-next-line react/set-state-in-effect
      setText(format(value))
      return
    }
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    if (reduced) {
      // oxlint-disable-next-line react/set-state-in-effect
      setText(format(value))
      return
    }
    const controls = animate(from, value, {
      duration: durationSec,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (current) => setText(format(current)),
    })
    return () => controls.stop()
  }, [value, format, durationSec])

  return <span className={`num ${className}`}>{text}</span>
}
