/**
 * Lihasmuotojen osumalaskenta (SPEC §7, PLAN §9.4).
 *
 * Napautus osuu siihen lihakseen, jonka **näkyvän muodon** sisällä piste on:
 * polut litistetään monikulmioiksi ja piste testataan niitä vasten. Jos piste
 * osuu usean muodon sisään (lähentäjät etureiden päällä, hauis sivuolkapään
 * päällä), voittaa viimeksi piirretty eli se, jonka käyttäjä näkee – sama
 * sääntö kuin selaimen piirrossa.
 *
 * Jos piste ei ole yhdenkään muodon sisällä, valitaan lähin muoto `SLACK`-rajan
 * sisältä: lihakset ovat kapeita (kyynärvarsi noin 6 yksikköä 76 yksikön
 * viewBoxissa, puhelimella ~12 px), joten sormen heitto muotojen väliin ei saa
 * jäädä tuloksetta. Kartan ulkopuolinen napautus (pää, ruudun reuna) ei valitse
 * mitään.
 *
 * Tässä ei käytetä DOM-APIa (`getBBox`, `isPointInFill`), koska niitä ei ole
 * jsdomissa eikä Nodessa: osumalaskenta on yksikkötestattavissa ilman selainta.
 */
import type { MuscleId } from '@/domain/types'
import { BACK_MUSCLES, FRONT_MUSCLES, type MuscleShape } from './bodyPaths'

export interface Point {
  x: number
  y: number
}

export interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

/** Yksi komentokirjain ja sen numeroargumentit. */
const SEGMENT_PATTERN = /([a-zA-Z])([^a-zA-Z]*)/g

/** Luku desimaaleineen, etumerkkeineen ja eksponenttimuodossa. */
const NUMBER_PATTERN = /[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g

/** Toisen asteen käyrä litistetään näin moneen janaan. */
const CURVE_STEPS = 8

/** Keskilinja: muodot on piirretty vasemmalle puolelle ja peilataan ruudulla. */
const MIRROR_AXIS = 50

/**
 * Kuinka kauas näkyvän muodon ulkopuolelta osuma vielä hyväksytään
 * (viewBox-yksikköä, noin 2 px puhelimella). Kattaa muotojen väliset raot ja
 * sormen heiton, mutta jättää pään ja ruudun reunat valinnan ulkopuolelle.
 */
const SLACK = 4

/**
 * Litistää polun monikulmioiksi (yksi per alipolku). Tuetut komennot ovat
 * `M L H V Q Z` (isot ja pienet kirjaimet, implisiittiset lineto-koordinaatit
 * `M`:n jälkeen ja implisiittiset komentotoistot) – juuri ne, joista
 * `bodyPaths.ts` koostuu. Tuntemattoman komennon (esim. `C`) koordinaattiparit
 * otetaan mukaan janoina: tulos on karkeampi mutta ei koskaan tyhjä.
 */
export function flattenPath(d: string): Point[][] {
  const polygons: Point[][] = []
  let current: Point[] = []
  let x = 0
  let y = 0
  let startX = 0
  let startY = 0

  const lineTo = (nextX: number, nextY: number): void => {
    current.push({ x: nextX, y: nextY })
    x = nextX
    y = nextY
  }

  const quadraticTo = (controlX: number, controlY: number, endX: number, endY: number): void => {
    const fromX = x
    const fromY = y
    for (let step = 1; step <= CURVE_STEPS; step += 1) {
      const t = step / CURVE_STEPS
      const u = 1 - t
      current.push({
        x: u * u * fromX + 2 * u * t * controlX + t * t * endX,
        y: u * u * fromY + 2 * u * t * controlY + t * t * endY,
      })
    }
    x = endX
    y = endY
  }

  const closeSubpath = (): void => {
    if (current.length >= 3) polygons.push(current)
    current = []
  }

  for (const segment of d.matchAll(SEGMENT_PATTERN)) {
    const command = segment[1]
    const args = [...segment[2].matchAll(NUMBER_PATTERN)].map((value) => Number(value[0]))
    const relative = command === command.toLowerCase()
    const letter = command.toUpperCase()

    switch (letter) {
      case 'M':
      case 'L': {
        for (let i = 0; i + 1 < args.length; i += 2) {
          const nextX = relative ? x + args[i] : args[i]
          const nextY = relative ? y + args[i + 1] : args[i + 1]
          // Vain `M`:n ensimmäinen pari aloittaa alipolun, loput ovat lineto.
          if (i === 0 && letter === 'M') {
            closeSubpath()
            startX = nextX
            startY = nextY
          }
          lineTo(nextX, nextY)
        }
        break
      }
      case 'H': {
        for (const arg of args) lineTo(relative ? x + arg : arg, y)
        break
      }
      case 'V': {
        for (const arg of args) lineTo(x, relative ? y + arg : arg)
        break
      }
      case 'Q': {
        for (let i = 0; i + 3 < args.length; i += 4) {
          quadraticTo(
            relative ? x + args[i] : args[i],
            relative ? y + args[i + 1] : args[i + 1],
            relative ? x + args[i + 2] : args[i + 2],
            relative ? y + args[i + 3] : args[i + 3],
          )
        }
        break
      }
      case 'Z': {
        closeSubpath()
        x = startX
        y = startY
        break
      }
      default: {
        for (let i = 0; i + 1 < args.length; i += 2) {
          lineTo(relative ? x + args[i] : args[i], relative ? y + args[i + 1] : args[i + 1])
        }
      }
    }
  }

  closeSubpath()
  return polygons
}

/** Polun tarkka rajauslaatikko litistetystä muodosta. */
export function pathBounds(d: string): Bounds {
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const polygon of flattenPath(d)) {
    for (const point of polygon) {
      minX = Math.min(minX, point.x)
      minY = Math.min(minY, point.y)
      maxX = Math.max(maxX, point.x)
      maxY = Math.max(maxY, point.y)
    }
  }

  if (!Number.isFinite(minX)) return { minX: 0, minY: 0, maxX: 0, maxY: 0 }
  return { minX, minY, maxX, maxY }
}

