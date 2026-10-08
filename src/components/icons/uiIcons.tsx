/** Navigaation ja käyttöliittymän ikonit. Tyyli: ks. `Svg.tsx`. */
import { Svg, type IconProps } from './Svg'

export function HomeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" />
    </Svg>
  )
}

export function HistoryIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 10h17M8 3.5V6M16 3.5V6" />
      <path d="M7.5 14h3M13.5 14h3M7.5 17h3" />
    </Svg>
  )
}

export function AnalysisIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="m7.5 15 3.5-4.5 3 2.5L20 7" />
    </Svg>
  )
}

export function ProgramIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="4.5" width="17" height="6" rx="2" />
      <rect x="3.5" y="13.5" width="17" height="6" rx="2" />
      <path d="M7 7.5h.01M7 16.5h.01" />
    </Svg>
  )
}

export function DumbbellIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 9.5v5M6 7v10M18 7v10M21 9.5v5M6 12h12" />
    </Svg>
  )
}

export function PlusIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  )
}

export function MinusIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 12h14" />
    </Svg>
  )
}

export function CheckIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m5 12.5 4.5 4.5L19 7" />
    </Svg>
  )
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m14.5 5-7 7 7 7" />
    </Svg>
  )
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m9.5 5 7 7-7 7" />
    </Svg>
  )
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m5 9.5 7 7 7-7" />
    </Svg>
  )
}

export function SettingsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8" />
    </Svg>
  )
}

export function TrophyIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8 4h8v5a4 4 0 0 1-8 0z" />
      <path d="M8 5.5H5.5v1A3.5 3.5 0 0 0 8 9.9M16 5.5h2.5v1A3.5 3.5 0 0 1 16 9.9" />
      <path d="M12 13v3M9 20h6M10 16h4l.5 4h-5z" />
    </Svg>
  )
}

export function SearchIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.3 15.3 4.7 4.7" />
    </Svg>
  )
}

export function EditIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 20l1-4.5 10-10a2.12 2.12 0 0 1 3 3l-10 10z" />
      <path d="m13.5 6.5 4 4" />
    </Svg>
  )
}

export function TrashIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4.5 7h15" />
      <path d="M9.5 7V4.5h5V7" />
      <path d="M6.5 7l.9 12.6h9.2L17.5 7" />
      <path d="M10.5 10.5v6M13.5 10.5v6" />
    </Svg>
  )
}

export function ArchiveIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="4.5" width="17" height="4.5" rx="1.2" />
      <path d="M5 9v9.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9" />
      <path d="M10 13h4" />
    </Svg>
  )
}

export function RestoreIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4.4 12a7.6 7.6 0 1 0 2.7-5.8" />
      <path d="M4 4.2v3.6h3.6" />
    </Svg>
  )
}

export function CameraIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 8.5h3.2L8.7 6h6.6l1.5 2.5H20v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
      <circle cx="12" cy="13.2" r="3.2" />
    </Svg>
  )
}

/** Raahauskahva: iso tartuntapinta järjestyslistassa (SPEC §6.2). */
export function GripIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6.5 8.5h11M6.5 12h11M6.5 15.5h11" />
    </Svg>
  )
}

export function CalendarIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="5.5" width="17" height="14.5" rx="2.5" />
      <path d="M3.5 9.8h17M8 3.5v3.4M16 3.5v3.4" />
      <path d="M7.6 13.3h.01M12 13.3h.01M16.4 13.3h.01M7.6 16.8h.01M12 16.8h.01" />
    </Svg>
  )
}

export function ClockIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.2" />
      <path d="M12 7.3V12l3.3 2.1" />
    </Svg>
  )
}

export function ShareIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="17.5" cy="6" r="2.6" />
      <circle cx="6.5" cy="12" r="2.6" />
      <circle cx="17.5" cy="18" r="2.6" />
      <path d="m8.9 10.8 6.3-3.4M8.9 13.2l6.3 3.4" />
    </Svg>
  )
}

export function ExportIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3.5v9.5" />
      <path d="m8.5 7 3.5-3.5L15.5 7" />
      <path d="M4.5 14.5v4a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-4" />
    </Svg>
  )
}

export function ImportIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 13V3.5" />
      <path d="m8.5 9.5 3.5 3.5 3.5-3.5" />
      <path d="M4.5 14.5v4a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-4" />
    </Svg>
  )
}

export function CloseIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m6.5 6.5 11 11M17.5 6.5l-11 11" />
    </Svg>
  )
}

/** Lisää-valikko (overflow). */
export function MoreIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 6.3h.01M12 12h.01M12 17.7h.01" />
    </Svg>
  )
}

export function SkipIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 5.8 14.5 12 6 18.2z" />
      <path d="M18 5.8v12.4" />
    </Svg>
  )
}

export function WarningIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 4.3 20.6 19.4H3.4z" />
      <path d="M12 9.6v4.3M12 16.8h.01" />
    </Svg>
  )
}

export function InfoIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.2" />
      <path d="M12 11v5.4M12 7.7h.01" />
    </Svg>
  )
}

/** Putki: peräkkäiset viikot tavoitteessa (SPEC §6.8). */
export function FlameIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3.4c3 3.2 5.6 5.4 5.6 9.1a5.6 5.6 0 0 1-11.2 0c0-1.7.7-3.1 1.9-4.4.4 1 1 1.8 1.9 2.2 0-2.6.6-4.9 1.8-6.9z" />
    </Svg>
  )
}

/** Vaihda: liikkeen korvaaminen toisella (SPEC §6.2). */
export function SwapIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4.5 8.5h12M13.5 5.5l3 3-3 3" />
      <path d="M19.5 15.5h-12M10.5 12.5l-3 3 3 3" />
    </Svg>
  )
}
