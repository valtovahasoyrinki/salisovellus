import { db } from '@/db/db'
import type {
  DateKey,
  Exercise,
  Session,
  SessionExercise,
  SetEntry,
  Timestamp,
} from '@/domain/types'
import { dateKeyOf, timestampFromDateKey } from '@/lib/date'
import { newId } from '@/lib/id'
import { listDayExercises } from './programRepo'

/** Yhden liikkeen tiedot treenissä: rivi, liike ja sen sarjat järjestyksessä. */
export interface SessionExerciseDetail {
  row: SessionExercise
  exercise: Exercise
  sets: SetEntry[]
}

export interface SessionDetail {
  session: Session
  exercises: SessionExerciseDetail[]
}

export function getActiveSession(): Promise<Session | undefined> {
  return db.sessions.where('status').equals('active').first()
}

export function getSession(id: string): Promise<Session | undefined> {
  return db.sessions.get(id)
}

/**
 * Treenin aloitus ohjelman päivästä. Päivän liikkeet kopioidaan sessioon
 * omina riveinään: historia on pyhä, ohjelman myöhempi muokkaus ei muuta tätä
 * treeniä (SPEC §5).
 */
export async function startSessionFromDay(dayId: string): Promise<string> {
  const sessionId = newId()
  await db.transaction(
    'rw',
    [db.sessions, db.sessionExercises, db.workoutDays, db.dayExercises],
    async () => {
      const day = await db.workoutDays.get(dayId)
      const dayExercises = await listDayExercises(dayId)
      const startedAt = Date.now()
      await db.sessions.add({
        id: sessionId,
        dayId,
        dayName: day?.name ?? 'Treeni',
        startedAt,
        note: '',
        status: 'active',
        dateKey: dateKeyOf(startedAt),
      })
      await db.sessionExercises.bulkAdd(
        dayExercises.map((row, index) => ({
          id: newId(),
          sessionId,
          exerciseId: row.exerciseId,
          order: index,
          note: '',
          skipped: false,
        })),
      )
    },
  )
  return sessionId
}

export async function startEmptySession(name = 'Vapaa treeni'): Promise<string> {
  const id = newId()
  const startedAt = Date.now()
  await db.sessions.add({
    id,
    dayName: name,
    startedAt,
    note: '',
    status: 'active',
    dateKey: dateKeyOf(startedAt),
  })
  return id
}

/** Jälkikirjaus: treeni menneelle päivälle (SPEC §6.3). */
export async function startPastSession(dateKey: DateKey, dayId?: string): Promise<string> {
  const startedAt = timestampFromDateKey(dateKey)
  if (dayId !== undefined) {
    const sessionId = await startSessionFromDay(dayId)
    await db.sessions.update(sessionId, { startedAt, dateKey })
    return sessionId
  }
  const id = newId()
  await db.sessions.add({
    id,
    dayName: 'Vapaa treeni',
    startedAt,
    note: '',
    status: 'active',
    dateKey,
  })
  return id
}

export async function getSessionDetail(sessionId: string): Promise<SessionDetail | undefined> {
  const session = await db.sessions.get(sessionId)
  if (!session) return undefined

  const rows = await db.sessionExercises
    .where('[sessionId+order]')
    .between([sessionId, -Infinity], [sessionId, Infinity])
    .toArray()
  const [exercises, sets] = await Promise.all([
    db.exercises.bulkGet(rows.map((row) => row.exerciseId)),
    db.setEntries.where('sessionId').equals(sessionId).toArray(),
  ])

  const setsByRow = new Map<string, SetEntry[]>()
  for (const set of sets) {
    const list = setsByRow.get(set.sessionExerciseId)
    if (list) list.push(set)
    else setsByRow.set(set.sessionExerciseId, [set])
  }
  for (const list of setsByRow.values()) {
    list.sort((a, b) => a.order - b.order)
  }

  return {
    session,
    exercises: rows.flatMap((row, index) => {
      const exercise = exercises[index]
      if (!exercise) return []
      return [{ row, exercise, sets: setsByRow.get(row.id) ?? [] }]
    }),
  }
}

