import { MUSCLE_LABELS, MUSCLE_ORDER, muscleLabels } from '@/domain/muscles'
import type { MuscleId } from '@/domain/types'
import {
  BACK_MUSCLES,
  BODY_FILL,
  BODY_OUTLINE,
  FRONT_MUSCLES,
  VIEW_BOX,
  type MuscleShape,
} from './bodyPaths'

/**
 * Tyylitelty lihaskartta (SPEC §7): liikkeen lihasryhmät ja viikon lämpökartta.
 * Ensisijaiset aksenttivärillä, toissijaiset haaleammin, `intensity` säätää
 * peittävyyttä. Ei ulkoisia kuvia; värit tulevat tokeneista, joten kartta
 * toimii molemmissa teemoissa.
 */
export interface MuscleMapProps {
  primary?: MuscleId[]
  secondary?: MuscleId[]
  /** Viikon kuormitus lihasryhmittäin, 0–1. Ensisijainen merkintä ohittaa tämän. */
  intensity?: Partial<Record<MuscleId, number>>
  view: 'front' | 'back' | 'both'
  /**
   * Komponentti täyttää saamansa laatikon ja vartalo skaalautuu sen sisään
   * (`meet`), joten sama kartta toimii 120 px korttikuvana ja 320 px
   * lämpökarttana. Ilman kokoa käytetään vartalon omaa kuvasuhdetta.
   */
  className?: string
}

/** Peilaus: muodot on piirretty vain vasemmalle puolelle. */
const MIRROR = 'translate(100,0) scale(-1,1)'

/** Tuntematon tunniste (esim. vanha varmuuskopio) ei saa kaataa näkymää. */
function isKnownMuscle(id: string): id is MuscleId {
  return Object.hasOwn(MUSCLE_LABELS, id)
}

function known(ids: MuscleId[] | undefined): MuscleId[] {
  return (ids ?? []).filter((id) => isKnownMuscle(id))
}

function inDisplayOrder(ids: MuscleId[]): MuscleId[] {
  const unique = new Set(ids)
  return MUSCLE_ORDER.filter((id) => unique.has(id))
}

export function MuscleMap({ primary, secondary, intensity, view, className = '' }: MuscleMapProps) {
  const primaryIds = new Set(known(primary))
  const secondaryIds = new Set(known(secondary))
  const loads = new Map<MuscleId, number>()
  for (const [id, value] of Object.entries(intensity ?? {})) {
    if (!isKnownMuscle(id) || typeof value !== 'number' || !Number.isFinite(value)) continue
    loads.set(id, Math.min(1, Math.max(0, value)))
  }

  const label = buildLabel(
    inDisplayOrder([...primaryIds]),
    inDisplayOrder([...secondaryIds]),
    inDisplayOrder([...loads.keys()].filter((id) => (loads.get(id) ?? 0) > 0)),
  )

  const paint = (muscle: MuscleId): { fill: string; fillOpacity: number } => {
    if (primaryIds.has(muscle)) return { fill: 'var(--accent)', fillOpacity: 1 }
    if (secondaryIds.has(muscle)) return { fill: 'var(--muscle-secondary)', fillOpacity: 1 }
    const load = loads.get(muscle) ?? 0
    /*
      Lämpökartta sekoittaa treenaamattoman sävyn ja aksentin: pienikin
      kuormitus näkyy ja täysi kuormitus on aksentti. Peittävyyden säätäminen
      ei toimi, koska vaaleassa teemassa aksentti on tummempi kuin vartalo –
      silloin kevyt kuormitus näyttäisi vaaleammalta kuin treenaamaton lihas.
    */
    if (load > 0) {
      const mix = Math.round(22 + 78 * load)
      return {
        fill: `color-mix(in oklab, var(--accent) ${mix}%, var(--muscle-idle))`,
        fillOpacity: 1,
      }
    }
    return { fill: 'var(--muscle-idle)', fillOpacity: 1 }
  }

  return (
    <div
      role="img"
      aria-label={label}
      style={{ aspectRatio: view === 'both' ? '152 / 216' : '76 / 216' }}
      className={`flex items-stretch justify-center gap-1 ${className}`}
    >
      {view !== 'back' ? <BodyView shapes={FRONT_MUSCLES} paint={paint} /> : null}
      {view !== 'front' ? <BodyView shapes={BACK_MUSCLES} paint={paint} /> : null}
    </div>
  )
}

function BodyView({
  shapes,
  paint,
}: {
  shapes: MuscleShape[]
  paint: (muscle: MuscleId) => { fill: string; fillOpacity: number }
}) {
  return (
    <svg
      viewBox={VIEW_BOX}
      className="h-full min-w-0 flex-1"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
    >
      {[undefined, MIRROR].map((transform) => (
        <g key={transform ?? 'left'} transform={transform}>
          {BODY_FILL.map((d) => (
            <path key={d} d={d} fill="var(--body-fill)" />
          ))}
          {BODY_OUTLINE.map((d) => (
            <path
              key={d}
              d={d}
              fill="none"
              stroke="var(--body-stroke)"
              strokeWidth="1.1"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}
          {shapes.map((shape) => {
            const { fill, fillOpacity } = paint(shape.muscle)
            return (
              <path
                key={shape.muscle + shape.d}
                data-muscle={shape.muscle}
                d={shape.d}
                fill={fill}
                fillOpacity={fillOpacity}
                stroke="var(--body-fill)"
                strokeWidth="0.5"
                strokeLinejoin="round"
              />
            )
          })}
        </g>
      ))}
    </svg>
  )
}

function buildLabel(primary: MuscleId[], secondary: MuscleId[], loaded: MuscleId[]): string {
  const parts: string[] = []
  if (primary.length > 0) parts.push(`ensisijaiset ${muscleLabels(primary)}`)
  if (secondary.length > 0) parts.push(`toissijaiset ${muscleLabels(secondary)}`)
  if (primary.length === 0 && secondary.length === 0 && loaded.length > 0) {
    parts.push(`treenatut ${muscleLabels(loaded)}`)
  }
  if (parts.length === 0) return 'Lihaskartta, ei merkittyjä lihasryhmiä'
  return `Lihaskartta: ${parts.join('; ')}`
}
