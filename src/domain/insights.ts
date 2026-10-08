/**
 * Oivallukset – sääntöpohjainen valmentaja (SPEC §6.9).
 *
 * Puhdas ja offline: ei tietokantaa, ei kielimallikutsuja. Kutsuja laskee
 * syötteet valmiiksi (`sessionGroups`, `weeklySets`, `weeklyWorkoutCounts`,
 * `setsByMovementGroup`) ja saa takaisin havainnot prioriteettijärjestyksessä.
 * Näkymä leikkaa listasta 1–3 tärkeintä (`insightsForHome`,
 * `insightsForExercise`).
 *
 * Sävy: suora, lyhyt, numerot mukana, toimintaohje lopussa. Ei emojeja, ei
 * kehuja ilman dataa.
 *
 * **Vakaus ja toiston esto.** Jokaisen havainnon `id` johdetaan sen omasta
 * sisällöstä: sääntötunnus, kohde (liike, lihasryhmä, viikko) ja havainnon
 * luvut pyöristettyinä (`toFixed`, ei paikallista muotoilua). Siksi sama data
 * tuottaa aina saman `id`:n, ja kun luvut muuttuvat, `id` muuttuu. Kutsuja voi
 * tallentaa näytetyt `id`:t ja jättää saman havainnon toistamatta päivästä
 * toiseen, kunnes data muuttuu. Mikään sääntö ei katso kelloa muuten kuin
 * `now`-parametrin kautta, joten tulos on deterministinen.
 */
import { MOVEMENT_GROUP_LABELS, MUSCLE_ORDER, muscleLabel, type MovementGroup } from './muscles'
import { detectNewRecords, recordLabel } from './records'
import type { SessionSetGroup } from './sessionGroups'
import { detectStagnation } from './stagnation'
import { e1rmTrend } from './trend'
import type {
  Exercise,
  MuscleId,
  RecordKind,
  RepRange,
  SetEntry,
  Timestamp,
  WeekKey,
} from './types'
import { previousWeekKey } from './weeklySets'
import { dateKeyOf, daysBetweenDateKeys } from '@/lib/date'

/* --- Kynnysarvot ------------------------------------------------------------ */

/** Nousevan trendin raja (%/4 vk): tämän alle jäävä muutos on kohinaa. */
export const TREND_UP_PCT = 2
/** Laskevan trendin raja (%/4 vk). */
export const TREND_DOWN_PCT = -2
/** Liikeryhmien sallittu ero sarjamäärissä (%). */
export const GROUP_IMBALANCE_PCT = 25
/** Jalkasarjojen vähimmäisosuus ylävartalon sarjojen keskiarvosta. */
export const LEGS_SHARE_MIN = 0.6
/** Tauko, jonka jälkeen liikkeestä huomautetaan (vrk). */
export const LAYOFF_DAYS = 21
/** Ennätys on "tuore" näin monta vuorokautta. */
export const FRESH_RECORD_DAYS = 7

/* --- Tyypit ---------------------------------------------------------------- */

export type InsightKind =
  | 'stagnation'
  | 'trend_down'
  | 'group_imbalance'
  | 'legs_share'
  | 'muscle_below_range'
  | 'muscle_above_range'
  | 'layoff'
  | 'weekly_target'
  | 'trend_up'
  | 'fresh_record'

/**
 * `general` = kotinäkymän yleinen havainto, `exercise` = yhteen liikkeeseen
 * sidottu havainto. Liikehavainnot näkyvät myös kotinäkymässä, mutta
 * liikeanalyysi näyttää vain oman liikkeensä havainnot.
 */
export type InsightScope = 'general' | 'exercise'

export interface Insight {
  /** Deterministinen tunniste sisällöstä (ks. moduulin kuvaus). */
  id: string
  kind: InsightKind
  /** Pienempi on tärkeämpi. Lista on valmiiksi järjestetty. */
  priority: number
  scope: InsightScope
  /** Asetettu, kun havainto koskee yhtä liikettä. */
  exerciseId?: string
  /** Koko havainto yhtenä rivinä, toimintaohje mukaan lukien. */
  text: string
  /** Pelkkä toimintaohje, jos säännöllä on sellainen (sisältyy myös `text`iin). */
  action?: string
}

/** Yhden liikkeen historia valmiiksi ryhmiteltynä (`groupSetsBySession`). */
export interface InsightExerciseInput {
  exercise: Exercise
  groups: SessionSetGroup[]
}

