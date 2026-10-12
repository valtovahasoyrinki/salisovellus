/**
 * Liikkeiden haku (SPEC §6.1, §6.2). Puhdas moduuli: ei React- eikä
 * Dexie-riippuvuuksia.
 *
 * Normalisointi tehdään molemmille puolille (`normalizeTerm`), jotta
 * "kasipaino" löytää "Käsipaino" ja "hack kyykky" löytää "Hack-kyykky".
 * Hakusana pilkotaan sanoiksi ja jokaisen sanan on osuttava nimeen tai
 * johonkin aliakseen. Vähintään 5-merkkisissä sanoissa sallitaan yksi
 * muokkaus (lisäys, poisto, korvaus tai vierekkäisten merkkien vaihto),
 * jotta "pulldwon" löytää "pulldown".
 *
 * Tulosjärjestys on tasoittain, pienin taso ensin, ja saman tason sisällä
 * nimen mukaan (`fi`):
 * - taso 0: normalisoitu nimi **alkaa** koko normalisoidulla hakusanalla
 * - taso 1: normalisoitu nimi **sisältää** koko normalisoidun hakusanan
 * - taso 2: kaikki sanat osuvat tarkasti ja kaikki löytyvät nimestä
 * - taso 3: kaikki sanat osuvat tarkasti, mutta vähintään yksi vain aliaksesta
 * - taso 4: jokin sana osui vain kirjoitusvirheellä
 *
 * Saman tason sisällä ratkaisee ensin aliaksen osuvuus (alias on tasan
 * hakusana → alias alkaa hakusanalla → alias sisältää sen → ei aliasosumaa) ja
 * vasta sitten nimi. Ilman tätä "pec dec" nostaisi ensimmäiseksi liikkeen,
 * jonka alias on "reverse pec deck", eikä sitä, jonka alias on "pec dec".
 */
import type { MuscleId } from './types'

/**
 * Välimerkit, jotka korvataan välilyönnillä: väliviivat, pisteet, pilkut,
 * heittomerkit, kaksoispisteet ja sulut. Näin "Hack-kyykky", "Hyvää huomenta
 * -liike" ja "t-bar row" pilkkoutuvat samoiksi sanoiksi kuin käyttäjän
 * kirjoittama haku.
 */
