import { describe, expect, it } from 'vitest'
import { MUSCLE_ORDER, muscleLabel } from '@/domain/muscles'
import type { MuscleId } from '@/domain/types'
import { BACK_MUSCLES, FRONT_MUSCLES, type MuscleShape } from './bodyPaths'
import {
  BACK_HIT_AREAS,
  FRONT_HIT_AREAS,
  buildHitAreas,
  pathBounds,
  pickMuscle,
  type MuscleHitArea,
} from './hitTest'

/** Muodon rajauslaatikon keskipiste – sama piste, jota Playwright napauttaa. */
function shapeCenter(shape: MuscleShape): { x: number; y: number } {
  const bounds = pathBounds(shape.d)
  return { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 }
}

describe('pathBounds', () => {
  it('laskee suorakaiteen rajauslaatikon komennoista M, H ja V', () => {
    expect(pathBounds('M10 10H20V20Z')).toEqual({ minX: 10, minY: 10, maxX: 20, maxY: 20 })
  })

  it('ottaa toisen asteen käyrän ääriarvon mukaan, kun se on välillä 0–1', () => {
    // Kontrollipiste on y = 20, mutta käyrä kaartaa vain puoleen väliin (y = 10).
    expect(pathBounds('M0 0Q10 20 20 0')).toEqual({ minX: 0, minY: 0, maxX: 20, maxY: 10 })
  })

  it('jättää ääriarvon pois, kun t on välin 0–1 ulkopuolella', () => {
    // Molemmilla akseleilla t on 0 tai 1, joten laatikko tulee pelkistä päätepisteistä.
    expect(pathBounds('M0 0Q20 0 20 20')).toEqual({ minX: 0, minY: 0, maxX: 20, maxY: 20 })
  })

  it('tukee pieniä kirjaimia ja implisiittisiä lineto-koordinaatteja', () => {
    // m10 10 → (10,10), implisiittinen lineto 5 5 → (15,15), h5 → (20,15), v-10 → (20,5).
    expect(pathBounds('m10 10 5 5h5v-10z')).toEqual({ minX: 10, minY: 5, maxX: 20, maxY: 15 })
  })

  it('ottaa tuntemattoman komennon argumentit pistepareina (varovainen likiarvo)', () => {
    // Kuubisen käyrän todellinen maksimi on y = 7,5; kontrollipisteet antavat 10.
    expect(pathBounds('M0 0C0 10 10 10 10 0')).toEqual({ minX: 0, minY: 0, maxX: 10, maxY: 10 })
  })

  it('rajatapaus tyhjä polku: palauttaa nollalaatikon', () => {
    expect(pathBounds('')).toEqual({ minX: 0, minY: 0, maxX: 0, maxY: 0 })
  })

  it('laskee oikean laatikon oikealle lihasmuodolle', () => {
    // Epäkäs edestä: M50.2 29 → Q(40.5 31) 32.5 41.5 → L50.2 36.8 → Z.
    const bounds = pathBounds('M50.2 29Q40.5 31 32.5 41.5L50.2 36.8Z')
    expect(bounds).toEqual({ minX: 32.5, minY: 29, maxX: 50.2, maxY: 41.5 })
  })
})

describe('buildHitAreas', () => {
  it('kasvattaa osuma-alueen näkyvää muotoa suuremmaksi', () => {
    const [area] = buildHitAreas([{ muscle: 'forearms', d: 'M20 70H26V94H20Z' }])
    expect(area).toBeDefined()
    expect(area?.cx).toBeCloseTo(23)
    expect(area?.cy).toBeCloseTo(82)
    // Kapea muoto saa vähintään viiden yksikön säteen, eli kaksinkertaisen leveytensä.
    expect(area?.rx).toBeCloseTo(5)
    expect(area?.ry).toBeCloseTo(13.8)
  })

  it('yhdistää saman lihaksen useat muodot yhdeksi alueeksi', () => {
    const areas = buildHitAreas([
      { muscle: 'chest', d: 'M10 10H20V20H10Z' },
      { muscle: 'chest', d: 'M30 30H40V40H30Z' },
    ])
    expect(areas).toHaveLength(1)
    expect(areas[0]?.cx).toBeCloseTo(25)
    expect(areas[0]?.cy).toBeCloseTo(25)
  })

  it('kattaa kaikki 18 lihasryhmää etu- ja takanäkymä yhdessä', () => {
    const covered = new Set<MuscleId>([
      ...FRONT_HIT_AREAS.map((area) => area.muscle),
      ...BACK_HIT_AREAS.map((area) => area.muscle),
    ])
    expect(MUSCLE_ORDER).toHaveLength(18)
    for (const muscle of MUSCLE_ORDER) {
      expect(covered.has(muscle), `${muscleLabel(muscle)} puuttuu osuma-alueista`).toBe(true)
    }
    expect(covered.size).toBe(18)
  })
})

