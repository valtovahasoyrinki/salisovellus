import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db/db'
import { createExercise } from '@/db/repositories/exerciseRepo'
import { addExerciseToDay, ensureProgram, listDays } from '@/db/repositories/programRepo'
import {
  finishSession,
  getSessionDetail,
  logSet,
  startSessionFromDay,
} from '@/db/repositories/sessionRepo'
import { DAY_MS } from '@/lib/date'
import { useHomeData } from './useHomeData'

const RANGE = { min: 10, max: 20 }

/** Rakentaa historian, jossa yksi liike junnaa: sama paino joka kerta. */
async function buildStagnantHistory(): Promise<void> {
  const program = await ensureProgram()
  const [push] = await listDays(program.id)
  const exerciseId = await createExercise({
    name: 'Penkkipunnerrus',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['triceps'],
    equipment: 'barbell',
    kind: 'weight_reps',
    increment: 2.5,
    defaultRestSec: 180,
    defaultRepRange: { min: 6, max: 10 },
    notes: '',
  })
  await addExerciseToDay(push!.id, exerciseId, { targetSets: 3 })

  const now = Date.now()
  for (let index = 0; index < 6; index += 1) {
    const startedAt = now - (42 - index * 7) * DAY_MS
    const sessionId = await startSessionFromDay(push!.id)
    const row = (await getSessionDetail(sessionId))!.exercises[0]!.row
    for (let setIndex = 0; setIndex < 3; setIndex += 1) {
      await logSet({
        sessionExerciseId: row.id,
        exerciseId,
        weight: 80,
        reps: 7,
        warmup: false,
        completedAt: startedAt + setIndex * 60_000,
      })
    }
    await db.sessions.update(sessionId, { startedAt })
    await finishSession(sessionId, startedAt + 3_600_000)
  }
}

beforeEach(async () => {
  await db.open()
  await Promise.all(db.tables.map((table) => table.clear()))
})

describe('kotinäkymän data', () => {
  it('lataa ohjelman, viikkoluvut ja oivallukset', async () => {
    await buildStagnantHistory()

    const { result } = renderHook(() => useHomeData(4, RANGE))
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 5000 })
    await waitFor(() => expect(result.current.days.length).toBeGreaterThan(0), { timeout: 5000 })

    expect(result.current.lastDone?.dayName).toBe('Push')
    expect(result.current.recentSessions).toHaveLength(3)
    // Kierto jatkuu Pushista seuraavaan päivään.
    expect(result.current.nextDay?.name).toBe('Pull')

    /*
      Junnaava liike tuottaa havainnon. Tämä on regressiotesti sille, että
      aikaikkunan sarjat ovat oikeasti mukana laskennassa – ilman niitä ainoa
      havainto olisi viikkotavoite.
    */
    await waitFor(
      () => expect(result.current.insights.some((insight) => insight.kind === 'stagnation')).toBe(true),
      { timeout: 5000 },
    )
  })

  it('ei ohjaa käyttöönottoon, kun ohjelma on olemassa', async () => {
    await ensureProgram()

    const { result } = renderHook(() => useHomeData(4, RANGE))
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 5000 })

    // Päivät eivät saa olla tyhjä taulukko silloin kun ohjelma on olemassa.
    expect(result.current.days).toHaveLength(3)
  })
})
