import { describe, expect, it } from 'vitest'
import { EXERCISE_LIBRARY } from '@/db/seed/exercises'
import {
  findExercises,
  findNameMatches,
  normalizeTerm,
  searchExercises,
  type FilterableExercise,
} from './exerciseSearch'
import type { MuscleId } from './types'

interface Item {
  name: string
  aliases: string[]
}

const item = (name: string, aliases: string[] = []): Item => ({ name, aliases })

const names = (items: readonly Item[], query: string): string[] =>
  searchExercises(items, query).map((match) => match.exercise.name)

/** Siemendatan nimet hakutuloksista – regressiotestien lukutapa. */
const libraryNames = (query: string): string[] =>
  searchExercises(EXERCISE_LIBRARY, query).map((match) => match.exercise.name)

const muscled = (
  name: string,
  primary: MuscleId[],
  secondary: MuscleId[] = [],
  aliases: string[] = [],
): FilterableExercise => ({ name, aliases, primaryMuscles: primary, secondaryMuscles: secondary })

describe('hakusanan normalisointi', () => {
  it('muuttaa ä, ö ja å perusmuotoon ja kirjaimet pieniksi', () => {
    expect(normalizeTerm('Käsipaino')).toBe('kasipaino')
    expect(normalizeTerm('Ylätalja')).toBe('ylatalja')
    expect(normalizeTerm('Hyvää Huomenta')).toBe('hyvaa huomenta')
    expect(normalizeTerm('Åland')).toBe('aland')
  })

  it('korvaa väliviivat ja pisteet välilyönnillä', () => {
    expect(normalizeTerm('Hack-kyykky')).toBe('hack kyykky')
    expect(normalizeTerm('T-tankosoutu')).toBe('t tankosoutu')
    expect(normalizeTerm('Hyvää huomenta -liike')).toBe('hyvaa huomenta liike')
    expect(normalizeTerm('n.k. penkki')).toBe('n k penkki')
  })

  it('tiivistää kaksoisvälilyönnit ja poistaa reunojen tyhjät', () => {
    expect(normalizeTerm('  hack   kyykky  ')).toBe('hack kyykky')
  })

  it('poistaa heittomerkit, kaksoispisteet ja sulut', () => {
    expect(normalizeTerm("farmer's walk")).toBe('farmer s walk')
    expect(normalizeTerm('Pec deck (kone)')).toBe('pec deck kone')
    expect(normalizeTerm('Huom: penkki')).toBe('huom penkki')
  })

  it('tyhjä ja pelkkiä välimerkkejä sisältävä hakusana normalisoituu tyhjäksi', () => {
    expect(normalizeTerm('')).toBe('')
    expect(normalizeTerm('  -- ..  ')).toBe('')
  })
})

