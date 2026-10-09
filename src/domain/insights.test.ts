import { describe, expect, it } from 'vitest'
import {
  generateInsights,
  insightsForExercise,
  insightsForHome,
  type InsightInput,
} from './insights'
import type { SessionSetGroup } from './sessionGroups'
import type { Exercise, MuscleId, SetEntry } from './types'

const DAY = 86_400_000
/** To 8.10.2026 klo 18 Helsinkiä = vk 41. */
const NOW = Date.parse('2026-10-08T15:00:00Z')

const exercise = (id: string, name: string): Exercise => ({
  id,
  name,
  primaryMuscles: ['chest'],
  secondaryMuscles: ['triceps'],
  equipment: 'barbell',
  kind: 'weight_reps',
  increment: 2.5,
  defaultRestSec: 180,
  defaultRepRange: { min: 6, max: 10 },
  notes: '',
  archived: false,
  isCustom: false,
  createdAt: 0,
})

const bench = exercise('penkki', 'Penkkipunnerrus')

let counter = 0

/** Kerta `daysAgo` vuorokautta sitten, annetut paino × toistot työsarjoina. */
const group = (daysAgo: number, pairs: Array<[number, number]>): SessionSetGroup => {
  counter += 1
  const sessionId = `sess${counter}`
  const completedAt = NOW - daysAgo * DAY
  const sets: SetEntry[] = pairs.map(([weight, reps], index) => ({
    id: `${sessionId}-${index}`,
    sessionExerciseId: `se${counter}`,
    sessionId,
    exerciseId: bench.id,
    order: index,
    weight,
    reps,
    warmup: false,
    completedAt,
  }))
  return { sessionId, completedAt, sets }
}

/** Oletussyöte, jossa mikään sääntö ei laukea. */
const input = (over: Partial<InsightInput> = {}): InsightInput => ({
  now: NOW,
  currentWeek: '2026-W41',
  weeklyTarget: 4,
  weeklyWorkouts: new Map([['2026-W41', 4]]),
  weeklySets: new Map(),
  weeklySetsRange: { min: 10, max: 20 },
  setsByGroup: { push: 20, pull: 20, legs: 20, core: 10 },
  exercises: [],
  ...over,
})

const withExercise = (groups: SessionSetGroup[]): InsightInput =>
  input({ exercises: [{ exercise: bench, groups }] })

const kinds = (insights: ReturnType<typeof generateInsights>): string[] =>
  insights.map((insight) => insight.kind)

/** Nouseva e1RM neljältä kerralta (toistot 1 → e1RM on paino). */
const risingHistory = (): SessionSetGroup[] => [
  group(21, [[100, 1]]),
  group(14, [[102, 1]]),
  group(7, [[104, 1]]),
  group(0, [[106, 1]]),
]

describe('tyhjä ja tasainen data', () => {
  it('tyhjä data ei tuota havaintoja', () => {
    expect(generateInsights(input())).toEqual([])
  })

  it('liike ilman historiaa ei tuota havaintoja', () => {
    expect(generateInsights(withExercise([]))).toEqual([])
  })

  it('tasainen kehitys ilman ennätyksiä ei tuota havaintoja', () => {
    const flat = [
      group(21, [[100, 1]]),
      group(14, [[100, 1]]),
      group(7, [[100, 1]]),
      group(0, [[100, 1]]),
    ]
    expect(generateInsights(withExercise(flat))).toEqual([])
  })
})

describe('trendisäännöt', () => {
  it('nouseva e1RM tuottaa trendihavainnon numeroilla', () => {
    const insights = generateInsights(withExercise(risingHistory()))
    const trend = insights.find((insight) => insight.kind === 'trend_up')
    expect(trend?.text).toContain('Penkkipunnerrus: e1RM +8,0 % / 4 vk, 4 kertaa.')
    expect(trend?.action).toBe('Pidä linja.')
    expect(trend?.scope).toBe('exercise')
    expect(trend?.exerciseId).toBe('penkki')
  })

  it('alle neljä datapistettä ei riitä trendiin', () => {
    const insights = generateInsights(
      withExercise([group(14, [[100, 1]]), group(7, [[102, 1]]), group(0, [[104, 1]])]),
    )
    expect(kinds(insights)).not.toContain('trend_up')
  })

  it('laskeva e1RM tuottaa varoituksen eikä nousutrendiä', () => {
    const falling = [
      group(21, [[106, 1]]),
      group(14, [[104, 1]]),
      group(7, [[102, 1]]),
      group(0, [[100, 1]]),
    ]
    const insights = generateInsights(withExercise(falling))
    expect(kinds(insights)).toContain('trend_down')
    expect(kinds(insights)).not.toContain('trend_up')
    expect(insights.find((insight) => insight.kind === 'trend_down')?.text).toContain('−7,')
  })
})

