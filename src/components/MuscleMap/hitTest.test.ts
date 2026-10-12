import { describe, expect, it } from 'vitest'
import { MUSCLE_LABELS, muscleLabel } from '@/domain/muscles'
import type { MuscleId } from '@/domain/types'
import { BACK_MUSCLES, FRONT_MUSCLES } from './bodyPaths'
import {
  BACK_HIT_SHAPES,
  FRONT_HIT_SHAPES,
  buildHitShapes,
  distanceToShape,
  flattenPath,
  pathBounds,
  pickMuscle,
  type MuscleHitShape,
  type Point,
} from './hitTest'

/** Onko piste muodon näkyvän täytön sisällä. */
const inside = (point: Point, shape: MuscleHitShape): boolean =>
  distanceToShape(point, shape) === 0

/**
 * Ruudukko muodon sisäpisteistä. Näitä pisteitä käyttäjä oikeasti napauttaa,
 * kun hän osuu näkyvään lihakseen – ei pelkkää rajauslaatikon keskipistettä.
 */
function interiorPoints(shape: MuscleHitShape, step = 1): Point[] {
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  for (const polygon of shape.polygons) {
    for (const point of polygon) {
      minX = Math.min(minX, point.x)
      minY = Math.min(minY, point.y)
      maxX = Math.max(maxX, point.x)
      maxY = Math.max(maxY, point.y)
    }
  }

  const points: Point[] = []
  for (let x = minX; x <= maxX; x += step) {
    for (let y = minY; y <= maxY; y += step) {
      const point = { x, y }
      if (inside(point, shape)) points.push(point)
    }
  }
  return points
}

describe('polun litistys', () => {
  it('litistää suorakaiteen monikulmioksi', () => {
    expect(flattenPath('M10 10H20V20Z')).toEqual([
      [
        { x: 10, y: 10 },
        { x: 20, y: 10 },
        { x: 20, y: 20 },
      ],
    ])
  })

  it('litistää toisen asteen käyrän janoiksi käyrän muotoa seuraten', () => {
    const [polygon] = flattenPath('M0 0Q10 20 20 0Z')
    expect(polygon).toBeDefined()
    // Käyrän huippu on puolivälissä y = 10, ei kontrollipisteen y = 20.
    const peak = Math.max(...(polygon ?? []).map((point) => point.y))
    expect(peak).toBeCloseTo(10, 5)
  })

  it('tukee pieniä kirjaimia ja implisiittisiä lineto-koordinaatteja', () => {
    expect(pathBounds('m10 10 5 5h5v-10z')).toEqual({ minX: 10, minY: 5, maxX: 20, maxY: 15 })
  })

  it('rajatapaus tyhjä polku: ei monikulmioita eikä rajauslaatikkoa', () => {
    expect(flattenPath('')).toEqual([])
    expect(pathBounds('')).toEqual({ minX: 0, minY: 0, maxX: 0, maxY: 0 })
  })

  it('laskee oikean rajauslaatikon oikealle lihasmuodolle', () => {
    const bounds = pathBounds('M50.2 29Q40.5 31 32.5 41.5L50.2 36.8Z')
    expect(bounds.minX).toBeCloseTo(32.5, 1)
    expect(bounds.maxX).toBeCloseTo(50.2, 1)
    expect(bounds.minY).toBeCloseTo(29, 1)
    expect(bounds.maxY).toBeCloseTo(41.5, 1)
  })
})

describe('osumamuodot', () => {
  it('yhdistää saman lihaksen useat muodot yhdeksi osumaksi', () => {
    const shapes = buildHitShapes([
      { muscle: 'calves', d: 'M10 10H14V20H10Z' },
      { muscle: 'calves', d: 'M20 10H24V20H20Z' },
    ])
    expect(shapes).toHaveLength(1)
    expect(shapes[0]?.polygons).toHaveLength(2)
  })

  it('säilyttää piirtojärjestyksen', () => {
    const shapes = buildHitShapes([
      { muscle: 'side_delts', d: 'M10 10H20V20H10Z' },
      { muscle: 'biceps', d: 'M15 15H25V25H15Z' },
    ])
    expect(shapes.map((shape) => shape.muscle)).toEqual(['side_delts', 'biceps'])
  })

  it('kattaa kaikki 18 lihasryhmää etu- ja takanäkymä yhdessä', () => {
    const covered = new Set<MuscleId>([
      ...FRONT_HIT_SHAPES.map((shape) => shape.muscle),
      ...BACK_HIT_SHAPES.map((shape) => shape.muscle),
    ])
    for (const muscle of Object.keys(MUSCLE_LABELS) as MuscleId[]) {
      expect(covered.has(muscle), muscleLabel(muscle)).toBe(true)
    }
  })
})