describe('pickMuscle', () => {
  it('valitsee oikean lihaksen jokaisen etumuodon keskeltä', () => {
    for (const shape of FRONT_MUSCLES) {
      const { x, y } = shapeCenter(shape)
      expect(
        pickMuscle(x, y, FRONT_HIT_AREAS),
        `etunäkymä: ${muscleLabel(shape.muscle)} keskipisteestä (${x}, ${y})`,
      ).toBe(shape.muscle)
    }
  })

  it('valitsee oikean lihaksen jokaisen takamuodon keskeltä', () => {
    for (const shape of BACK_MUSCLES) {
      const { x, y } = shapeCenter(shape)
      expect(
        pickMuscle(x, y, BACK_HIT_AREAS),
        `takanäkymä: ${muscleLabel(shape.muscle)} keskipisteestä (${x}, ${y})`,
      ).toBe(shape.muscle)
    }
  })

  it('valitsee peilatulta puolelta saman lihaksen', () => {
    for (const [shapes, areas] of [
      [FRONT_MUSCLES, FRONT_HIT_AREAS],
      [BACK_MUSCLES, BACK_HIT_AREAS],
    ] as const) {
      for (const shape of shapes) {
        const { x, y } = shapeCenter(shape)
        expect(
          pickMuscle(100 - x, y, areas),
          `peilattu puoli: ${muscleLabel(shape.muscle)}`,
        ).toBe(pickMuscle(x, y, areas))
      }
    }
  })

  it('valitsee pienen lihaksen, joka on ison sisällä', () => {
    // Lähentäjät ovat etureiden rajauslaatikon sisällä, mutta omasta keskeltään ne voittavat.
    expect(pickMuscle(46.5, 143, FRONT_HIT_AREAS)).toBe('adductors')
  })

  it('osuu lihakseen myös aivan muodon vierestä', () => {
    // x = 35 on etureiden muodon (37,4–49,2) ulkopuolella, mutta osuma-alueen sisällä.
    expect(pickMuscle(35, 147, FRONT_HIT_AREAS)).toBe('quads')
  })

  it('sietää sormen heiton kapean lihaksen kohdalla', () => {
    /*
      Kyynärvarsi on vain noin 6 yksikköä leveä, mikä on puhelimella ~12 px.
      Napautus 7 yksikköä (noin 14 px) sivussa keskilinjasta osuu silti, koska
      lähin alue voittaa liukuman sisällä.
    */
    const forearms = FRONT_HIT_AREAS.find((area) => area.muscle === 'forearms')
    expect(forearms).toBeDefined()
    if (!forearms) return
    expect(pickMuscle(forearms.cx - 7, forearms.cy, FRONT_HIT_AREAS)).toBe('forearms')
    expect(pickMuscle(forearms.cx + 4, forearms.cy, FRONT_HIT_AREAS)).toBe('forearms')
  })

  it('rajatapaus kartan ulkopuolinen piste: palauttaa undefined', () => {
    // Pään kohta ja kartan vasen yläkulma eivät ole minkään lihaksen liukumalla.
    expect(pickMuscle(13, 5, FRONT_HIT_AREAS)).toBeUndefined()
    expect(pickMuscle(13, 5, BACK_HIT_AREAS)).toBeUndefined()
    expect(pickMuscle(45, 14, FRONT_HIT_AREAS)).toBeUndefined()
  })

  it('rajatapaus tasatulos: valitsee pienemmän alueen', () => {
    const areas: MuscleHitArea[] = [
      { muscle: 'quads', cx: 40, cy: 100, rx: 10, ry: 10 },
      { muscle: 'adductors', cx: 40, cy: 100, rx: 6, ry: 6 },
    ]
    expect(pickMuscle(40, 100, areas)).toBe('adductors')
    expect(pickMuscle(40, 100, [...areas].reverse())).toBe('adductors')
  })

  it('rajatapaus tyhjä alueluettelo: palauttaa undefined', () => {
    expect(pickMuscle(43, 147, [])).toBeUndefined()
  })
})