/** Viisi kertaa, joista vain ensimmäinen on ennätys. */
const stagnantHistory = (): SessionSetGroup[] => [
  group(28, [[100, 1]]),
  group(21, [[97.5, 1]]),
  group(14, [[97.5, 1]]),
  group(7, [[97.5, 1]]),
  group(0, [[97.5, 1]]),
]

describe('junnaus', () => {
  it('neljä kertaa ilman ennätystä ja kolme viikkoa tuottaa junnaushavainnon', () => {
    const insights = generateInsights(withExercise(stagnantHistory()))
    const stagnation = insights.find((insight) => insight.kind === 'stagnation')
    expect(stagnation?.text).toBe(
      'Penkkipunnerrus ei ole noussut 4 kertaan (4 vk). Vaihda toistoalue tai kevennä viikko.',
    )
    expect(insights[0]?.kind).toBe('stagnation')
  })

  it('tiheä jakso ilman ennätystä ei vielä junnaa', () => {
    const dense = [
      group(6, [[100, 1]]),
      group(4, [[97.5, 1]]),
      group(3, [[97.5, 1]]),
      group(2, [[97.5, 1]]),
      group(1, [[97.5, 1]]),
    ]
    expect(kinds(generateInsights(withExercise(dense)))).not.toContain('stagnation')
  })
})

describe('tauko ja tuore ennätys', () => {
  it('pitkä tauko liikkeestä huomautetaan vuorokausina', () => {
    const insights = generateInsights(withExercise([group(30, [[80, 8]]), group(28, [[80, 8]])]))
    const layoff = insights.find((insight) => insight.kind === 'layoff')
    expect(layoff?.text).toBe(
      'Penkkipunnerrus: edellisestä kerrasta 28 vrk. Palaa liikkeeseen tai korvaa se ohjelmassa.',
    )
  })

  it('tuore liike ei tuota taukohavaintoa', () => {
    const insights = generateInsights(withExercise([group(10, [[80, 8]]), group(3, [[80, 8]])]))
    expect(kinds(insights)).not.toContain('layoff')
  })

  it('tuore ennätys raportoidaan sarjana', () => {
    const insights = generateInsights(withExercise([group(7, [[80, 8]]), group(1, [[85, 8]])]))
    const record = insights.find((insight) => insight.kind === 'fresh_record')
    expect(record?.text).toBe('Penkkipunnerrus: uusi ennätys 85 kg × 8 (raskain paino).')
    expect(record?.action).toBeUndefined()
  })

  it('ensimmäinen kerta ei ole ennätyshavainto', () => {
    expect(kinds(generateInsights(withExercise([group(1, [[85, 8]])])))).not.toContain(
      'fresh_record',
    )
  })

  it('vanha ennätys ei ole tuore', () => {
    const insights = generateInsights(withExercise([group(30, [[80, 8]]), group(20, [[85, 8]])]))
    expect(kinds(insights)).not.toContain('fresh_record')
  })
})