describe('napautuksen osuma', () => {
  /*
    Tärkein vaatimus: kun käyttäjä napauttaa näkyvää lihasta, valituksi tulee
    juuri se lihas. Aiempi rajauslaatikkoihin perustuva malli antoi väärän
    lihaksen jopa 44 %:lle muodon pinnasta (esim. näkyvä takaolkapää valitsi
    ojentajan), joten jokaisen muodon sisäpisteet käydään läpi ruudukkona.
  */
  for (const [name, shapes, hitShapes] of [
    ['edestä', FRONT_MUSCLES, FRONT_HIT_SHAPES],
    ['takaa', BACK_MUSCLES, BACK_HIT_SHAPES],
  ] as const) {
    it(`valitsee oikean lihaksen muodon jokaisesta sisäpisteestä (${name})`, () => {
      for (const [index, shape] of hitShapes.entries()) {
        // Vain päällä olevat muodot voivat peittää tämän muodon pinnan.
        const above = hitShapes.slice(index + 1)
        const points = interiorPoints(shape)
        expect(points.length, muscleLabel(shape.muscle)).toBeGreaterThan(0)

        for (const point of points) {
          if (above.some((other) => inside(point, other))) continue
          expect(
            pickMuscle(point.x, point.y, hitShapes),
            `${muscleLabel(shape.muscle)} (${point.x}, ${point.y})`,
          ).toBe(shape.muscle)
        }
      }
      expect(shapes.length).toBeGreaterThan(0)
    })
  }

  /*
    Päällekkäisissä muodoissa voittaa päällimmäinen eli viimeksi piirretty –
    juuri se, jonka käyttäjä näkee. Lähentäjät on piirretty etureiden päälle ja
    hauis sivuolkapään päälle.
  */
  it.each([
    ['adductors', 'etureiden päällä'],
    ['biceps', 'sivuolkapään päällä'],
  ] as const)('päällimmäinen muoto voittaa: %s (%s)', (muscle, _position) => {
    const shape = FRONT_HIT_SHAPES.find((candidate) => candidate.muscle === muscle)
    expect(shape).toBeDefined()
    if (!shape) return
    const points = interiorPoints(shape, 0.5)
    expect(points.length).toBeGreaterThan(0)
    for (const point of points) {
      expect(pickMuscle(point.x, point.y, FRONT_HIT_SHAPES)).toBe(muscle)
    }
  })

  it('valitsee peilatulta puolelta saman lihaksen', () => {
    const chest = FRONT_HIT_SHAPES.find((shape) => shape.muscle === 'chest')
    expect(chest).toBeDefined()
    if (!chest) return
    const others = FRONT_HIT_SHAPES.filter((shape) => shape.muscle !== 'chest')
    // Piste, joka on vain rinnan sisällä (etuolkapää menee osin päälle).
    const point = interiorPoints(chest).find((candidate) =>
      others.every((other) => !inside(candidate, other)),
    )
    expect(point).toBeDefined()
    if (!point) return
    expect(pickMuscle(point.x, point.y, FRONT_HIT_SHAPES)).toBe('chest')
    expect(pickMuscle(100 - point.x, point.y, FRONT_HIT_SHAPES)).toBe('chest')
  })

  it('osuu viereiseen lihakseen muotojen välisestä raosta', () => {
    // Reisien väli haarasta alaspäin: molemmat reisilihakset ovat yhtä lähellä.
    expect(['quads', 'adductors']).toContain(pickMuscle(50, 140, FRONT_HIT_SHAPES))
    // Vatsan ja vinojen vatsalihasten väli.
    expect(['abs', 'obliques']).toContain(pickMuscle(41, 88, FRONT_HIT_SHAPES))
    // Kyynärvarren ja vartalon väli ei ole minkään muodon sisällä.
    expect(pickMuscle(27, 85, FRONT_HIT_SHAPES)).toBeDefined()
  })

  it('rajatapaus kartan ulkopuolinen piste: palauttaa undefined', () => {
    // Pää, kaulan yläpuoli ja ruudun vasen reuna eivät valitse lihasta.
    expect(pickMuscle(45, 12, FRONT_HIT_SHAPES)).toBeUndefined()
    expect(pickMuscle(13, 5, FRONT_HIT_SHAPES)).toBeUndefined()
    expect(pickMuscle(13, 5, BACK_HIT_SHAPES)).toBeUndefined()
    expect(pickMuscle(43, 210, FRONT_HIT_SHAPES)).toBeUndefined()
  })

  it('rajatapaus tyhjä muotoluettelo: palauttaa undefined', () => {
    expect(pickMuscle(43, 147, [])).toBeUndefined()
  })
})