describe('liikkeiden haku', () => {
  const list = [
    item('Penkkipunnerrus', ['bench', 'bench press']),
    item('Kapea penkkipunnerrus', ['close grip bench']),
    item('Vipunosto rintaliikelaitteessa', ['pec deck', 'pec dec', 'butterfly']),
    item('Hack-kyykky', ['hack squat']),
    item('Käsipainoveto pään yli', ['pullover']),
  ]

  it('tyhjä hakusana palauttaa kaikki liikkeet nimijärjestyksessä', () => {
    const results = searchExercises(list, '   ')
    expect(results).toHaveLength(list.length)
    expect(results.map((match) => match.exercise.name)).toEqual([
      'Hack-kyykky',
      'Kapea penkkipunnerrus',
      'Käsipainoveto pään yli',
      'Penkkipunnerrus',
      'Vipunosto rintaliikelaitteessa',
    ])
    expect(results.every((match) => match.aliasHit === undefined)).toBe(true)
  })

  it('löytää liikkeen ä-kirjaimella kirjoitetusta nimestä ilman ä:tä', () => {
    expect(names(list, 'kasipaino')).toEqual(['Käsipainoveto pään yli'])
  })

  it('löytää väliviivallisen nimen välilyönnillä kirjoitettuna', () => {
    expect(names(list, 'hack kyykky')).toEqual(['Hack-kyykky'])
  })

  it('vaatii, että jokainen hakusana osuu', () => {
    expect(names(list, 'kapea penkki')).toEqual(['Kapea penkkipunnerrus'])
    expect(names(list, 'kapea kyykky')).toEqual([])
  })

  it('löytää liikkeen monisanaisella aliaksella ja kertoo osuman syyn', () => {
    const results = searchExercises(list, 'pec dec')
    expect(results).toHaveLength(1)
    expect(results[0]?.exercise.name).toBe('Vipunosto rintaliikelaitteessa')
    // Näytetään osuvin alias: haettu muoto, ei ensimmäinen sanaosuma.
    expect(results[0]?.aliasHit).toBe('pec dec')
  })

  it('aliasHit puuttuu, kun osuma tuli nimestä', () => {
    const results = searchExercises(list, 'penkkipunnerrus')
    expect(results.every((match) => match.aliasHit === undefined)).toBe(true)
  })

  it('sietää yhden kirjoitusvirheen vähintään 5-merkkisessä sanassa', () => {
    // Vierekkäisten merkkien vaihto aliaksessa.
    const pulldown = [item('Ylätalja', ['lat pulldown', 'pulldown'])]
    expect(names(pulldown, 'pulldwon')).toEqual(['Ylätalja'])
    // Puuttuva kirjain nimessä: molemmat ovat kirjoitusvirhetasolla, joten
    // järjestys on nimen mukaan.
    expect(names(list, 'penkkipunerrus')).toEqual(['Kapea penkkipunnerrus', 'Penkkipunnerrus'])
    // Ylimääräinen kirjain nimessä.
    expect(names(list, 'penkkipunnnerrus')).toEqual(['Kapea penkkipunnerrus', 'Penkkipunnerrus'])
  })

  it('ei osu, kun virhe on yhtä muokkausta suurempi', () => {
    const pulldown = [item('Ylätalja', ['lat pulldown', 'pulldown'])]
    expect(names(pulldown, 'pulddwn')).toEqual([])
  })

  it('rajatapaus: 4-merkkinen sana virheellä ei osu', () => {
    expect(names(list, 'benh')).toEqual([])
    // Tarkka alias "bench" nostaa penkkipunnerruksen kapean variantin edelle.
    expect(names(list, 'bench')).toEqual(['Penkkipunnerrus', 'Kapea penkkipunnerrus'])
  })

  it('järjestää tulokset tasoittain: nimen alku, nimen sisältö, nimi, alias, kirjoitusvirhe', () => {
    const levels = [
      item('Soutu cabel'),
      item('Soutu matala', ['cable']),
      item('Soutu cable laitteessa'),
      item('Iso cable soutu'),
      item('Cable soutu'),
    ]
    expect(names(levels, 'cable soutu')).toEqual([
      'Cable soutu',
      'Iso cable soutu',
      'Soutu cable laitteessa',
      'Soutu matala',
      'Soutu cabel',
    ])
  })

  it('yhtä vahvojen osumien sisällä järjestys on nimen mukaan (fi)', () => {
    const sameLevel = [item('Ärsyttävä soutu'), item('Alatalja soutu'), item('Bulgarialainen soutu')]
    expect(names(sameLevel, 'soutu')).toEqual([
      'Alatalja soutu',
      'Bulgarialainen soutu',
      'Ärsyttävä soutu',
    ])
  })

  it('sanan alusta löytynyt osuma menee toisen sanan sisältä löytyneen edelle', () => {
    const rows = [item('Ojentajasoutu'), item('Ärsyttävä soutu')]
    expect(names(rows, 'soutu')).toEqual(['Ärsyttävä soutu', 'Ojentajasoutu'])
  })

  it('löytää liikkeen, kun hakusanasta puuttuu välilyönti', () => {
    const rows = [item('Kasvoveto taljassa', ['face pull']), item('Hack-kyykky')]
    expect(names(rows, 'facepull')).toEqual(['Kasvoveto taljassa'])
    expect(names(rows, 'hackkyykky')).toEqual(['Hack-kyykky'])
  })

  it('tasan hakusanaa vastaava alias voittaa toisen sanan sisältä löytyvän nimen', () => {
    const rows = [item('Pendlay-soutu'), item('Maastaveto', ['deadlift', 'dl'])]
    expect(names(rows, 'dl')).toEqual(['Maastaveto', 'Pendlay-soutu'])
  })
})

describe('haku lihasryhmäsuodatuksella', () => {
  const list = [
    muscled('Penkkipunnerrus', ['chest'], ['triceps'], ['bench']),
    muscled('Takakyykky', ['quads'], ['glutes'], ['squat']),
    muscled('Ylätalja', ['lats'], ['biceps'], ['lat pulldown']),
  ]

  it('kaikki-suodatin ei rajaa mitään', () => {
    expect(findExercises(list, '', 'all')).toHaveLength(3)
  })

  it('suodattaa myös toissijaisista lihasryhmistä', () => {
    expect(findExercises(list, '', 'triceps').map((m) => m.exercise.name)).toEqual([
      'Penkkipunnerrus',
    ])
    expect(findExercises(list, '', 'biceps').map((m) => m.exercise.name)).toEqual(['Ylätalja'])
  })

  it('yhdistää haun ja suodattimen', () => {
    expect(findExercises(list, 'kyykky', 'chest')).toEqual([])
    expect(findExercises(list, 'kyykky', 'quads').map((m) => m.exercise.name)).toEqual([
      'Takakyykky',
    ])
  })

  it('aliashaku toimii suodatuksen kanssa', () => {
    const results = findExercises(list, 'pulldown', 'lats')
    expect(results.map((m) => m.exercise.name)).toEqual(['Ylätalja'])
    expect(results[0]?.aliasHit).toBe('lat pulldown')
  })
})

