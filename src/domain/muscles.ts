/** Lihasryhmien suomenkieliset nimet ja ryhmittely (SPEC §6.8, §7). */
import type { MuscleId } from './types'

export const MUSCLE_LABELS: Record<MuscleId, string> = {
  chest: 'Rinta',
  lats: 'Leveä selkälihas',
  upper_back: 'Yläselkä',
  traps: 'Epäkäs',
  front_delts: 'Etuolkapää',
  side_delts: 'Sivuolkapää',
  rear_delts: 'Takaolkapää',
  biceps: 'Hauis',
  triceps: 'Ojentaja',
  forearms: 'Kyynärvarsi',
  abs: 'Vatsa',
  obliques: 'Vinot vatsalihakset',
  lower_back: 'Alaselkä',
  glutes: 'Pakara',
  quads: 'Etureisi',
  hamstrings: 'Takareisi',
  calves: 'Pohje',
  adductors: 'Lähentäjät',
}

/** Järjestys, jossa lihasryhmät näytetään listoissa ja kaavioissa. */
export const MUSCLE_ORDER: MuscleId[] = [
  'chest',
  'front_delts',
  'side_delts',
  'rear_delts',
  'triceps',
  'lats',
  'upper_back',
  'traps',
  'biceps',
  'forearms',
  'quads',
  'hamstrings',
  'glutes',
  'adductors',
  'calves',
  'abs',
  'obliques',
  'lower_back',
]

/** Karkea jako Push / Pull / Legs -tasapainon laskentaan (SPEC §6.8). */
export type MovementGroup = 'push' | 'pull' | 'legs' | 'core'

export const MUSCLE_GROUP: Record<MuscleId, MovementGroup> = {
  chest: 'push',
  front_delts: 'push',
  side_delts: 'push',
  triceps: 'push',
  lats: 'pull',
  upper_back: 'pull',
  traps: 'pull',
  rear_delts: 'pull',
  biceps: 'pull',
  forearms: 'pull',
  quads: 'legs',
  hamstrings: 'legs',
  glutes: 'legs',
  calves: 'legs',
  adductors: 'legs',
  lower_back: 'core',
  abs: 'core',
  obliques: 'core',
}

export const MOVEMENT_GROUP_LABELS: Record<MovementGroup, string> = {
  push: 'Push',
  pull: 'Pull',
  legs: 'Legs',
  core: 'Keskivartalo',
}

export function muscleLabel(id: MuscleId): string {
  return MUSCLE_LABELS[id]
}

export function muscleLabels(ids: MuscleId[]): string {
  return ids.map(muscleLabel).join(', ')
}
