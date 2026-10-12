import { useMemo, useRef, useState } from 'react'
import { EQUIPMENT_ORDER, EXERCISE_KIND_LABELS, equipmentLabel } from '@/domain/equipment'
import { findNameMatches, nameKey } from '@/domain/exerciseSearch'
import type { Equipment, Exercise, ExerciseKind, Settings } from '@/domain/types'
import { MuscleSelector, type MuscleSelection } from '@/components/MuscleMap/MuscleSelector'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Chip, ChipRow } from '@/components/ui/Chip'
import { Collapsible } from '@/components/ui/Collapsible'
import { NumberStepper } from '@/components/ui/NumberStepper'
import { TextArea } from '@/components/ui/TextArea'
import { TextField } from '@/components/ui/TextField'
import { InfoIcon } from '@/components/icons'
import { DEFAULT_INCREMENTS } from '@/db/repositories/settingsRepo'
import { useSettings } from '@/app/useSettings'
import { formatNumber } from '@/lib/format'
import { type ExerciseFormValues, type FieldErrors, validateExerciseForm } from './exerciseSchema'

/**
 * Liikkeen pikaluonti (SPEC §6.2) – käytetään kaikkialla, missä liike valitaan,
 * myös kesken treenin. Näkyvissä on vain se, mikä on pakko valita: nimi,
 * lihakset ja väline. Loput johdetaan asetuksista ja välineestä, ja ne löytyvät
 * "Lisäasetukset"-osiosta, jotta lomake mahtuu yhdelle ruudulle.
 */
export interface QuickExerciseFormProps {
  /** Esitäyttö hakusanasta. */
  initialName: string
  /** Koko kirjasto: nimen uniikkius ja kaksoiskappaleen tunnistus. */
  exercises: readonly Exercise[]
  /** Kertoo mitä tapahtuu, esim. "Luo ja lisää treeniin". */
  submitLabel: string
  onSubmit: (values: ExerciseFormValues) => void | Promise<void>
  /** "Käytä tätä": kaksoiskappalevaroituksesta valitaan olemassa oleva liike. */
  onUseExisting: (exercise: Exercise) => void
}

/** Hakusana tulee pienellä; liikkeen nimi alkaa isolla kirjaimella. */
export function capitalizeFirst(value: string): string {
  const trimmed = value.trimStart()
  if (trimmed === '') return ''
  return trimmed.slice(0, 1).toLocaleUpperCase('fi') + trimmed.slice(1)
}

/**
 * Oletukset johdetaan välineestä ja asetuksista, ja ne seuraavat välinettä niin
 * kauan kuin käyttäjä ei ole muuttanut kenttää itse (`Overrides`).
 */
export interface QuickDefaults {
  kind: ExerciseKind
  increment: number
  defaultRestSec: number
  repMin: number
  repMax: number
}

export function quickDefaults(
  equipment: Equipment,
  settings: Settings,
  kind?: ExerciseKind,
): QuickDefaults {
  const effective = kind ?? (equipment === 'bodyweight' ? 'bodyweight' : 'weight_reps')
  // Kestoliike kirjataan sekunteina, joten toistoalue on 1–1 (siemendatan sääntö).
  const reps = effective === 'time' ? { min: 1, max: 1 } : { min: 8, max: 12 }
  return {
    kind: effective,
    increment: settings.increments[equipment] ?? DEFAULT_INCREMENTS[equipment],
    defaultRestSec: settings.defaultRestSec,
    repMin: reps.min,
    repMax: reps.max,
  }
}

interface Overrides {
  kind?: ExerciseKind
  increment?: number
  defaultRestSec?: number
  repMin?: number
  repMax?: number
}

