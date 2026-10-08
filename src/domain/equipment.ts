/** Välineiden suomenkieliset nimet ja oletukset (SPEC §5). */
import type { Equipment, ExerciseKind } from './types'

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: 'Tanko',
  dumbbell: 'Käsipaino',
  machine: 'Laite',
  cable: 'Talja',
  bodyweight: 'Kehonpaino',
  other: 'Muu',
}

export const EQUIPMENT_ORDER: Equipment[] = [
  'barbell',
  'dumbbell',
  'machine',
  'cable',
  'bodyweight',
  'other',
]

export const EXERCISE_KIND_LABELS: Record<ExerciseKind, string> = {
  weight_reps: 'Paino × toistot',
  bodyweight: 'Kehonpaino (lisäpaino)',
  time: 'Aika',
}

export function equipmentLabel(id: Equipment): string {
  return EQUIPMENT_LABELS[id]
}
