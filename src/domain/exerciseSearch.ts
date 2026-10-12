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
 * Tulosjärjestys on tasoittain, pienin taso ensin:
 * - taso 0: nimi **alkaa** hakusanalla tai jokin alias on **tasan** hakusana
 * - taso 1: nimi sisältää hakusanan sanan alusta, tai alias alkaa hakusanalla
 * - taso 2: nimi sisältää hakusanan toisen sanan sisältä, tai kaikki sanat
 *   löytyvät nimestä
 * - taso 3: vähintään yksi sana löytyi vain aliaksesta
 * - taso 4: jokin sana osui vain kirjoitusvirheellä
 *
 * Saman tason sisällä ratkaisee ensin **heikkojen osumien määrä** (sana löytyi
 * toisen sanan sisältä tai vasta välilyönnit poistamalla), sitten aliaksen
 * osuvuus koko hakusanaan ja vasta lopuksi nimi (`fi`). Ilman heikkojen
 * osumien painoa "lat pulldown" nostaisi ensimmäiseksi liikkeen, jonka nimessä
 * on "ylätaljassa" (sisältää kirjaimet "lat"), eikä Ylätaljaa.
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

/**
 * Nimen vertailuavain (uniikkius ja kaksoiskappalevaroitus). Normalisoitu muoto
 * riittää lähes aina, mutta pelkistä välimerkeistä koostuva nimi ("--..")
 * normalisoituu tyhjäksi – silloin verrataan trimmattua pienaakkosmuotoa, jotta
 * varoitus ja luonnin esto ovat samaa mieltä.
 */
export function nameKey(name: string): string {
  const normalized = normalizeTerm(name)
  return normalized === '' ? name.trim().toLocaleLowerCase('fi') : normalized
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
  /** Ilman välilyöntejä, jotta "pecdec" löytää aliaksen "pec dec". */
  squashed: string
  words: string[]
}

interface Candidate<T> {
  exercise: T
  name: string
  normalizedName: string
  squashedName: string
  nameWords: string[]
  aliases: NormalizedAlias[]
}

const squash = (value: string): string => value.replaceAll(' ', '')

function toCandidate<T extends SearchableExercise>(exercise: T): Candidate<T> {
  const normalizedName = normalizeTerm(exercise.name)
  return {
    exercise,
    name: exercise.name,
    normalizedName,
    squashedName: squash(normalizedName),
    nameWords: words(normalizedName),
    aliases: (exercise.aliases ?? []).map((alias) => {
      const normalized = normalizeTerm(alias)
      return { original: alias, normalized, squashed: squash(normalized), words: words(normalized) }
    }),
  }
}

interface WordHit {
  /** Sana löytyi normalisoidusta nimestä alimerkkijonona. */
  inName: boolean
  /** Osuma syntyi vain yhden muokkauksen päästä. */
  typo: boolean
  /**
   * Heikko osuma: sana löytyi toisen sanan sisältä ("lat" sanassa
   * "ylataljassa") tai vasta välilyönnit poistamalla. Heikko osuma ei estä
   * löytymistä mutta pudottaa liikkeen tulosten hännille.
   */
  weak: boolean
  /** Alias, josta osuma tuli, kun nimi ei osunut. */
  alias?: string
}

/** Osuuko sana sanan alkuun (vahva) vai toisen sanan sisään (heikko)? */
function isMidWord(haystack: string, word: string): boolean {
  const index = haystack.indexOf(word)
  return index > 0 && haystack[index - 1] !== ' '
}

/**
 * Etsii yhden hakusanan osuman: ensin tarkka osuma nimestä, sitten tarkka
 * osuma aliaksista, sitten osuma ilman välilyöntejä ("facepull"), ja vasta
 * lopuksi yhden muokkauksen päässä oleva sana (ensin nimestä, sitten
 * aliaksista).
 */
function matchWord<T>(candidate: Candidate<T>, word: string): WordHit | undefined {
  if (candidate.normalizedName.includes(word)) {
    return { inName: true, typo: false, weak: isMidWord(candidate.normalizedName, word) }
  }

  for (const alias of candidate.aliases) {
    if (alias.normalized.includes(word)) {
      return {
        inName: false,
        typo: false,
        weak: isMidWord(alias.normalized, word),
        alias: alias.original,
      }
    }
  }

  const squashedWord = squash(word)
  if (candidate.squashedName.includes(squashedWord)) {
    return { inName: true, typo: false, weak: true }
  }
  for (const alias of candidate.aliases) {
    if (alias.squashed.includes(squashedWord)) {
      return { inName: false, typo: false, weak: true, alias: alias.original }
    }
  }

  if (word.length < TYPO_MIN_LENGTH) return undefined

  for (const nameWord of candidate.nameWords) {
    if (isWithinOneEdit(word, nameWord)) return { inName: true, typo: true, weak: false }
  }

  for (const alias of candidate.aliases) {
    for (const aliasWord of alias.words) {
      if (isWithinOneEdit(word, aliasWord)) {
        return { inName: false, typo: true, weak: false, alias: alias.original }
      }
    }
  }

  return undefined
}

interface Ranked<T> {
  exercise: T
  level: number
  /** Montako hakusanaa osui vain toisen sanan sisältä tai välilyönnit poistaen. */
  weakWords: number
  /**
   * 0 = alias on tasan hakusana, 1 = yhden muokkauksen päässä siitä,
   * 2 = alkaa hakusanalla, 3 = sisältää sen, 4 = ei osumaa koko hakusanaan.
   */
  aliasLevel: number
  name: string
  aliasHit: string | undefined
}

/** Osuvin alias koko hakusanaan: tämä näytetään rivillä ja ratkaisee järjestyksen. */
function bestAlias<T>(
  candidate: Candidate<T>,
  query: string,
): { level: number; alias: string | undefined } {
  let level = 4
  let alias: string | undefined
  for (const candidateAlias of candidate.aliases) {
    const normalized = candidateAlias.normalized
    const current =
      normalized === query
        ? 0
        : isWithinOneEdit(normalized, query)
          ? 1
          : normalized.startsWith(query)
            ? 2
            : normalized.includes(query)
              ? 3
              : 4
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
  let weakWords = 0
  let aliasHit: string | undefined

  for (const word of queryWords) {
    const hit = matchWord(candidate, word)
    if (!hit) return undefined
    if (hit.typo) anyTypo = true
    if (hit.weak) weakWords += 1
    if (!hit.inName) {
      allInName = false
      if (aliasHit === undefined && hit.alias !== undefined) aliasHit = hit.alias
    }
  }

  const best = bestAlias(candidate, query)
  const nameIndex = candidate.normalizedName.indexOf(query)
  const nameAtWordStart = nameIndex === 0 || (nameIndex > 0 && candidate.normalizedName[nameIndex - 1] === ' ')

  const level = anyTypo
    ? 4
    : // Tasan hakusanaa vastaava alias on yhtä vahva signaali kuin nimen alku.
      candidate.normalizedName.startsWith(query) || best.level === 0
      ? 0
      : nameAtWordStart || best.level === 2
        ? 1
        : nameIndex >= 0 || allInName
          ? 2
          : 3

  return {
    exercise: candidate.exercise,
    level,
    weakWords,
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
        a.level - b.level ||
        a.weakWords - b.weakWords ||
        a.aliasLevel - b.aliasLevel ||
        a.name.localeCompare(b.name, 'fi'),
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
  const target = nameKey(name)
  if (target === '') return []
  return items.filter(
    (item) =>
      nameKey(item.name) === target ||
      (item.aliases ?? []).some((alias) => nameKey(alias) === target),
  )
}
