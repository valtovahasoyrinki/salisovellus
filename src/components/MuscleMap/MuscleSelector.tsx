import { useState, type MouseEvent } from 'react'
import { CloseIcon } from '@/components/icons'
import { Chip, ChipRow } from '@/components/ui/Chip'
import { Collapsible } from '@/components/ui/Collapsible'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { MUSCLE_ORDER, muscleLabel, muscleLabels } from '@/domain/muscles'
import type { MuscleId } from '@/domain/types'
import { haptic } from '@/lib/haptics'
import { BACK_MUSCLES, BODY_FILL, BODY_OUTLINE, FRONT_MUSCLES, VIEW_BOX } from './bodyPaths'
import { BACK_HIT_SHAPES, FRONT_HIT_SHAPES, pickMuscle } from './hitTest'

/**
 * Lihasten valinta kartalta (SPEC §6.1, PLAN §9.4). Yksi näkymä kerrallaan
 * isona, jotta pienetkin lihakset osuvat sormeen 360 px leveällä ruudulla.
 * Napautus kiertää tilaa ei valittu → ensisijainen → toissijainen → ei valittu.
 *
 * Osuma lasketaan `hitTest.ts`:ssä näkyvän muodon geometriasta: napautus
 * valitsee sen lihaksen, jonka muodon sisällä piste on, ja muotojen väliin
 * osuva napautus lähimmän lihaksen. Kartta on ruudunlukijalle tekstivastine, ja
 * "Valitse listasta" on sen rinnalla toimiva näppäimistö- ja varapolku.
 */
export interface MuscleSelection {
  primary: MuscleId[]
  secondary: MuscleId[]
}

export interface MuscleSelectorProps {
  value: MuscleSelection
  onChange: (next: MuscleSelection) => void
  /** Virheteksti kartan alle, esim. "Valitse vähintään yksi ensisijainen lihas". */
  error?: string
}

type MuscleRole = 'primary' | 'secondary' | 'none'
type BodyView = 'front' | 'back'

const ROLE_LABELS: Record<MuscleRole, string> = {
  primary: 'ensisijainen',
  secondary: 'toissijainen',
  none: 'ei valittu',
}

const ROLE_FILLS: Record<MuscleRole, string> = {
  primary: 'var(--accent)',
  secondary: 'var(--muscle-secondary)',
  none: 'var(--muscle-idle)',
}

/** Selitteen väripallo samoilla tokeneilla kuin kartan täytöt. */
const ROLE_DOTS: Record<MuscleRole, string> = {
  primary: 'bg-accent',
  secondary: 'bg-[var(--muscle-secondary)]',
  none: 'bg-[var(--muscle-idle)]',
}

const ROLE_LEGEND: Record<MuscleRole, string> = {
  primary: 'Ensisijainen',
  secondary: 'Toissijainen',
  none: 'Ei valittu',
}

/** Peilaus: muodot on piirretty vain vasemmalle puolelle (sama kuin `MuscleMap`). */
const MIRROR = 'translate(100,0) scale(-1,1)'

const VIEW_OPTIONS: Array<{ value: BodyView; label: string }> = [
  { value: 'front', label: 'Edestä' },
  { value: 'back', label: 'Takaa' },
]

function roleOf(value: MuscleSelection, muscle: MuscleId): MuscleRole {
  if (value.primary.includes(muscle)) return 'primary'
  if (value.secondary.includes(muscle)) return 'secondary'
  return 'none'
}

/**
 * Napautuksen kierto: ei valittu → ensisijainen → toissijainen → ei valittu.
 * Lihas poistetaan aina ensin molemmista listoista, joten sama lihas ei voi
 * päätyä kahteen listaan, ja uusi valinta lisätään listan loppuun.
 */
export function cycleMuscle(value: MuscleSelection, muscle: MuscleId): MuscleSelection {
  const primary = value.primary.filter((id) => id !== muscle)
  const secondary = value.secondary.filter((id) => id !== muscle)
  switch (roleOf(value, muscle)) {
    case 'primary':
      return { primary, secondary: [...secondary, muscle] }
    case 'secondary':
      return { primary, secondary }
    default:
      return { primary: [...primary, muscle], secondary }
  }
}

/** Listavalinta: sama lihas poistuu toisesta listasta, uudelleenvalinta poistaa sen. */
function toggleRole(
  value: MuscleSelection,
  muscle: MuscleId,
  role: 'primary' | 'secondary',
): MuscleSelection {
  const primary = value.primary.filter((id) => id !== muscle)
  const secondary = value.secondary.filter((id) => id !== muscle)
  if (roleOf(value, muscle) === role) return { primary, secondary }
  if (role === 'primary') return { primary: [...primary, muscle], secondary }
  return { primary, secondary: [...secondary, muscle] }
}

function removeMuscle(value: MuscleSelection, muscle: MuscleId): MuscleSelection {
  return {
    primary: value.primary.filter((id) => id !== muscle),
    secondary: value.secondary.filter((id) => id !== muscle),
  }
}

/** Näyttöjärjestys ja samalla tuntemattomien tunnisteiden karsinta. */
function inDisplayOrder(ids: MuscleId[]): MuscleId[] {
  const unique = new Set(ids)
  return MUSCLE_ORDER.filter((id) => unique.has(id))
}

function buildLabel(view: BodyView, primary: MuscleId[], secondary: MuscleId[]): string {
  const side = view === 'front' ? 'edestä' : 'takaa'
  const parts: string[] = []
  if (primary.length > 0) parts.push(`ensisijaiset ${muscleLabels(primary)}`)
  if (secondary.length > 0) parts.push(`toissijaiset ${muscleLabels(secondary)}`)
  if (parts.length === 0) return `Lihaskartta ${side}, ei valittuja lihasryhmiä`
  return `Lihaskartta ${side}: ${parts.join('; ')}`
}