export interface InsightInput {
  now: Timestamp
  currentWeek: WeekKey
  /** Viikkotavoite (SPEC §6.11, oletus 4). */
  weeklyTarget: number
  /** Päätetyt treenit viikoittain (`weeklyWorkoutCounts`). */
  weeklyWorkouts: Map<WeekKey, number>
  /** Viikkosarjat lihasryhmittäin (`weeklySetsByMuscle`). */
  weeklySets: Map<WeekKey, Map<MuscleId, number>>
  /** Viikkosarjojen ohjealue lihasryhmälle (SPEC §6.8, oletus 10–20). */
  weeklySetsRange: RepRange
  /** Työsarjat liikeryhmittäin tarkasteltavalta jaksolta (`setsByMovementGroup`). */
  setsByGroup: Record<MovementGroup, number>
  /** Liikkeet, joista halutaan havaintoja. Kutsuja jättää arkistoidut pois. */
  exercises: InsightExerciseInput[]
}

/** Sääntöjen keskinäinen tärkeysjärjestys (pienempi = tärkeämpi). */
export const INSIGHT_PRIORITY: Record<InsightKind, number> = {
  stagnation: 10,
  trend_down: 15,
  group_imbalance: 20,
  legs_share: 25,
  muscle_below_range: 30,
  muscle_above_range: 35,
  layoff: 40,
  weekly_target: 50,
  trend_up: 60,
  fresh_record: 70,
}

/* --- Muotoilu -------------------------------------------------------------- */

// Domain-kerros ei riipu src/lib/formatista, joten luvut muotoillaan tässä.
const oneDecimal = new Intl.NumberFormat('fi-FI', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})
const upToOneDecimal = new Intl.NumberFormat('fi-FI', { maximumFractionDigits: 1 })
const upToTwoDecimals = new Intl.NumberFormat('fi-FI', { maximumFractionDigits: 2 })

/** "+4,1 %" / "−3,2 %" (oikea miinusmerkki). */
function signedPct(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '±'
  return `${sign}${oneDecimal.format(Math.abs(value))} %`
}

/** "30 %" */
function pct(value: number): string {
  return `${Math.round(value)} %`
}

function kg(value: number): string {
  return `${upToTwoDecimals.format(value)} kg`
}

function setsText(value: number): string {
  return `${upToOneDecimal.format(value)} ${value === 1 ? 'työsarja' : 'työsarjaa'}`
}

function workoutsText(value: number): string {
  return `${value} ${value === 1 ? 'treeni' : 'treeniä'}`
}

function daysBetween(from: Timestamp, to: Timestamp): number {
  return daysBetweenDateKeys(dateKeyOf(from), dateKeyOf(to))
}

/* --- Sääntöjen apurit ------------------------------------------------------ */

interface Candidate {
  insight: Insight
  /** Suuruusluokka saman prioriteetin sisäiseen järjestykseen. */
  magnitude: number
}

function build(
  kind: InsightKind,
  id: string,
  text: string,
  magnitude: number,
  options: { exerciseId?: string; action?: string } = {},
): Candidate {
  return {
    insight: {
      id,
      kind,
      priority: INSIGHT_PRIORITY[kind],
      scope: options.exerciseId === undefined ? 'general' : 'exercise',
      exerciseId: options.exerciseId,
      text,
      action: options.action,
    },
    magnitude,
  }
}

/** Ennätystyypit tärkeysjärjestyksessä, kun yhdellä kerralla tuli useampi. */
const RECORD_PREFERENCE: RecordKind[] = [
  'heaviest',
  'best_e1rm',
  'most_reps_at_weight',
  'best_set_volume',
]

/** Viimeisimmällä kerralla rikotut ennätykset, paras tyyppi ensin. */
function latestRecord(groups: SessionSetGroup[]): { kind: RecordKind; set: SetEntry } | null {
  // Ennätys vaatii vertailukohdan: ensimmäinen kerta ei ole havainto.
  if (groups.length < 2) return null
  const last = groups.at(-1)
  if (!last) return null

  const baseline: SetEntry[] = groups.slice(0, -1).flatMap((group) => group.sets)
  const hits = new Map<RecordKind, SetEntry>()
  for (const set of last.sets) {
    for (const kind of detectNewRecords(set, baseline)) hits.set(kind, set)
    baseline.push(set)
  }

  for (const kind of RECORD_PREFERENCE) {
    const set = hits.get(kind)
    if (set) return { kind, set }
  }
  return null
}