describe('tarkka nimiosuma kaksoiskappalevaroitukseen', () => {
  const list = [
    item('Vipunosto rintaliikelaitteessa', ['pec deck', 'pec dec', 'butterfly']),
    item('Pec dec kone'),
    item('Penkkipunnerrus', ['bench']),
  ]

  it('osuu aliakseen tarkalleen', () => {
    expect(findNameMatches(list, 'pec deck').map((row) => row.name)).toEqual([
      'Vipunosto rintaliikelaitteessa',
    ])
  })

  it('osuu nimeen kirjainkoosta ja välimerkeistä riippumatta', () => {
    expect(findNameMatches(list, '  PENKKIPUNNERRUS ').map((row) => row.name)).toEqual([
      'Penkkipunnerrus',
    ])
  })

  it('rajatapaus: pidempi nimi ei osu lyhyempään hakusanaan', () => {
    expect(findNameMatches(list, 'Pec dec kone').map((row) => row.name)).toEqual(['Pec dec kone'])
    expect(findNameMatches(list, 'pec')).toEqual([])
    expect(findNameMatches(list, 'penkki')).toEqual([])
  })

  it('ei tee sumeaa vertailua', () => {
    expect(findNameMatches(list, 'penkkipunerrus')).toEqual([])
  })

  it('löytää siemendatasta liikkeen aliaksella', () => {
    expect(findNameMatches(EXERCISE_LIBRARY, 'pec deck').map((row) => row.name)).toEqual([
      'Vipunosto rintaliikelaitteessa',
    ])
  })
})

/*
  Lähtötilanteen (1.0) nollaosumat: nämä hakusanat eivät löytäneet mitään,
  vaikka liike oli kirjastossa. Testi ajetaan oikealla siemendatalla.
*/
const REGRESSIONS: Array<[string, string]> = [
  ['pec dec', 'Vipunosto rintaliikelaitteessa'],
  ['pec', 'Vipunosto rintaliikelaitteessa'],
  ['peck deck', 'Vipunosto rintaliikelaitteessa'],
  ['butterfly', 'Vipunosto rintaliikelaitteessa'],
  ['lat pulldown', 'Ylätalja'],
  ['face pull', 'Kasvoveto taljassa'],
  ['hip thrust', 'Lantionnosto tangolla'],
  ['rdl', 'Romanialainen maastaveto'],
  ['leg press', 'Jalkaprässi'],
  ['bench', 'Penkkipunnerrus'],
  ['squat', 'Takakyykky'],
  ['rope pushdown', 'Ojentajapunnerrus köydellä'],
]

/**
 * Hakusanat, joilla oikean liikkeen on oltava ensimmäinen osuma. Nämä ovat
 * juuri ne haut, jotka antoivat 1.0:ssa nolla osumaa: jos liike ei nouse
 * kärkeen, haku ei käytännössä auta salilla.
 */
const FIRST_HITS: Array<[string, string]> = [
  ['pec dec', 'Vipunosto rintaliikelaitteessa'],
  ['peck deck', 'Vipunosto rintaliikelaitteessa'],
  ['butterfly', 'Vipunosto rintaliikelaitteessa'],
  ['face pull', 'Kasvoveto taljassa'],
  ['lat pulldown', 'Ylätalja'],
  ['hip thrust', 'Lantionnosto tangolla'],
  ['rdl', 'Romanialainen maastaveto'],
  ['leg press', 'Jalkaprässi'],
  ['bench', 'Penkkipunnerrus'],
  ['squat', 'Takakyykky'],
  ['rope pushdown', 'Ojentajapunnerrus köydellä'],
]

describe('siemendatan regressiohaut', () => {
  it.each(REGRESSIONS)('"%s" löytää liikkeen %s', (query, expected) => {
    expect(libraryNames(query)).toContain(expected)
  })

  it.each(FIRST_HITS)('"%s" nostaa liikkeen %s ensimmäiseksi', (query, expected) => {
    expect(libraryNames(query)[0]).toBe(expected)
  })

  it('kirjoitusvirhe "pulldwon" löytää ylätaljan siemendatasta', () => {
    expect(libraryNames('pulldwon')).toContain('Ylätalja')
  })

  it('"kasipaino" ja "hack kyykky" löytävät oikean liikkeen siemendatasta', () => {
    expect(libraryNames('kasipaino')[0]).toBe('Käsipainoveto pään yli')
    expect(libraryNames('hack kyykky')[0]).toBe('Hack-kyykky')
  })

  it('aliasosuma kertoo, mikä alias osui', () => {
    const results = searchExercises(EXERCISE_LIBRARY, 'butterfly')
    expect(results[0]?.aliasHit).toBe('butterfly')
  })

  it('näyttää osuvimman aliaksen eikä ensimmäistä sanaosumaa', () => {
    // Liikkeellä on sekä "pec deck" että "pec dec"; haettu muoto näytetään.
    const results = searchExercises(EXERCISE_LIBRARY, 'pec dec')
    expect(results[0]?.aliasHit).toBe('pec dec')
  })

  it('tyhjä hakusana palauttaa koko kirjaston nimijärjestyksessä', () => {
    const results = libraryNames('')
    expect(results).toHaveLength(EXERCISE_LIBRARY.length)
    expect(results[0]).toBe('Aasipohje')
  })
})