describe('liikeryhmien tasapaino', () => {
  it('yli neljänneksen ero sarjamäärissä tuottaa havainnon', () => {
    const insights = generateInsights(
      input({ setsByGroup: { push: 20, pull: 14, legs: 20, core: 10 } }),
    )
    const imbalance = insights.find((insight) => insight.kind === 'group_imbalance')
    expect(imbalance?.text).toBe(
      'Pull-sarjoja on 30 % vähemmän kuin Push-sarjoja. Lisää selkäsarjoja.',
    )
    expect(imbalance?.scope).toBe('general')
  })

  it('tunnistaa myös puuttuvan push-volyymin', () => {
    const insights = generateInsights(
      input({ setsByGroup: { push: 14, pull: 20, legs: 20, core: 10 } }),
    )
    expect(insights.find((insight) => insight.kind === 'group_imbalance')?.action).toBe(
      'Lisää rintasarjoja.',
    )
  })

  it('pieni ero ei tuota havaintoa', () => {
    const insights = generateInsights(
      input({ setsByGroup: { push: 20, pull: 18, legs: 20, core: 10 } }),
    )
    expect(kinds(insights)).toEqual([])
  })

  it('jalkasarjojen alijäämä tuottaa oman havainnon', () => {
    const insights = generateInsights(
      input({ setsByGroup: { push: 20, pull: 20, legs: 5, core: 10 } }),
    )
    expect(insights.find((insight) => insight.kind === 'legs_share')?.text).toBe(
      'Jalkasarjoja on 75 % vähemmän kuin ylävartalon sarjoja keskimäärin. Lisää jalkasarjoja.',
    )
  })

  it('riittävä jalkaosuus ei tuota havaintoa', () => {
    const insights = generateInsights(
      input({ setsByGroup: { push: 20, pull: 20, legs: 14, core: 10 } }),
    )
    expect(kinds(insights)).not.toContain('legs_share')
  })
})

/** Viimeisen täyden viikon (vk 40) sarjat lihasryhmittäin. */
const week = (entries: Array<[MuscleId, number]>): Map<string, Map<MuscleId, number>> =>
  new Map([['2026-W40', new Map(entries)]])

describe('viikkosarjat ohjealueeseen verrattuna', () => {
  it('ohjealueen alitus ja ylitys tuottavat kumpikin yhden havainnon', () => {
    const insights = generateInsights(
      input({ weeklySets: week([['chest', 6], ['lats', 24], ['biceps', 7]]) }),
    )
    expect(insights.find((insight) => insight.kind === 'muscle_below_range')?.text).toBe(
      'Rinta: 6 työsarjaa viime viikolla, ohjealue 10–20. Lisää yksi liike.',
    )
    expect(insights.find((insight) => insight.kind === 'muscle_above_range')?.text).toBe(
      'Leveä selkälihas: 24 työsarjaa viime viikolla, ohjealue 10–20. Karsi yksi liike.',
    )
    expect(insights.filter((insight) => insight.kind === 'muscle_below_range')).toHaveLength(1)
  })

  it('ohjealueella oleva viikko ei tuota havaintoja', () => {
    const insights = generateInsights(input({ weeklySets: week([['chest', 12], ['lats', 18]]) }))
    expect(kinds(insights)).toEqual([])
  })

  it('kesken oleva nykyinen viikko ei tuota alitushavaintoa', () => {
    const insights = generateInsights(
      input({ weeklySets: new Map([['2026-W41', new Map<MuscleId, number>([['chest', 2]])]]) }),
    )
    expect(kinds(insights)).toEqual([])
  })
})

describe('viikkotavoite', () => {
  it('kesken oleva tavoite tuottaa havainnon puuttuvilla treeneillä', () => {
    const insights = generateInsights(input({ weeklyWorkouts: new Map([['2026-W41', 3]]) }))
    const target = insights.find((insight) => insight.kind === 'weekly_target')
    expect(target?.text).toBe('3 treeniä tällä viikolla, tavoite 4. Varaa vielä 1 treeni tälle viikolle.')
    expect(target?.id).toBe('weekly_target:2026-W41:3/4')
  })

  it('täyttynyt tavoite ei tuota havaintoa', () => {
    expect(kinds(generateInsights(input({ weeklyWorkouts: new Map([['2026-W41', 5]]) })))).toEqual(
      [],
    )
  })

  it('nollatavoite ei tuota havaintoa', () => {
    expect(
      kinds(generateInsights(input({ weeklyTarget: 0, weeklyWorkouts: new Map() }))),
    ).toEqual([])
  })
})

