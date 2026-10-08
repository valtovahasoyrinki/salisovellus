/**
 * Treenipäivien ikonit (SPEC §7: päivällä oma väri ja ikoni).
 * Logiikka: työntö = nuolet keskeltä ulos, veto = nuolet reunoilta sisään,
 * muut = kyseisen kehonosan tunnistettava muoto. Tyyli: ks. `Svg.tsx`.
 */
import type { ComponentType } from 'react'
import type { DayIcon } from '@/domain/types'
import { Svg, type IconProps } from './Svg'

export function PushIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 4.5v15" />
      <path d="M3.5 12H8M7 8.8 3.5 12 7 15.2" />
      <path d="M20.5 12H16M17 8.8 20.5 12 17 15.2" />
    </Svg>
  )
}

export function PullIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 4.5v15" />
      <path d="M3.5 12H8M4.5 8.8 8 12l-3.5 3.2" />
      <path d="M20.5 12H16M19.5 8.8 16 12l3.5 3.2" />
    </Svg>
  )
}

export function LegsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 6.5h16" />
      <path d="M8.5 6.5v3.8L6.3 20M15.5 6.5v3.8L17.7 20" />
      <path d="M8.9 14h6.2" />
    </Svg>
  )
}

export function UpperBodyIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5.5 5h13v7.5h-13z" />
      <path d="M8.5 16h7M10 19.5h4" />
    </Svg>
  )
}

export function LowerBodyIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8.5 4.5h7M10 8h4" />
      <path d="M5.5 11.5h13V19h-13z" />
    </Svg>
  )
}

export function FullBodyIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="5.3" r="2.3" />
      <path d="M12 7.8v6.4M7 10.6h10M12 14.2l-3 6M12 14.2l3 6" />
    </Svg>
  )
}

/** Kädet: koukistettu käsi – ei käsipainoa, jotta ikoni ei sekoitu välineisiin. */
export function ArmsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5.8 20.5v-7.3L14.2 7.6" />
      <circle cx="16.6" cy="6" r="2.4" />
      <path d="M7.6 11.8c2.7 0.3 4.2 1.8 4.6 4" />
    </Svg>
  )
}

export function CoreIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 4.2c3 2.2 4.6 4.6 4.6 7.8S15 17.8 12 19.8c-3-2-4.6-4.6-4.6-7.8S9 6.4 12 4.2z" />
      <path d="M12 5.6v12.8M8.2 10h7.6M8.2 14h7.6" />
    </Svg>
  )
}

const DAY_ICONS: Record<DayIcon, ComponentType<IconProps>> = {
  push: PushIcon,
  pull: PullIcon,
  legs: LegsIcon,
  upper: UpperBodyIcon,
  lower: LowerBodyIcon,
  full: FullBodyIcon,
  arms: ArmsIcon,
  core: CoreIcon,
}

/** Treenipäivän ikonikomponentti tunnisteesta. */
export function dayIcon(icon: DayIcon): ComponentType<IconProps> {
  return DAY_ICONS[icon] ?? FullBodyIcon
}
