/**
 * Lihasmuotojen osumalaskenta (SPEC §7, PLAN §9.4).
 *
 * Lihasmuodot ovat kapeita – kyynärvarsi on noin 6 yksikköä leveä 76 yksikön
 * viewBoxissa – joten sormenpään osuma ei voi perustua polun täyttöön. Osuma
 * lasketaan puhtaana matematiikkana: jokaiselle muodolle muodostetaan polun
 * tarkasta rajauslaatikosta elliptinen osuma-alue, jota kasvatetaan näkyvää
 * muotoa suuremmaksi, ja napautus valitsee lähimmän alueen.
 *
 * Tässä ei käytetä DOM-APIa (`getBBox`), koska sitä ei ole jsdomissa eikä
 * Nodessa: osumatesti on yksikkötestattavissa ilman selainta.
 */
import type { MuscleId } from '@/domain/types'
import { BACK_MUSCLES, FRONT_MUSCLES, type MuscleShape } from './bodyPaths'

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

/**
 * Toisen asteen Bézierin ääriarvo yhdellä akselilla analyyttisesti:
 * t = (p0 − p1) / (p0 − 2·p1 + p2), mukaan vain jos 0 < t < 1.
 */
function quadraticExtremum(p0: number, p1: number, p2: number): number | undefined {
  const denominator = p0 - 2 * p1 + p2
  if (denominator === 0) return undefined
  const t = (p0 - p1) / denominator
  if (t <= 0 || t >= 1) return undefined
  const u = 1 - t
  return u * u * p0 + 2 * u * t * p1 + t * t * p2
}

/**
 * Polun tarkka rajauslaatikko. Tuetut komennot ovat `M L H V Q Z` (isot ja
 * pienet kirjaimet, implisiittiset lineto-koordinaatit `M`:n jälkeen ja
 * implisiittiset komentotoistot) – juuri ne, joista `bodyPaths.ts` koostuu.
 *
 * Tuntemattoman komennon (esim. `C` tai `A`) numeroargumentit otetaan mukaan
 * pistepareina. Se on varovainen likiarvo: kontrollipisteet ovat käyrän
 * ulkopuolella, joten laatikko voi olla todellista suurempi mutta ei koskaan
 * pienempi.
 */
export function pathBounds(d: string): Bounds {
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  const include = (px: number, py: number): void => {
    minX = Math.min(minX, px)
    minY = Math.min(minY, py)
    maxX = Math.max(maxX, px)
    maxY = Math.max(maxY, py)
  }

  let x = 0
  let y = 0
  let startX = 0
  let startY = 0

  for (const segment of d.matchAll(SEGMENT_PATTERN)) {
    const command = segment[1]
    const args = [...segment[2].matchAll(NUMBER_PATTERN)].map((value) => Number(value[0]))
    const relative = command === command.toLowerCase()
    const key = command.toUpperCase()

    switch (key) {
      case 'M':
      case 'L': {
        for (let i = 0; i + 1 < args.length; i += 2) {
          x = relative ? x + args[i] : args[i]
          y = relative ? y + args[i + 1] : args[i + 1]
          include(x, y)
          // Vain `M`:n ensimmäinen koordinaattipari aloittaa alipolun, loput ovat lineto.
          if (i === 0 && key === 'M') {
            startX = x
            startY = y
          }
        }
        break
      }
      case 'H': {
        for (const arg of args) {
          x = relative ? x + arg : arg
          include(x, y)
        }
        break
      }
      case 'V': {
        for (const arg of args) {
          y = relative ? y + arg : arg
          include(x, y)
        }
        break
      }
      case 'Q': {
        for (let i = 0; i + 3 < args.length; i += 4) {
          const controlX = relative ? x + args[i] : args[i]
          const controlY = relative ? y + args[i + 1] : args[i + 1]
          const endX = relative ? x + args[i + 2] : args[i + 2]
          const endY = relative ? y + args[i + 3] : args[i + 3]
          include(endX, endY)
          const peakX = quadraticExtremum(x, controlX, endX)
          if (peakX !== undefined) include(peakX, y)
          const peakY = quadraticExtremum(y, controlY, endY)
          if (peakY !== undefined) include(x, peakY)
          x = endX
          y = endY
        }
        break
      }
      case 'Z': {
        x = startX
        y = startY
        break
      }
      default: {
        for (let i = 0; i + 1 < args.length; i += 2) {
          const px = relative ? x + args[i] : args[i]
          const py = relative ? y + args[i + 1] : args[i + 1]
          include(px, py)
          if (i + 2 >= args.length) {
            x = px
            y = py
          }
        }
      }
    }
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 }
  }
  return { minX, minY, maxX, maxY }
}