export interface MuscleHitShape {
  muscle: MuscleId
  polygons: Point[][]
}

/** Säteenheitto: onko piste monikulmion sisällä. */
function pointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const a = polygon[i]
    const b = polygon[j]
    const crosses = a.y > point.y !== b.y > point.y
    if (crosses && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside
    }
  }
  return inside
}

function distanceToSegment(point: Point, a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lengthSquared = dx * dx + dy * dy
  if (lengthSquared === 0) return Math.hypot(point.x - a.x, point.y - a.y)
  const raw = ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared
  const t = Math.min(1, Math.max(0, raw))
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy))
}

/** Etäisyys muotoon: 0 jos piste on sen sisällä, muuten lähimmälle reunalle. */
export function distanceToShape(point: Point, shape: MuscleHitShape): number {
  let best = Number.POSITIVE_INFINITY
  for (const polygon of shape.polygons) {
    if (pointInPolygon(point, polygon)) return 0
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
      best = Math.min(best, distanceToSegment(point, polygon[j], polygon[i]))
    }
  }
  return best
}

/**
 * Osumamuodot muotolistasta: saman lihaksen useat polut yhdistetään. Lista
 * säilyy piirtojärjestyksessä, jota `pickMuscle` käyttää päällekkäisyyksiin.
 */
export function buildHitShapes(shapes: readonly MuscleShape[]): MuscleHitShape[] {
  const merged = new Map<MuscleId, Point[][]>()
  for (const shape of shapes) {
    const polygons = merged.get(shape.muscle) ?? []
    polygons.push(...flattenPath(shape.d))
    merged.set(shape.muscle, polygons)
  }

  return [...merged].map(([muscle, polygons]) => ({ muscle, polygons }))
}

/**
 * Napautettu lihas viewBox-koordinaateista. Peilattu puoli normalisoidaan
 * keskilinjan yli, jolloin kumpi tahansa käsi tai jalka valitsee saman lihaksen.
 */
export function pickMuscle(
  x: number,
  y: number,
  shapes: readonly MuscleHitShape[],
): MuscleId | undefined {
  const point: Point = { x: x > MIRROR_AXIS ? 2 * MIRROR_AXIS - x : x, y }

  let best: MuscleHitShape | undefined
  let bestDistance = Number.POSITIVE_INFINITY

  for (const shape of shapes) {
    const distance = distanceToShape(point, shape)
    if (distance > SLACK) continue
    /*
      `<=` tarkoittaa, että yhtä lähellä olevista voittaa listan viimeinen eli
      päällimmäinen muoto. Juuri sen käyttäjä näkee napautuskohdassa.
    */
    if (distance <= bestDistance) {
      best = shape
      bestDistance = distance
    }
  }

  return best?.muscle
}

export const FRONT_HIT_SHAPES: MuscleHitShape[] = buildHitShapes(FRONT_MUSCLES)
export const BACK_HIT_SHAPES: MuscleHitShape[] = buildHitShapes(BACK_MUSCLES)
