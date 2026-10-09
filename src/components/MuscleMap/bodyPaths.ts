/**
 * Tyylitellyn SVG-vartalon muodot (SPEC §7). Ei anatomista piirroskuvaa vaan
 * selkeät muodot, jotka tunnistuvat 120 px leveänä korttikuvana.
 *
 * Kaikki muodot on piirretty vain vasemmalle puolelle (x ≤ 50) ja peilataan
 * ruudulla transformilla `translate(100,0) scale(-1,1)`. Näin vartalo on aina
 * täysin symmetrinen ja polkudataa on puolet vähemmän.
 */
import type { MuscleId } from '@/domain/types'

/** Rajaus jättää kädet reunoille mutta karsii tyhjää tilaa sivuilta. */
export const VIEW_BOX = '12 0 76 216'

export interface MuscleShape {
  muscle: MuscleId
  d: string
}

/**
 * Vartalon perusmuoto täyttönä: pää, kaula, keskivartalo, käsi, kämmen, jalka.
 * Peilattavat puolikkaat kohtaavat keskilinjalla x = 50, myös lantiossa –
 * muuten väliin jäisi tumma rako. Reisien väli alkaa vasta haarasta (y = 126).
 */
export const BODY_FILL: string[] = [
  'M50 6C44.8 6 40.5 10.9 40.5 17S44.8 28 50 28Z',
  'M50 26h-6v11h6z',
  'M50 37 28.5 42Q27.5 57 31 75Q33 92 36.5 104L38.5 118H50Z',
  'M28.5 41.5Q22 45.5 20.5 58L17.6 86Q16.8 94.5 19 96.6Q22 97.8 23.6 95.6Q25 92.8 25.6 86L29 58Q30 47.5 32.5 44.5Z',
  'M19.2 96.5Q17.4 99.5 18.2 103.5Q19.4 106.8 22 106Q24 104.8 24.2 101L24.2 95.8Z',
  'M38.5 118H50V126Q49 168 47 186L46.4 205Q46.4 208.6 43.2 208.6Q40.2 208.6 39.8 205L39.2 186Q36.4 168 36.4 146Q36.4 130 38.5 118Z',
]

/**
 * Sama muoto ääriviivana. Keskilinjaa ei piirretä missään kohdassa: pää, kaula
 * ja keskivartalo jätetään sulkematta, ja jalan sisäreuna alkaa vasta haarasta
 * (50, 126). Näin peilatut puolikkaat muodostavat yhden V:n eivätkä
 * kaksoisviivaa vartalon keskelle.
 */
export const BODY_OUTLINE: string[] = [
  'M50 6C44.8 6 40.5 10.9 40.5 17S44.8 28 50 28',
  'M50 26h-6v11h6',
  'M50 37 28.5 42Q27.5 57 31 75Q33 92 36.5 104L38.5 118H50',
  'M28.5 41.5Q22 45.5 20.5 58L17.6 86Q16.8 94.5 19 96.6Q22 97.8 23.6 95.6Q25 92.8 25.6 86L29 58Q30 47.5 32.5 44.5Z',
  'M19.2 96.5Q17.4 99.5 18.2 103.5Q19.4 106.8 22 106Q24 104.8 24.2 101L24.2 95.8Z',
  'M50 126Q49 168 47 186L46.4 205Q46.4 208.6 43.2 208.6Q40.2 208.6 39.8 205L39.2 186Q36.4 168 36.4 146Q36.4 130 38.5 118H50',
]

/** Edestä näkyvät lihasryhmät. */
export const FRONT_MUSCLES: MuscleShape[] = [
  { muscle: 'traps', d: 'M50.2 29Q40.5 31 32.5 41.5L50.2 36.8Z' },
  { muscle: 'side_delts', d: 'M29 41.5Q22.8 45 21.4 55Q21 59.4 24.2 60Q26.6 58.6 27.2 52Q28.2 45.4 31.8 42.6Z' },
  { muscle: 'front_delts', d: 'M32.5 41.5Q26.4 44.6 25.4 53.4Q29.4 57.6 33.6 55.4Q34.6 46.4 36.4 43.2Z' },
  { muscle: 'chest', d: 'M50.2 44 37 47.4Q33 49.6 33 55.6Q33.6 63.4 37.8 66.4Q44 68.4 50.2 65.4Z' },
  { muscle: 'biceps', d: 'M28.4 46.6Q24.2 50.6 22.8 60.4Q22.2 66.4 24.8 67.6Q27.4 68 28.4 62.2L30 50.4Z' },
  { muscle: 'forearms', d: 'M22.8 70.4Q20.4 78.4 19.4 87.2Q18.9 93 21.4 93.6Q23.6 93 24.1 87.2L25.6 72.4Z' },
  { muscle: 'abs', d: 'M50.2 70H41.2Q39.6 78 39.6 88Q39.6 98 41.2 104H50.2Z' },
  { muscle: 'obliques', d: 'M39.4 71.6Q35.6 80 35.6 90Q36 99.4 38.6 104.4L40.8 104.4Q39 96.4 39 88Q39 78.4 40.9 72Z' },
  { muscle: 'quads', d: 'M49.2 124H40Q37.4 136 37.4 150Q37.4 162 39.4 170H47.6Z' },
  { muscle: 'adductors', d: 'M49.1 126H45.4Q43.9 136 43.9 146Q43.9 154 45.4 160H47.9Z' },
  { muscle: 'calves', d: 'M46.4 176Q41.4 182 40.4 190.6Q40 197.4 42.2 199.4H45.8Q46.9 190 46.9 182Z' },
]

/** Takaa näkyvät lihasryhmät. */
export const BACK_MUSCLES: MuscleShape[] = [
  { muscle: 'traps', d: 'M50.2 28.6Q41 30.6 33.4 41.4Q40.4 48.6 50.2 50.6Z' },
  { muscle: 'rear_delts', d: 'M32 41.5Q26 44.6 25 53.4Q29 57.6 33.2 55.4Q34.2 46.4 36 43.2Z' },
  { muscle: 'upper_back', d: 'M50.2 51.6Q41.4 50.4 35.6 45.4Q34.2 54.4 35.2 64.4Q42 68.4 50.2 68.4Z' },
  { muscle: 'lats', d: 'M34.8 46.4Q31.4 54.4 32.4 66.4Q34.4 82 38 94Q43 90 45.4 82Q40.9 70 38.4 58Q36.9 50 37.4 47Z' },
  { muscle: 'triceps', d: 'M28.4 46.6Q24.2 50.6 22.8 60.4Q22.2 66.4 24.8 67.6Q27.4 68 28.4 62.2L30 50.4Z' },
  { muscle: 'forearms', d: 'M22.8 70.4Q20.4 78.4 19.4 87.2Q18.9 93 21.4 93.6Q23.6 93 24.1 87.2L25.6 72.4Z' },
  { muscle: 'lower_back', d: 'M50.2 71.4 42.4 73Q40.4 80.6 40.4 88.4Q40.4 96.4 41.9 102.4H50.2Z' },
  { muscle: 'glutes', d: 'M50.2 104.4 41.6 106.4Q38 111.4 37.6 119.4Q38 128.4 42.6 131.4Q47 132.4 50.2 128.4Z' },
  { muscle: 'hamstrings', d: 'M48.8 136H39.6Q37.6 148 37.6 158Q37.6 166 39.6 172H48.1Z' },
  { muscle: 'calves', d: 'M46.6 176Q41.2 182 40.2 190.6Q39.9 197.4 42.2 199.4H46Q47 190 47 182Z' },
]
