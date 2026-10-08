/**
 * Ikonisarjan pohja (SPEC §7): ei ulkoisia kuvia eikä ikonikirjastoja.
 * Yhtenäinen tyyli: 24 × 24 ruudukko, 1,75 px viiva, pyöristetyt päät,
 * `currentColor` – ikoni perii aina tekstin värin.
 */
export interface IconProps {
  className?: string
  size?: number
  'aria-hidden'?: boolean
}

export function Svg({
  children,
  className,
  size = 24,
  filled = false,
}: IconProps & { children: React.ReactNode; filled?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}