const PUNCTUATION = /[-–—.,:;'’´`()]+/g

/** Yhdistyvät diakriittiset merkit NFD-hajotuksen jälkeen (ä → a + ¨). */
const COMBINING_MARKS = /\p{M}+/gu

const WHITESPACE = /\s+/g

/** Lyhyemmissä sanoissa yksi muokkaus osuisi liian moneen liikkeeseen. */
const TYPO_MIN_LENGTH = 5

/** Pienet kirjaimet (`fi`), diakriitit ja välimerkit pois, välilyönnit tiiviiksi. */
export function normalizeTerm(input: string): string {
  return input
    .toLocaleLowerCase('fi')
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .replace(PUNCTUATION, ' ')
    .replace(WHITESPACE, ' ')
    .trim()
}

export interface SearchableExercise {
  name: string
  aliases?: string[]
}

export interface ExerciseMatch<T> {
  exercise: T
  /** Alias, joka tuotti osuman sanalle, jota ei löytynyt nimestä. */
  aliasHit?: string
}

/**
 * Onko `a` yhden muokkauksen päässä `b`:stä? Muokkaus on lisäys, poisto,
 * korvaus tai kahden vierekkäisen merkin vaihto. Vertailu tehdään yhdellä
 * läpikäynnillä, koska koko Levenshtein-matriisia ei tarvita yhden
 * muokkauksen rajalle.
 */
function isWithinOneEdit(a: string, b: string): boolean {
  if (a === b) return true
  const diff = a.length - b.length
  if (diff > 1 || diff < -1) return false

  if (diff === 0) {
    let first = -1
    let second = -1
    for (let i = 0; i < a.length; i += 1) {
      if (a[i] === b[i]) continue
      if (first === -1) first = i
      else if (second === -1) second = i
      else return false
    }
    // Yksi ero = korvaus. Kaksi vierekkäistä peilattua eroa = vaihto.
    if (second === -1) return true
    return second === first + 1 && a[first] === b[second] && a[second] === b[first]
  }

  const longer = diff === 1 ? a : b
  const shorter = diff === 1 ? b : a
  let i = 0
  let j = 0
  let skipped = false
  while (i < longer.length && j < shorter.length) {
    if (longer[i] === shorter[j]) {
      i += 1
      j += 1
      continue
    }
    if (skipped) return false
    skipped = true
    i += 1
  }
  return true
}

function words(normalized: string): string[] {
  return normalized === '' ? [] : normalized.split(' ')
}

interface NormalizedAlias {
  /** Alkuperäinen kirjoitusasu, joka näytetään rivillä ("myös: pec deck"). */
  original: string
  normalized: string
  words: string[]
}

interface Candidate<T> {
  exercise: T
  name: string
  normalizedName: string
  nameWords: string[]
  aliases: NormalizedAlias[]
}

function toCandidate<T extends SearchableExercise>(exercise: T): Candidate<T> {
  const normalizedName = normalizeTerm(exercise.name)
  return {
    exercise,
    name: exercise.name,
    normalizedName,
    nameWords: words(normalizedName),
    aliases: (exercise.aliases ?? []).map((alias) => {
      const normalized = normalizeTerm(alias)
      return { original: alias, normalized, words: words(normalized) }
    }),
  }
}

interface WordHit {
  /** Sana löytyi normalisoidusta nimestä alimerkkijonona. */
  inName: boolean
  /** Osuma syntyi vain yhden muokkauksen päästä. */
  typo: boolean
  /** Alias, josta osuma tuli, kun nimi ei osunut. */
  alias?: string
}

/**
 * Etsii yhden hakusanan osuman: ensin tarkka osuma nimestä, sitten tarkka
 * osuma aliaksista, ja vasta lopuksi yhden muokkauksen päässä oleva sana
 * (ensin nimestä, sitten aliaksista).
 */
function matchWord<T>(candidate: Candidate<T>, word: string): WordHit | undefined {
  if (candidate.normalizedName.includes(word)) return { inName: true, typo: false }

  for (const alias of candidate.aliases) {
    if (alias.normalized.includes(word)) {
      return { inName: false, typo: false, alias: alias.original }
    }
  }

  if (word.length < TYPO_MIN_LENGTH) return undefined

  for (const nameWord of candidate.nameWords) {
    if (isWithinOneEdit(word, nameWord)) return { inName: true, typo: true }
  }

  for (const alias of candidate.aliases) {
    for (const aliasWord of alias.words) {
      if (isWithinOneEdit(word, aliasWord)) {
        return { inName: false, typo: true, alias: alias.original }
      }
    }
  }

  return undefined
}

interface Ranked<T> {
  exercise: T
  level: number
  /** 0 = alias on tasan hakusana, 1 = alkaa sillä, 2 = sisältää, 3 = ei osumaa. */
  aliasLevel: number
  name: string
  aliasHit: string | undefined
}

/** Osuvin alias koko hakusanaan: tämä näytetään rivillä ja ratkaisee järjestyksen. */
function bestAlias<T>(
  candidate: Candidate<T>,
  query: string,
): { level: number; alias: string | undefined } {
  let level = 3
  let alias: string | undefined
  for (const candidateAlias of candidate.aliases) {
    const normalized = candidateAlias.normalized
    const current =
      normalized === query ? 0 : normalized.startsWith(query) ? 1 : normalized.includes(query) ? 2 : 3
    if (current < level) {
      level = current
      alias = candidateAlias.original
      if (level === 0) break
    }
  }
  return { level, alias }
}

function rank<T>(
  candidate: Candidate<T>,
  query: string,
  queryWords: string[],
): Ranked<T> | undefined {
  let allInName = true
  let anyTypo = false
  let aliasHit: string | undefined

  for (const word of queryWords) {
    const hit = matchWord(candidate, word)
    if (!hit) return undefined
    if (hit.typo) anyTypo = true
    if (!hit.inName) {
      allInName = false
      if (aliasHit === undefined && hit.alias !== undefined) aliasHit = hit.alias
    }
  }

  const level = anyTypo
    ? 4
    : candidate.normalizedName.startsWith(query)
      ? 0
      : candidate.normalizedName.includes(query)
        ? 1
        : allInName
          ? 2
          : 3

  const best = bestAlias(candidate, query)
  return {
    exercise: candidate.exercise,
    level,
    aliasLevel: best.level,
    name: candidate.name,
    // Näytetään osuvin alias, ei vain ensimmäistä sanaosumaa.
    aliasHit: aliasHit === undefined ? undefined : (best.alias ?? aliasHit),
  }
}

/** `aliasHit` jätetään kokonaan pois, kun osuma tuli nimestä. */
function toMatch<T>(ranked: Ranked<T>): ExerciseMatch<T> {
  return ranked.aliasHit === undefined
    ? { exercise: ranked.exercise }
    : { exercise: ranked.exercise, aliasHit: ranked.aliasHit }
}

/**
 * Hakee liikkeet nimen ja aliasten perusteella. Tyhjä hakusana palauttaa
 * kaikki liikkeet nimijärjestyksessä ilman `aliasHit`-kenttää.
 */
export function searchExercises<T extends SearchableExercise>(
  items: readonly T[],
  query: string,
): Array<ExerciseMatch<T>> {
  const normalizedQuery = normalizeTerm(query)
  if (normalizedQuery === '') {
    return [...items]
      .sort((a, b) => a.name.localeCompare(b.name, 'fi'))
      .map((exercise) => ({ exercise }))
  }

  const queryWords = words(normalizedQuery)
  const ranked: Array<Ranked<T>> = []
  for (const item of items) {
    const hit = rank(toCandidate(item), normalizedQuery, queryWords)
    if (hit) ranked.push(hit)
  }

  return ranked
    .sort(
      (a, b) =>
        a.level - b.level || a.aliasLevel - b.aliasLevel || a.name.localeCompare(b.name, 'fi'),
    )
    .map(toMatch)
}

export interface FilterableExercise extends SearchableExercise {
  primaryMuscles: MuscleId[]
  secondaryMuscles: MuscleId[]
}

/** Haku ja lihasryhmäsuodatus yhdessä: suodatus ensin, haku suodatetusta joukosta. */
export function findExercises<T extends FilterableExercise>(
  items: readonly T[],
  query: string,
  muscle: MuscleId | 'all',
): Array<ExerciseMatch<T>> {
  const scoped =
    muscle === 'all'
      ? items
      : items.filter(
          (item) =>
            item.primaryMuscles.includes(muscle) || item.secondaryMuscles.includes(muscle),
        )
  return searchExercises(scoped, query)
}

/**
 * Tarkka nimiosuma kaksoiskappalevaroitukseen (SPEC §6.2): normalisoitu nimi
 * tai jokin normalisoitu alias on tasan sama kuin annettu nimi. Ei sumeaa
 * vertailua, jotta "Pec dec kone" ei varoita olemassa olevasta liikkeestä.
 */
export function findNameMatches<T extends SearchableExercise>(
  items: readonly T[],
  name: string,
): T[] {
  const target = normalizeTerm(name)
  return items.filter(
    (item) =>
      normalizeTerm(item.name) === target ||
      (item.aliases ?? []).some((alias) => normalizeTerm(alias) === target),
  )
}
