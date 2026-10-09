import { z } from 'zod'
import type { Equipment, Exercise, ExerciseKind, MuscleId } from '@/domain/types'

/** Liikelomakkeen validointi (SPEC §4: zod lomakkeisiin). */
export const exerciseFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Anna liikkeelle nimi').max(60, 'Nimi on liian pitkä'),
    primaryMuscles: z.array(z.string()).min(1, 'Valitse vähintään yksi ensisijainen lihasryhmä'),
    secondaryMuscles: z.array(z.string()),
    equipment: z.string(),
    kind: z.string(),
    increment: z.number().positive('Painonlisäyksen pitää olla suurempi kuin nolla'),
    defaultRestSec: z.number().int().min(0).max(900),
    repMin: z.number().int().min(1, 'Toistojen alaraja on vähintään 1').max(100),
    repMax: z.number().int().min(1).max(100),
    notes: z.string().max(500),
  })
  .refine((value) => value.repMin <= value.repMax, {
    message: 'Toistoalueen alaraja ei voi olla ylärajaa suurempi',
    path: ['repMax'],
  })

export type ExerciseFormValues = {
  name: string
  primaryMuscles: MuscleId[]
  secondaryMuscles: MuscleId[]
  equipment: Equipment
  kind: ExerciseKind
  increment: number
  defaultRestSec: number
  repMin: number
  repMax: number
  notes: string
}

export type FieldErrors = Partial<Record<keyof ExerciseFormValues | 'repMax', string>>

export const EMPTY_FORM: ExerciseFormValues = {
  name: '',
  primaryMuscles: [],
  secondaryMuscles: [],
  equipment: 'barbell',
  kind: 'weight_reps',
  increment: 2.5,
  defaultRestSec: 150,
  repMin: 6,
  repMax: 10,
  notes: '',
}

export function formFromExercise(exercise: Exercise): ExerciseFormValues {
  return {
    name: exercise.name,
    primaryMuscles: [...exercise.primaryMuscles],
    secondaryMuscles: [...exercise.secondaryMuscles],
    equipment: exercise.equipment,
    kind: exercise.kind,
    increment: exercise.increment,
    defaultRestSec: exercise.defaultRestSec,
    repMin: exercise.defaultRepRange.min,
    repMax: exercise.defaultRepRange.max,
    notes: exercise.notes,
  }
}

/**
 * Validoi lomakkeen ja tarkistaa nimen ainutlaatuisuuden. Nimivertailu on
 * suomenkielinen ja kirjainkoosta riippumaton, jotta "Penkki" ja "penkki"
 * eivät päädy kahdeksi liikkeeksi.
 */
export function validateExerciseForm(
  values: ExerciseFormValues,
  existingNames: Array<{ id: string; name: string }>,
  editingId?: string,
): { ok: true; values: ExerciseFormValues } | { ok: false; errors: FieldErrors } {
  const parsed = exerciseFormSchema.safeParse(values)
  const errors: FieldErrors = {}

  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = issue.path[0]
      if (typeof field === 'string' && !(field in errors)) {
        errors[field as keyof FieldErrors] = issue.message
      }
    }
  }

  const normalized = values.name.trim().toLocaleLowerCase('fi')
  const duplicate = existingNames.some(
    (candidate) =>
      candidate.id !== editingId && candidate.name.toLocaleLowerCase('fi') === normalized,
  )
  if (normalized !== '' && duplicate) errors.name = 'Samanniminen liike on jo olemassa'

  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return { ok: true, values: { ...values, name: values.name.trim(), notes: values.notes.trim() } }
}
