import { describe, expect, it } from 'vitest'
import { decimate } from './decimate'

const series = (count: number): Array<{ x: number; y: number }> =>
  Array.from({ length: count }, (_, index) => ({
    x: index,
    y: Math.sin(index / 7) * 50 + 100,
  }))

describe('datapisteiden harvennus', () => {
  it('palauttaa pisteet sellaisinaan, jos kynnys ei ylity', () => {
    const points = series(10)
    expect(decimate(points, 400)).toEqual(points)
    expect(decimate(points, 10)).toEqual(points)
  })

  it('harventaa tasan pyydettyyn määrään', () => {
    expect(decimate(series(5000), 400)).toHaveLength(400)
  })

  it('säilyttää ensimmäisen ja viimeisen pisteen', () => {
    const points = series(1000)
    const result = decimate(points, 50)
    expect(result[0]).toEqual(points[0])
    expect(result.at(-1)).toEqual(points.at(-1))
  })

  it('säilyttää käyrän ääriarvot kohtuullisella tarkkuudella', () => {
    const points = series(2000)
    const result = decimate(points, 200)
    const originalMax = Math.max(...points.map((point) => point.y))
    const decimatedMax = Math.max(...result.map((point) => point.y))
    expect(decimatedMax).toBeGreaterThan(originalMax - 1)
  })

  it('järjestys säilyy nousevana', () => {
    const result = decimate(series(3000), 250)
    for (let index = 1; index < result.length; index += 1) {
      expect(result[index]!.x).toBeGreaterThan(result[index - 1]!.x)
    }
  })

  it('liian pieni kynnys ei kaada funktiota', () => {
    const points = series(100)
    expect(decimate(points, 2)).toEqual(points)
  })
})
