/**
 * Datapisteiden harvennus piirtoa varten (PLAN.md §7, oletus 11).
 *
 * LTTB (Largest Triangle Three Buckets) säilyttää käyrän muodon – huiput ja
 * notkot – vaikka pisteitä karsitaan. Tooltip ja laskenta käyttävät aina
 * täyttä dataa; vain piirretty polku harvennetaan.
 */
export interface Point2D {
  x: number
  y: number
}

export function decimate<T extends Point2D>(points: T[], threshold: number): T[] {
  if (threshold >= points.length || threshold < 3) return points

  const first = points[0]
  const last = points.at(-1)
  if (!first || !last) return points

  const result: T[] = [first]
  // Ensimmäinen ja viimeinen piste säilyvät aina, loput jaetaan ämpäreihin.
  const bucketSize = (points.length - 2) / (threshold - 2)
  let previous = first

  for (let i = 0; i < threshold - 2; i += 1) {
    /*
      Ämpäri ei saa ulottua viimeiseen pisteeseen asti: muuten viimeinen ämpäri
      valitsisi saman pisteen, joka lisätään silmukan jälkeen, ja tulokseen
      jäisi kaksoiskappale.
    */
    const rangeStart = Math.min(Math.floor((i + 1) * bucketSize) + 1, points.length - 2)
    const rangeEnd = Math.max(
      rangeStart + 1,
      Math.min(Math.floor((i + 2) * bucketSize) + 1, points.length - 1),
    )

    // Seuraavan ämpärin keskipiste on kolmion kolmas kärki.
    const nextStart = rangeEnd
    const nextEnd = Math.min(Math.floor((i + 3) * bucketSize) + 1, points.length)
    let avgX = 0
    let avgY = 0
    let count = 0
    for (let j = nextStart; j < nextEnd; j += 1) {
      const point = points[j]
      if (!point) continue
      avgX += point.x
      avgY += point.y
      count += 1
    }
    if (count > 0) {
      avgX /= count
      avgY /= count
    } else {
      avgX = last.x
      avgY = last.y
    }

    let bestArea = -1
    let best = points[rangeStart] ?? previous
    for (let j = rangeStart; j < rangeEnd; j += 1) {
      const point = points[j]
      if (!point) continue
      const area = Math.abs(
        (previous.x - avgX) * (point.y - previous.y) - (previous.x - point.x) * (avgY - previous.y),
      )
      if (area > bestArea) {
        bestArea = area
        best = point
      }
    }

    // Ämpärit voivat osua päällekkäin, kun kynnys on lähellä pistemäärää.
    if (best !== previous) {
      result.push(best)
      previous = best
    }
  }

  result.push(last)
  return result
}