export interface MuscleHitArea {
  muscle: MuscleId
  cx: number
  cy: number
  rx: number
  ry: number
}

/**
 * Osuma-alue on näkyvää muotoa leveämpi, koska lihakset ovat kapeita ja korkeita:
 * leveyttä kasvatetaan enemmän kuin korkeutta, ja pienin säde pitää huolen siitä,
 * että kyynärvarren kaltainen kaistale on sormelle osuttava.
 */
const WIDTH_FACTOR = 1.6
const HEIGHT_FACTOR = 1.15
const MIN_RADIUS = 5

/** Keskilinja: muodot on piirretty vasemmalle puolelle ja peilataan ruudulla. */
const MIRROR_AXIS = 50

/*
  Kuinka kauas alueen ulkopuolelta osuma vielä hyväksytään (normalisoitu
  etäisyys, 1 = alueen reuna). Yksi vartalonäkymä on puhelimella noin 150 px
  leveä, joten yksi viewBox-yksikkö on vain ~2 px: ilman liukumaa sormen 15 px
  heitto kapean lihaksen kohdalla ei valitsisi mitään. Liukuma ei muuta sitä,
  mikä lihas voittaa – lähin voittaa aina – vaan vain sitä, milloin napautus
  menee ohi koko kartasta (esim. pää tai ruudun reuna).
*/
const SLACK = 2.5

function unionBounds(a: Bounds, b: Bounds): Bounds {
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  }
}

/**
 * Elliptiset osuma-alueet muotolistasta. Jos samalle lihakselle on useita
 * muotoja samassa näkymässä, niiden rajauslaatikot yhdistetään yhdeksi alueeksi.
 */
export function buildHitAreas(shapes: readonly MuscleShape[]): MuscleHitArea[] {
  const merged = new Map<MuscleId, Bounds>()
  for (const shape of shapes) {
    const bounds = pathBounds(shape.d)
    const existing = merged.get(shape.muscle)
    merged.set(shape.muscle, existing === undefined ? bounds : unionBounds(existing, bounds))
  }

  return [...merged].map(([muscle, bounds]) => {
    const halfWidth = (bounds.maxX - bounds.minX) / 2
    const halfHeight = (bounds.maxY - bounds.minY) / 2
    return {
      muscle,
      cx: (bounds.minX + bounds.maxX) / 2,
      cy: (bounds.minY + bounds.maxY) / 2,
      rx: Math.max(halfWidth * WIDTH_FACTOR, MIN_RADIUS),
      ry: Math.max(halfHeight * HEIGHT_FACTOR, MIN_RADIUS),
    }
  })
}

/**
 * Napautettu lihas viewBox-koordinaateista. Peilattu puoli normalisoidaan
 * keskilinjan yli, jolloin kumpi tahansa käsi tai jalka valitsee saman lihaksen.
 * Valituksi tulee alue, jonka normalisoitu etäisyys on pienin ja enintään
 * `SLACK`; tasatuloksessa pienempi alue voittaa, jotta pieni lihas ei jää ison
 * sisään. Muodon keskipisteen etäisyys on tasan 0, joten muodon keskeltä
 * napautus valitsee aina juuri sen lihaksen.
 */
export function pickMuscle(
  x: number,
  y: number,
  areas: readonly MuscleHitArea[],
): MuscleId | undefined {
  const normalizedX = x > MIRROR_AXIS ? 2 * MIRROR_AXIS - x : x
  let best: MuscleHitArea | undefined
  let bestDistance = Number.POSITIVE_INFINITY

  for (const area of areas) {
    const dx = (normalizedX - area.cx) / area.rx
    const dy = (y - area.cy) / area.ry
    const distance = dx * dx + dy * dy
    if (distance > SLACK) continue
    if (distance < bestDistance) {
      best = area
      bestDistance = distance
      continue
    }
    if (distance === bestDistance && best !== undefined && area.rx * area.ry < best.rx * best.ry) {
      best = area
    }
  }

  return best?.muscle
}

export const FRONT_HIT_AREAS: MuscleHitArea[] = buildHitAreas(FRONT_MUSCLES)
export const BACK_HIT_AREAS: MuscleHitArea[] = buildHitAreas(BACK_MUSCLES)