function exerciseCandidates(entry: InsightExerciseInput, now: Timestamp): Candidate[] {
  const candidates: Candidate[] = []
  const { exercise, groups } = entry
  const last = groups.at(-1)
  if (!last) return candidates

  const stagnation = detectStagnation(groups, now)
  if (stagnation.stagnant) {
    candidates.push(
      build(
        'stagnation',
        `stagnation:${exercise.id}:${stagnation.sessionsSinceRecord}:${stagnation.weeksSinceRecord}`,
        `${exercise.name} ei ole noussut ${stagnation.sessionsSinceRecord} kertaan (${stagnation.weeksSinceRecord} vk). Vaihda toistoalue tai kevennä viikko.`,
        stagnation.weeksSinceRecord,
        { exerciseId: exercise.id, action: 'Vaihda toistoalue tai kevennä viikko.' },
      ),
    )
  }

  const trend = e1rmTrend(groups)
  if (trend && trend.changePctPer4Weeks >= TREND_UP_PCT) {
    candidates.push(
      build(
        'trend_up',
        `trend_up:${exercise.id}:${trend.changePctPer4Weeks.toFixed(1)}`,
        `${exercise.name}: e1RM ${signedPct(trend.changePctPer4Weeks)} / 4 vk, ${trend.pointCount} kertaa. Pidä linja.`,
        trend.changePctPer4Weeks,
        { exerciseId: exercise.id, action: 'Pidä linja.' },
      ),
    )
  }
  if (trend && trend.changePctPer4Weeks <= TREND_DOWN_PCT) {
    candidates.push(
      build(
        'trend_down',
        `trend_down:${exercise.id}:${trend.changePctPer4Weeks.toFixed(1)}`,
        `${exercise.name}: e1RM ${signedPct(trend.changePctPer4Weeks)} / 4 vk. Kevennä viikko ja palaa perusvolyymiin.`,
        Math.abs(trend.changePctPer4Weeks),
        { exerciseId: exercise.id, action: 'Kevennä viikko ja palaa perusvolyymiin.' },
      ),
    )
  }

  const daysSinceLast = daysBetween(last.completedAt, now)
  if (daysSinceLast >= LAYOFF_DAYS) {
    candidates.push(
      build(
        'layoff',
        `layoff:${exercise.id}:${daysSinceLast}`,
        `${exercise.name}: edellisestä kerrasta ${daysSinceLast} vrk. Palaa liikkeeseen tai korvaa se ohjelmassa.`,
        daysSinceLast,
        { exerciseId: exercise.id, action: 'Palaa liikkeeseen tai korvaa se ohjelmassa.' },
      ),
    )
  }

  if (daysSinceLast <= FRESH_RECORD_DAYS) {
    const record = latestRecord(groups)
    if (record) {
      candidates.push(
        build(
          'fresh_record',
          `fresh_record:${exercise.id}:${record.kind}:${record.set.id}`,
          `${exercise.name}: uusi ennätys ${kg(record.set.weight)} × ${record.set.reps} (${recordLabel(record.kind).toLocaleLowerCase('fi')}).`,
          record.set.weight,
          { exerciseId: exercise.id },
        ),
      )
    }
  }

  return candidates
}

function balanceCandidates(setsByGroup: Record<MovementGroup, number>): Candidate[] {
  const candidates: Candidate[] = []
  const { push, pull, legs } = setsByGroup

  const high = Math.max(push, pull)
  const low = Math.min(push, pull)
  if (high > 0) {
    const gap = ((high - low) / high) * 100
    if (gap >= GROUP_IMBALANCE_PCT) {
      const behind: MovementGroup = pull < push ? 'pull' : 'push'
      const ahead: MovementGroup = behind === 'pull' ? 'push' : 'pull'
      const action = behind === 'pull' ? 'Lisää selkäsarjoja.' : 'Lisää rintasarjoja.'
      candidates.push(
        build(
          'group_imbalance',
          `group_imbalance:${behind}:${gap.toFixed(1)}`,
          `${MOVEMENT_GROUP_LABELS[behind]}-sarjoja on ${pct(gap)} vähemmän kuin ${MOVEMENT_GROUP_LABELS[ahead]}-sarjoja. ${action}`,
          gap,
          { action },
        ),
      )
    }
  }

  const upperAverage = (push + pull) / 2
  if (upperAverage > 0 && legs < upperAverage * LEGS_SHARE_MIN) {
    const gap = ((upperAverage - legs) / upperAverage) * 100
    candidates.push(
      build(
        'legs_share',
        `legs_share:${gap.toFixed(1)}`,
        `Jalkasarjoja on ${pct(gap)} vähemmän kuin ylävartalon sarjoja keskimäärin. Lisää jalkasarjoja.`,
        gap,
        { action: 'Lisää jalkasarjoja.' },
      ),
    )
  }

  return candidates
}