export function MuscleSelector({ value, onChange, error }: MuscleSelectorProps) {
  const [view, setView] = useState<BodyView>('front')
  const [announcement, setAnnouncement] = useState('')

  const shapes = view === 'front' ? FRONT_MUSCLES : BACK_MUSCLES
  const hitShapes = view === 'front' ? FRONT_HIT_SHAPES : BACK_HIT_SHAPES
  const primary = inDisplayOrder(value.primary)
  const secondary = inDisplayOrder(value.secondary)

  const commit = (next: MuscleSelection, muscle: MuscleId): void => {
    haptic('tap')
    setAnnouncement(`${muscleLabel(muscle)}: ${ROLE_LABELS[roleOf(next, muscle)]}`)
    onChange(next)
  }

  /**
   * Napautus käsitellään klikkauksena koko SVG:n tasolla: kartan yli
   * vierittäminen ei silloin vaihda valintaa, ja tapahtuma kuplii lihasmuodosta
   * juureen, joten yksikään muoto ei tarvitse omaa käsittelijää.
   */
  const handleMapClick = (event: MouseEvent<SVGSVGElement>): void => {
    const svg = event.currentTarget
    // Muunnosmatriisi puuttuu, jos SVG ei ole näkyvissä – silloin napautusta ei voi paikantaa.
    const matrix = typeof svg.getScreenCTM === 'function' ? svg.getScreenCTM() : null
    if (!matrix) return
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse())
    const muscle = pickMuscle(point.x, point.y, hitShapes)
    if (muscle === undefined) return
    commit(cycleMuscle(value, muscle), muscle)
  }

  return (
    <div className="flex flex-col gap-3">
      <SegmentedControl
        options={VIEW_OPTIONS}
        value={view}
        onChange={setView}
        ariaLabel="Lihaskartan näkymä"
      />

      <div role="img" aria-label={buildLabel(view, primary, secondary)} className="flex justify-center">
        {/* Kartta on niin iso kuin mahtuu: korkeus rajataan, leveys tulee kuvasuhteesta. */}
        <div
          style={{ aspectRatio: '76 / 216' }}
          className="flex h-[52svh] max-w-full items-stretch justify-center"
        >
          <svg
            viewBox={VIEW_BOX}
            className="h-full min-w-0 flex-1 touch-manipulation select-none"
            preserveAspectRatio="xMidYMid meet"
            onClick={handleMapClick}
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
                {shapes.map((shape) => (
                  <path
                    key={shape.muscle + shape.d}
                    data-muscle={shape.muscle}
                    d={shape.d}
                    fill={ROLE_FILLS[roleOf(value, shape.muscle)]}
                    stroke="var(--body-fill)"
                    strokeWidth="0.5"
                    strokeLinejoin="round"
                  />
                ))}
              </g>
            ))}
          </svg>
        </div>
      </div>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted">
        <LegendItem muscleRole="primary" />
        <LegendItem muscleRole="secondary" />
        <LegendItem muscleRole="none" />
      </ul>

      {error ? <p className="text-xs text-danger">{error}</p> : null}

      {primary.length + secondary.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {[...primary, ...secondary].map((muscle) => (
            <li key={muscle}>
              <button
                type="button"
                aria-label={`Poista ${muscleLabel(muscle)}`}
                onClick={() => commit(removeMuscle(value, muscle), muscle)}
                className="flex min-h-12 items-center gap-1.5 rounded-full border border-border bg-surface-2 px-4 text-sm whitespace-nowrap text-text"
              >
                <span
                  className={`size-2.5 shrink-0 rounded-full ${ROLE_DOTS[roleOf(value, muscle)]}`}
                />
                <span>
                  {muscleLabel(muscle)}{' '}
                  <span className="text-muted">· {ROLE_LABELS[roleOf(value, muscle)]}</span>
                </span>
                <CloseIcon size={16} className="text-muted" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <Collapsible title="Valitse listasta">
        <div className="flex flex-col gap-4">
          <fieldset className="min-w-0 space-y-2">
            <legend className="text-sm font-medium text-text">Ensisijaiset lihasryhmät</legend>
            <ChipRow label="Ensisijaiset lihasryhmät">
              {MUSCLE_ORDER.map((id) => (
                <Chip
                  key={id}
                  label={muscleLabel(id)}
                  selected={value.primary.includes(id)}
                  onClick={() => commit(toggleRole(value, id, 'primary'), id)}
                />
              ))}
            </ChipRow>
          </fieldset>

          <fieldset className="min-w-0 space-y-2">
            <legend className="text-sm font-medium text-text">Toissijaiset lihasryhmät</legend>
            <ChipRow label="Toissijaiset lihasryhmät">
              {MUSCLE_ORDER.map((id) => (
                <Chip
                  key={id}
                  label={muscleLabel(id)}
                  selected={value.secondary.includes(id)}
                  onClick={() => commit(toggleRole(value, id, 'secondary'), id)}
                />
              ))}
            </ChipRow>
          </fieldset>
        </div>
      </Collapsible>
    </div>
  )
}

/* Propin nimi on `muscleRole`, koska `role` tulkittaisiin ARIA-rooliksi. */
function LegendItem({ muscleRole }: { muscleRole: MuscleRole }) {
  return (
    <li className="flex items-center gap-1.5">
      <span className={`size-2.5 shrink-0 rounded-full border border-border ${ROLE_DOTS[muscleRole]}`} />
      {ROLE_LEGEND[muscleRole]}
    </li>
  )
}