export async function finishSession(sessionId: string, endedAt = Date.now()): Promise<void> {
  await db.transaction('rw', [db.sessions, db.sessionExercises, db.setEntries], async () => {
    // Tyhjät liikerivit siivotaan pois, jotta yhteenveto ja historia ovat siistit.
    const rows = await db.sessionExercises.where('sessionId').equals(sessionId).toArray()
    for (const row of rows) {
      const count = await db.setEntries.where('sessionExerciseId').equals(row.id).count()
      if (count === 0) await db.sessionExercises.delete(row.id)
    }
    await db.sessions.update(sessionId, { status: 'done', endedAt })
  })
}

export async function reopenSession(sessionId: string): Promise<void> {
  await db.sessions.update(sessionId, { status: 'active', endedAt: undefined })
}

export async function updateSession(
  sessionId: string,
  patch: Partial<Pick<Session, 'note' | 'dayName' | 'startedAt' | 'endedAt' | 'dateKey'>>,
): Promise<void> {
  await db.sessions.update(sessionId, patch)
}

export async function deleteSession(sessionId: string): Promise<void> {
  await db.transaction('rw', [db.sessions, db.sessionExercises, db.setEntries], async () => {
    await db.setEntries.where('sessionId').equals(sessionId).delete()
    await db.sessionExercises.where('sessionId').equals(sessionId).delete()
    await db.sessions.delete(sessionId)
  })
}

export async function addExerciseToSession(sessionId: string, exerciseId: string): Promise<string> {
  const rows = await db.sessionExercises.where('sessionId').equals(sessionId).toArray()
  const id = newId()
  await db.sessionExercises.add({
    id,
    sessionId,
    exerciseId,
    order: rows.length,
    note: '',
    skipped: false,
  })
  return id
}

export async function removeExerciseFromSession(sessionExerciseId: string): Promise<void> {
  await db.transaction('rw', [db.sessionExercises, db.setEntries], async () => {
    const row = await db.sessionExercises.get(sessionExerciseId)
    if (!row) return
    await db.setEntries.where('sessionExerciseId').equals(sessionExerciseId).delete()
    await db.sessionExercises.delete(sessionExerciseId)
    const remaining = await db.sessionExercises.where('sessionId').equals(row.sessionId).sortBy('order')
    await Promise.all(
      remaining.map((candidate, index) => db.sessionExercises.update(candidate.id, { order: index })),
    )
  })
}

export async function reorderSessionExercises(orderedIds: string[]): Promise<void> {
  await db.transaction('rw', db.sessionExercises, async () => {
    await Promise.all(
      orderedIds.map((id, index) => db.sessionExercises.update(id, { order: index })),
    )
  })
}

export async function updateSessionExercise(
  sessionExerciseId: string,
  patch: Partial<Pick<SessionExercise, 'note' | 'skipped'>>,
): Promise<void> {
  await db.sessionExercises.update(sessionExerciseId, patch)
}

export type NewSetEntry = Omit<SetEntry, 'id' | 'order' | 'completedAt' | 'sessionId'> &
  Partial<Pick<SetEntry, 'order' | 'completedAt'>>

/** Sarjan kuittaus. Tallentuu heti (autosave, SPEC §5). */
export async function logSet(input: NewSetEntry): Promise<SetEntry> {
  const row = await db.sessionExercises.get(input.sessionExerciseId)
  if (!row) throw new Error('Liikeriviä ei löytynyt')

  const existing = await db.setEntries.where('sessionExerciseId').equals(input.sessionExerciseId).count()
  const entry: SetEntry = {
    ...input,
    id: newId(),
    sessionId: row.sessionId,
    order: input.order ?? existing,
    completedAt: input.completedAt ?? Date.now(),
  }
  await db.setEntries.add(entry)
  return entry
}

export async function updateSet(
  setId: string,
  patch: Partial<Omit<SetEntry, 'id' | 'sessionId' | 'sessionExerciseId' | 'exerciseId'>>,
): Promise<void> {
  await db.setEntries.update(setId, patch)
}

export async function deleteSet(setId: string): Promise<void> {
  await db.transaction('rw', db.setEntries, async () => {
    const set = await db.setEntries.get(setId)
    if (!set) return
    await db.setEntries.delete(setId)
    const remaining = await db.setEntries
      .where('sessionExerciseId')
      .equals(set.sessionExerciseId)
      .sortBy('order')
    await Promise.all(remaining.map((row, index) => db.setEntries.update(row.id, { order: index })))
  })
}