export function QuickExerciseForm({
  initialName,
  exercises,
  submitLabel,
  onSubmit,
  onUseExisting,
}: QuickExerciseFormProps) {
  const settings = useSettings()
  const [name, setName] = useState(() => capitalizeFirst(initialName))
  const [muscles, setMuscles] = useState<MuscleSelection>({ primary: [], secondary: [] })
  const [equipment, setEquipment] = useState<Equipment>('barbell')
  const [overrides, setOverrides] = useState<Overrides>({})
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [saving, setSaving] = useState(false)
  const [duplicateAccepted, setDuplicateAccepted] = useState(false)

  const derived = quickDefaults(equipment, settings, overrides.kind)
  const values: ExerciseFormValues = {
    name,
    primaryMuscles: muscles.primary,
    secondaryMuscles: muscles.secondary,
    equipment,
    kind: overrides.kind ?? derived.kind,
    increment: overrides.increment ?? derived.increment,
    defaultRestSec: overrides.defaultRestSec ?? derived.defaultRestSec,
    repMin: overrides.repMin ?? derived.repMin,
    repMax: overrides.repMax ?? derived.repMax,
    notes,
  }

  const existingNames = useMemo(
    () => exercises.map((exercise) => ({ id: exercise.id, name: exercise.name })),
    [exercises],
  )

  /*
    Varoitus näytetään vain tarkasta osumasta nimeen tai aliakseen. Koko
    hakufunktio varoittaisi melkein jokaisesta nimestä ("Pec dec kone" osuisi
    moneen liikkeeseen), eikä varoitus silloin kertoisi mitään.
  */
  const duplicate = useMemo(() => findNameMatches(exercises, name)[0], [exercises, name])
  const sameName = duplicate !== undefined && nameKey(duplicate.name) === nameKey(name)
  const showDuplicate = duplicate !== undefined && !duplicateAccepted

  const override = <K extends keyof Overrides>(key: K, value: Overrides[K]): void => {
    setOverrides((current) => ({ ...current, [key]: value }))
  }

  /*
    Salpa on refissä eikä tilassa: React ei flushaa `setSaving(true)`-tilaa
    synkronisesti, joten kaksi nopeaa napautusta pääsisi molemmat läpi ja
    liikkeitä syntyisi kaksi.
  */
  const submitting = useRef(false)

  const submit = async (): Promise<void> => {
    if (submitting.current) return
    const result = validateExerciseForm(values, existingNames)
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    submitting.current = true
    setErrors({})
    setSaving(true)
    try {
      await onSubmit(result.values)
    } finally {
      submitting.current = false
      setSaving(false)
    }
  }

  return (
    /*
      Lomake täyttää paneelin korkeuden: kentät vierivät omassa alueessaan ja
      tallennuspainike on vieritysalueen ulkopuolella. Näin painike on aina
      peukalon ulottuvilla eikä se peitä lomakkeen loppua (kiinnitetty palkki
      jätti lihaskartan alaosan ja "Lisäasetukset"-osion alleen).
    */
    <form
      className="flex h-full min-h-0 flex-col"
      // Virheet näytetään suomeksi kentän alla, ei selaimen omana kuplana.
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain">
        <TextField
          label="Nimi"
          value={name}
          onChange={(event) => {
            setName(event.target.value)
            setDuplicateAccepted(false)
          }}
          error={errors.name}
          placeholder="Esim. Pec dec"
          autoComplete="off"
          required
        />

        {showDuplicate ? (
          <Card className="space-y-2.5 p-3">
            <div className="flex items-start gap-2.5">
              <InfoIcon size={18} className="mt-0.5 shrink-0 text-warn" />
              <p className="text-xs leading-relaxed text-muted">
                Kirjastossa on jo:{' '}
                <span className="font-medium text-text">{duplicate.name}</span>
                {duplicate.archived ? <Badge className="ml-1.5">Arkistoitu</Badge> : null}
                {sameName ? ' Samaa nimeä ei voi luoda kahdesti.' : ''}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="primary" fullWidth type="button" onClick={() => onUseExisting(duplicate)}>
                {duplicate.archived ? 'Palauta ja käytä' : 'Käytä tätä'}
              </Button>
              {sameName ? null : (
                <Button
                  variant="secondary"
                  fullWidth
                  type="button"
                  onClick={() => setDuplicateAccepted(true)}
                >
                  Luo silti
                </Button>
              )}
            </div>
          </Card>
        ) : null}

        <fieldset className="min-w-0 space-y-2">
          <legend className="mb-1 text-sm font-medium text-text">Lihakset</legend>
          <MuscleSelector value={muscles} onChange={setMuscles} error={errors.primaryMuscles} />
        </fieldset>

        <fieldset className="min-w-0 space-y-2">
          <legend className="text-sm font-medium text-text">Väline</legend>
          <ChipRow label="Väline">
            {EQUIPMENT_ORDER.map((id: Equipment) => (
              <Chip
                key={id}
                label={equipmentLabel(id)}
                selected={equipment === id}
                onClick={() => setEquipment(id)}
              />
            ))}
          </ChipRow>
        </fieldset>

        <Collapsible title="Lisäasetukset" subtitle="Tyyppi, painonlisäys, lepo ja toistoalue">
          <div className="space-y-4">
            <fieldset className="min-w-0 space-y-2">
              <legend className="text-sm font-medium text-text">Tyyppi</legend>
              <ChipRow label="Tyyppi">
                {(Object.keys(EXERCISE_KIND_LABELS) as ExerciseKind[]).map((id) => (
                  <Chip
                    key={id}
                    label={EXERCISE_KIND_LABELS[id]}
                    selected={values.kind === id}
                    onClick={() => override('kind', id)}
                  />
                ))}
              </ChipRow>
            </fieldset>

            <div className="grid grid-cols-2 gap-3">
              <Stepper
                label="Painonlisäys"
                value={values.increment}
                onChange={(value) => override('increment', value)}
                step={0.25}
                min={0.25}
                max={25}
                unit="kg"
                format={formatNumber}
                allowDecimalInput
              />
              <Stepper
                label="Oletuslepo"
                value={values.defaultRestSec}
                onChange={(value) => override('defaultRestSec', value)}
                step={15}
                min={0}
                max={600}
                unit="s"
              />
              <Stepper
                label="Toistot vähintään"
                value={values.repMin}
                onChange={(value) => override('repMin', value)}
                step={1}
                min={1}
                max={values.repMax}
              />
              <Stepper
                label="Toistot enintään"
                value={values.repMax}
                onChange={(value) => override('repMax', value)}
                step={1}
                min={values.repMin}
                max={100}
              />
            </div>

            <TextArea
              label="Muistiinpano"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              error={errors.notes}
              placeholder="Esim. kahvan leveys, istuimen korkeus"
              maxLength={500}
              rows={2}
            />
          </div>
        </Collapsible>
      </div>

      {/* Lukittuu käsittelyn ajaksi, jottei tuplanapautus luo kahta liikettä. */}
      <div className="-mx-5 -mb-5 border-t border-border px-5 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]">
        <Button variant="primary" fullWidth size="lg" type="submit" disabled={saving}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}

function Stepper({
  label,
  ...stepper
}: {
  label: string
  value: number
  onChange: (value: number) => void
  step: number
  min?: number
  max?: number
  unit?: string
  format?: (value: number) => string
  allowDecimalInput?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <span className="block text-sm font-medium text-text">{label}</span>
      <NumberStepper label={label} {...stepper} />
    </div>
  )
}