/**
 * Viikkosarjojen ohjealue arvioidaan viimeisestä **täydestä** viikosta: kesken
 * oleva viikko näyttäisi aina alittavan ohjealueen. Havainto annetaan vain
 * treenatuista lihasryhmistä ja korkeintaan yksi kumpaankin suuntaan, jotta
 * kotinäkymä ei täyty lähes samanlaisista riveistä.
 */
/** Näyttöjärjestys tasatilanteen ratkaisuun (`MUSCLE_ORDER`). */
function muscleOrder(muscle: MuscleId): number {
  const index = MUSCLE_ORDER.indexOf(muscle)
  return index === -1 ? MUSCLE_ORDER.length : index
}

function muscleCandidates(input: InsightInput): Candidate[] {
  const week = previousWeekKey(input.currentWeek)
  const muscles = input.weeklySets.get(week)
  if (!muscles || muscles.size === 0) return []

  let lowest: { muscle: MuscleId; sets: number } | undefined
  let highest: { muscle: MuscleId; sets: number } | undefined
  for (const [muscle, sets] of muscles) {
    if (
      sets < input.weeklySetsRange.min &&
      (!lowest || sets < lowest.sets || (sets === lowest.sets && muscleOrder(muscle) < muscleOrder(lowest.muscle)))
    ) {
      lowest = { muscle, sets }
    }
    if (
      sets > input.weeklySetsRange.max &&
      (!highest ||
        sets > highest.sets ||
        (sets === highest.sets && muscleOrder(muscle) < muscleOrder(highest.muscle)))
    ) {
      highest = { muscle, sets }
    }
  }

  const range = `${input.weeklySetsRange.min}–${input.weeklySetsRange.max}`
  const candidates: Candidate[] = []
  if (lowest) {
    candidates.push(
      build(
        'muscle_below_range',
        `muscle_below_range:${week}:${lowest.muscle}:${lowest.sets.toFixed(1)}`,
        `${muscleLabel(lowest.muscle)}: ${setsText(lowest.sets)} viime viikolla, ohjealue ${range}. Lisää yksi liike.`,
        input.weeklySetsRange.min - lowest.sets,
        { action: 'Lisää yksi liike.' },
      ),
    )
  }
  if (highest) {
    candidates.push(
      build(
        'muscle_above_range',
        `muscle_above_range:${week}:${highest.muscle}:${highest.sets.toFixed(1)}`,
        `${muscleLabel(highest.muscle)}: ${setsText(highest.sets)} viime viikolla, ohjealue ${range}. Karsi yksi liike.`,
        highest.sets - input.weeklySetsRange.max,
        { action: 'Karsi yksi liike.' },
      ),
    )
  }
  return candidates
}

function weeklyTargetCandidates(input: InsightInput): Candidate[] {
  if (input.weeklyTarget <= 0) return []
  const done = input.weeklyWorkouts.get(input.currentWeek) ?? 0
  if (done >= input.weeklyTarget) return []

  const missing = input.weeklyTarget - done
  const action = `Varaa vielä ${workoutsText(missing)} tälle viikolle.`
  return [
    build(
      'weekly_target',
      `weekly_target:${input.currentWeek}:${done}/${input.weeklyTarget}`,
      `${workoutsText(done)} tällä viikolla, tavoite ${input.weeklyTarget}. ${action}`,
      missing,
      { action },
    ),
  ]
}

/* --- Julkinen rajapinta ---------------------------------------------------- */

/**
 * Kaikki havainnot prioriteettijärjestyksessä. Saman prioriteetin sisällä
 * suurempi poikkeama voittaa, ja täysin tasatilanteessa `id` ratkaisee, jotta
 * järjestys on deterministinen.
 */
export function generateInsights(input: InsightInput): Insight[] {
  const candidates: Candidate[] = [
    ...input.exercises.flatMap((entry) => exerciseCandidates(entry, input.now)),
    ...balanceCandidates(input.setsByGroup),
    ...muscleCandidates(input),
    ...weeklyTargetCandidates(input),
  ]

  candidates.sort(
    (a, b) =>
      a.insight.priority - b.insight.priority ||
      b.magnitude - a.magnitude ||
      a.insight.id.localeCompare(b.insight.id),
  )

  return candidates.map((candidate) => candidate.insight)
}

/** Kotinäkymän 1–3 tärkeintä havaintoa (SPEC §6.9). */
export function insightsForHome(insights: Insight[], limit = 3): Insight[] {
  return insights.slice(0, limit)
}

/** Yhden liikkeen havainnot liikeanalyysiin. */
export function insightsForExercise(
  insights: Insight[],
  exerciseId: string,
  limit = 3,
): Insight[] {
  return insights.filter((insight) => insight.exerciseId === exerciseId).slice(0, limit)
}
