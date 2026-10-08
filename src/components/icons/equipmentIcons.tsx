/** Välineikonit (SPEC §5, §7). Tyyli: ks. `Svg.tsx`. */
import type { ComponentType } from 'react'
import type { Equipment } from '@/domain/types'
import { Svg, type IconProps } from './Svg'
import { DumbbellIcon } from './uiIcons'

/** Tanko: tanko kulkee reunasta reunaan, levyt pareittain – erottuu käsipainosta. */
export function BarbellIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M2.5 12h19" />
      <path d="M6 8v8M9 9.5v5M15 9.5v5M18 8v8" />
    </Svg>
  )
}

export function MachineIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="4.5" width="6" height="15" rx="1.2" />
      <path d="M3.5 9h6M3.5 13.5h6" />
      <path d="M13 19.5v-5h7.5M13 14.5v-6h5" />
    </Svg>
  )
}

/**
 * Talja: väkipyörä, vaijeri ja tanko. Ei yläkiskoa – muuten ikoni olisi
 * sekoitettavissa kehonpainon leuanvetotankoon.
 */
export function CableIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="6.4" r="3.4" />
      <path d="M12 6.4h.01" />
      <path d="M12 9.8v4.4" />
      <path d="M8.4 14.2h7.2M9.6 14.2v2.6M14.4 14.2v2.6" />
    </Svg>
  )
}

/** Kehonpaino: leuanvetotangossa riippuva hahmo. */
export function BodyweightIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 4.5h16" />
      <path d="M8.5 4.5v3.2M15.5 4.5v3.2" />
      <circle cx="12" cy="10.4" r="2.2" />
      <path d="M12 12.6v4.4M12 17l-2.6 3.3M12 17l2.6 3.3" />
    </Svg>
  )
}

export function OtherEquipmentIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.2" />
      <path d="M8.6 12h.01M12 12h.01M15.4 12h.01" />
    </Svg>
  )
}

const EQUIPMENT_ICONS: Record<Equipment, ComponentType<IconProps>> = {
  barbell: BarbellIcon,
  dumbbell: DumbbellIcon,
  machine: MachineIcon,
  cable: CableIcon,
  bodyweight: BodyweightIcon,
  other: OtherEquipmentIcon,
}

/** Välineen ikonikomponentti tunnisteesta. */
export function equipmentIcon(equipment: Equipment): ComponentType<IconProps> {
  return EQUIPMENT_ICONS[equipment] ?? OtherEquipmentIcon
}
