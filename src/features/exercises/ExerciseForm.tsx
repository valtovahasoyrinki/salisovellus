import { useState } from 'react'
import { EQUIPMENT_ORDER, EXERCISE_KIND_LABELS, equipmentLabel } from '@/domain/equipment'
import { MUSCLE_ORDER, muscleLabel } from '@/domain/muscles'
import type { Equipment, ExerciseKind, MuscleId } from '@/domain/types'
import { Button } from '@/components/ui/Button'
import { Chip, ChipRow } from '@/components/ui/Chip'
import { NumberStepper } from '@/components/ui/NumberStepper'
import { TextArea } from '@/components/ui/TextArea'
import { TextField } from '@/components/ui/TextField'
import { formatNumber } from '@/lib/format'
import {
  type ExerciseFormValues,
  type FieldErrors,
  validateExerciseForm,
} from './exerciseSchema'

/** Liikkeen luonti- ja muokkauslomake (SPEC §6.2). */
export interface ExerciseFormProps {
  initial: ExerciseFormValues
  existingNames: Array<{ id: string; name: string }>
  editingId?: string
  submitLabel: string
  onSubmit: (values: ExerciseFormValues) => void | Promise<void>
  onCancel: () => void
}

export function ExerciseForm({
  initial,
  existingNames,
  editingId,
  submitLabel,
  onSubmit,
  onCancel,
}: ExerciseFormProps) {
  const [values, setValues] = useState<ExerciseFormValues>(initial)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [saving, setSaving] = useState(false)

  const set = <K extends keyof ExerciseFormValues>(key: K, value: ExerciseFormValues[K]): void => {
    setValues((current) => ({ ...current, [key]: value }))
  }

  const toggleMuscle = (field: 'primaryMuscles' | 'secondaryMuscles', id: MuscleId): void => {
    setValues((current) => {
      const selected = current[field].includes(id)
      const next = selected ? current[field].filter((item) => item !== id) : [...current[field], id]
      // Sama lihas ei voi olla sekä ensisijainen että toissijainen.
      const other = field === 'primaryMuscles' ? 'secondaryMuscles' : 'primaryMuscles'
      return {
        ...current,
        [field]: next,
        [other]: selected ? current[other] : current[other].filter((item) => item !== id),
      }
    })
  }

  const submit = async (): Promise<void> => {
    const result = validateExerciseForm(values, existingNames, editingId)
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    setErrors({})
    setSaving(true)
    try {
      await onSubmit(result.values)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      className="space-y-5"
      // Validointi tehdään zodilla, jotta virheet näkyvät suomeksi kentän alla.
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      <TextField
        label="Nimi"
        value={values.name}
        onChange={(event) => set('name', event.target.value)}
        error={errors.name}
        placeholder="Esim. Penkkipunnerrus"
        autoComplete="off"
        required
      />

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-text">Ensisijaiset lihasryhmät</legend>
        {errors.primaryMuscles ? (
          <p className="text-xs text-danger">{errors.primaryMuscles}</p>
        ) : null}
        <ChipRow label="Ensisijaiset lihasryhmät">
          {MUSCLE_ORDER.map((id) => (
            <Chip
              key={id}
              label={muscleLabel(id)}
              selected={values.primaryMuscles.includes(id)}
              onClick={() => toggleMuscle('primaryMuscles', id)}
            />
          ))}
        </ChipRow>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-text">Toissijaiset lihasryhmät</legend>
        <ChipRow label="Toissijaiset lihasryhmät">
          {MUSCLE_ORDER.map((id) => (
            <Chip
              key={id}
              label={muscleLabel(id)}
              selected={values.secondaryMuscles.includes(id)}
              onClick={() => toggleMuscle('secondaryMuscles', id)}
            />
          ))}
        </ChipRow>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-text">Väline</legend>
        <ChipRow label="Väline">
          {EQUIPMENT_ORDER.map((id: Equipment) => (
            <Chip
              key={id}
              label={equipmentLabel(id)}
              selected={values.equipment === id}
              onClick={() => set('equipment', id)}
            />
          ))}
        </ChipRow>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-text">Tyyppi</legend>
        <ChipRow label="Tyyppi">
          {(Object.keys(EXERCISE_KIND_LABELS) as ExerciseKind[]).map((id) => (
            <Chip
              key={id}
              label={EXERCISE_KIND_LABELS[id]}
              selected={values.kind === id}
              onClick={() => set('kind', id)}
            />
          ))}
        </ChipRow>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <LabeledStepper
          label="Painonlisäys"
          value={values.increment}
          onChange={(value) => set('increment', value)}
          step={0.25}
          min={0.25}
          max={25}
          unit="kg"
          format={formatNumber}
          allowDecimalInput
          error={errors.increment}
        />
        <LabeledStepper
          label="Oletuslepo"
          value={values.defaultRestSec}
          onChange={(value) => set('defaultRestSec', value)}
          step={15}
          min={0}
          max={600}
          unit="s"
        />
        <LabeledStepper
          label="Toistot vähintään"
          value={values.repMin}
          onChange={(value) => set('repMin', value)}
          step={1}
          min={1}
          max={100}
        />
        <LabeledStepper
          label="Toistot enintään"
          value={values.repMax}
          onChange={(value) => set('repMax', value)}
          step={1}
          min={1}
          max={100}
          error={errors.repMax}
        />
      </div>

      <TextArea
        label="Muistiinpano"
        value={values.notes}
        onChange={(event) => set('notes', event.target.value)}
        placeholder="Esim. kahvan leveys, istuimen korkeus"
        rows={3}
      />

      <div className="flex gap-2 pt-1">
        <Button variant="secondary" fullWidth onClick={onCancel} type="button">
          Peruuta
        </Button>
        <Button variant="primary" fullWidth type="submit" disabled={saving}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}

function LabeledStepper({
  label,
  error,
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
  error?: string
}) {
  return (
    <div className="space-y-1.5">
      <span className="block text-sm font-medium text-text">{label}</span>
      <NumberStepper label={label} {...stepper} />
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  )
}