/** Syöte, jossa laukeaa useita eri prioriteetin sääntöjä. */
const busyInput = (): InsightInput =>
  input({
    exercises: [{ exercise: bench, groups: risingHistory() }],
    setsByGroup: { push: 20, pull: 14, legs: 20, core: 10 },
    weeklyWorkouts: new Map([['2026-W41', 2]]),
    weeklySets: new Map([['2026-W40', new Map<MuscleId, number>([['glutes', 4]])]]),
  })

describe('järjestys, rajaus ja vakaus', () => {
  it('havainnot ovat prioriteettijärjestyksessä', () => {
    expect(kinds(generateInsights(busyInput()))).toEqual([
      'group_imbalance',
      'muscle_below_range',
      'weekly_target',
      'trend_up',
      'fresh_record',
    ])
  })

  it('kotinäkymä ottaa kolme tärkeintä', () => {
    const insights = insightsForHome(generateInsights(busyInput()))
    expect(kinds(insights)).toEqual(['group_imbalance', 'muscle_below_range', 'weekly_target'])
  })

  it('kotinäkymä ei toista samaa sääntöä, jos muita on tarjolla', () => {
    // Kolme junnaavaa liikettä ja yksi muu havainto: junnaus näkyy kerran.
    const base = busyInput()
    const stagnating = ['penkki', 'kyykky', 'maasta'].map((id) => ({
      exercise: { ...base.exercises[0]!.exercise, id, name: id },
      groups: base.exercises[0]!.groups,
    }))
    const insights = generateInsights({ ...base, exercises: stagnating })
    const home = insightsForHome(insights)
    expect(new Set(kinds(home)).size).toBe(home.length)
  })

  it('täydentää listan, vaikka eri sääntöjä olisi vähemmän kuin kolme', () => {
    const insights: Parameters<typeof insightsForHome>[0] = [
      { id: 'a', kind: 'stagnation', priority: 10, scope: 'exercise', exerciseId: 'x', text: 'a' },
      { id: 'b', kind: 'stagnation', priority: 10, scope: 'exercise', exerciseId: 'y', text: 'b' },
      { id: 'c', kind: 'stagnation', priority: 10, scope: 'exercise', exerciseId: 'z', text: 'c' },
    ]
    expect(insightsForHome(insights).map((insight) => insight.id)).toEqual(['a', 'b', 'c'])
  })

  it('liikeanalyysi näkee vain oman liikkeensä havainnot', () => {
    const all = generateInsights(busyInput())
    expect(kinds(insightsForExercise(all, 'penkki'))).toEqual(['trend_up', 'fresh_record'])
    expect(insightsForExercise(all, 'kyykky')).toEqual([])
  })

  it('sama data tuottaa identtisen tuloksen', () => {
    // Sama syöte kahdesti: sekä järjestys, tekstit että tunnisteet ovat samat.
    const data = busyInput()
    expect(generateInsights(data)).toEqual(generateInsights(data))
  })

  it('tunniste muuttuu vain datan mukana', () => {
    const before = generateInsights(input({ weeklyWorkouts: new Map([['2026-W41', 2]]) }))
    const same = generateInsights(input({ weeklyWorkouts: new Map([['2026-W41', 2]]) }))
    const after = generateInsights(input({ weeklyWorkouts: new Map([['2026-W41', 3]]) }))
    expect(before[0]?.id).toBe(same[0]?.id)
    expect(before[0]?.id).not.toBe(after[0]?.id)
  })

  it('saman prioriteetin havainnot järjestyvät suuruuden mukaan', () => {
    // Kyykyssä nousu on jyrkempi (+26,7 %/4 vk) kuin penkissä (+8,0 %/4 vk).
    const steep = [
      group(21, [[150, 1]]),
      group(14, [[160, 1]]),
      group(7, [[170, 1]]),
      group(0, [[180, 1]]),
    ]
    const insights = generateInsights(
      input({
        exercises: [
          { exercise: bench, groups: risingHistory() },
          { exercise: exercise('kyykky', 'Takakyykky'), groups: steep },
        ],
      }),
    )
    const trends = insights.filter((insight) => insight.kind === 'trend_up')
    expect(trends.map((insight) => insight.exerciseId)).toEqual(['kyykky', 'penkki'])
  })
})