/** Kumoa poisto: sarja palautetaan sellaisenaan. */
export async function restoreSet(set: SetEntry): Promise<void> {
  await db.setEntries.put(set)
}

export async function listRecentSessions(limit = 20): Promise<Session[]> {
  return db.sessions.orderBy('startedAt').reverse().filter((s) => s.status === 'done').limit(limit).toArray()
}

export async function listDoneSessions(): Promise<Session[]> {
  return db.sessions.orderBy('startedAt').reverse().filter((s) => s.status === 'done').toArray()
}

export async function countDoneSessions(): Promise<number> {
  return db.sessions.where('status').equals('done').count()
}

/** Viimeisin päätetty treeni, kierron laskentaan (SPEC §6.6). */
export async function getLastDoneSession(): Promise<Session | undefined> {
  return db.sessions.orderBy('startedAt').reverse().filter((s) => s.status === 'done').first()
}

/** Saman päivän edellinen kerta, yhteenvedon vertailuun (SPEC §6.5). */
export async function getPreviousSessionForDay(
  dayId: string,
  beforeStartedAt: Timestamp,
): Promise<Session | undefined> {
  return db.sessions
    .where('startedAt')
    .below(beforeStartedAt)
    .reverse()
    .filter((session) => session.dayId === dayId && session.status === 'done')
    .first()
}

/**
 * Liikkeen edellisen kerran sarjat ("Viimeksi 80 × 8 · 80 × 8", SPEC §6.3).
 * Käyttää compound-indeksiä [exerciseId+completedAt].
 */
export async function getPreviousSetsForExercise(
  exerciseId: string,
  excludeSessionId?: string,
): Promise<{ sessionId: string; completedAt: Timestamp; sets: SetEntry[] } | undefined> {
  const sets = await db.setEntries
    .where('[exerciseId+completedAt]')
    .between([exerciseId, -Infinity], [exerciseId, Infinity])
    .reverse()
    .filter((set) => set.sessionId !== excludeSessionId)
    .toArray()
  const latest = sets[0]
  if (!latest) return undefined

  const sessionSets = sets
    .filter((set) => set.sessionId === latest.sessionId)
    .sort((a, b) => a.order - b.order)
  return { sessionId: latest.sessionId, completedAt: latest.completedAt, sets: sessionSets }
}

/**
 * Aikajärjestys, jossa samalla millisekunnilla kirjatut sarjat pysyvät
 * järjestyksessään. Ilman toissijaista avainta indeksin palautusjärjestys
 * ratkeaisi satunnaisen id-loppuosan mukaan.
 */
function byTimeThenOrder(a: SetEntry, b: SetEntry): number {
  return a.completedAt - b.completedAt || a.order - b.order
}

/** Liikkeen koko historia aikajärjestyksessä, analyysin lähtödata. */
export async function listSetsForExercise(
  exerciseId: string,
  from?: Timestamp,
): Promise<SetEntry[]> {
  const sets = await db.setEntries
    .where('[exerciseId+completedAt]')
    .between([exerciseId, from ?? -Infinity], [exerciseId, Infinity])
    .toArray()
  return sets.sort(byTimeThenOrder)
}

/** Kaikki sarjat aikavälillä (yleiskatsaus, viikkosarjat). */
export async function listSetsBetween(from: Timestamp, to: Timestamp): Promise<SetEntry[]> {
  const sets = await db.setEntries.where('completedAt').between(from, to, true, true).toArray()
  return sets.sort(byTimeThenOrder)
}

export async function listAllSets(): Promise<SetEntry[]> {
  return db.setEntries.toArray()
}

export async function listSetsForSession(sessionId: string): Promise<SetEntry[]> {
  return (await db.setEntries.where('sessionId').equals(sessionId).toArray()).sort(
    (a, b) => a.order - b.order,
  )
}

/** Liikkeet, joista on kirjauksia – analyysin liikevalitsin. */
export async function listExerciseIdsWithHistory(): Promise<Set<string>> {
  const ids = new Set<string>()
  await db.setEntries.orderBy('exerciseId').eachUniqueKey((key) => {
    ids.add(String(key))
  })
  return ids
}
