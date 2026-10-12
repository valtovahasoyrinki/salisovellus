import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db/db'
import {
  blobToDataUrl,
  createBackup,
  createSetsCsv,
  dataUrlToBlob,
  deleteAllData,
  parseBackup,
  restoreBackup,
} from '@/db/backup'
import { createExercise } from '@/db/repositories/exerciseRepo'
import { getLibraryVersion } from '@/db/repositories/metaRepo'
import { EXERCISE_LIBRARY, LIBRARY_VERSION } from '@/db/seed/exercises'
import { syncExerciseLibrary } from '@/db/seed/seedLibrary'
import { addExerciseToDay, ensureProgram, listDays } from '@/db/repositories/programRepo'
import {
  finishSession,
  getSessionDetail,
  logSet,
  startSessionFromDay,
} from '@/db/repositories/sessionRepo'
import { updateSettings } from '@/db/repositories/settingsRepo'

async function buildSampleData(): Promise<{ exerciseId: string; sessionId: string }> {
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
  const sessionId = await startSessionFromDay(push!.id)
  const row = (await getSessionDetail(sessionId))!.exercises[0]!.row
  await logSet({ sessionExerciseId: row.id, exerciseId, weight: 60, reps: 10, warmup: true })
  await logSet({ sessionExerciseId: row.id, exerciseId, weight: 82.5, reps: 8, warmup: false })
  await finishSession(sessionId)
  await updateSettings({ weeklyTarget: 5 })
  return { exerciseId, sessionId }
}

beforeEach(async () => {
  await db.open()
  await Promise.all(db.tables.map((table) => table.clear()))
})

describe('vienti ja tuonti', () => {
  it('vienti ja tuonti säilyttävät datan identtisenä', async () => {
    await buildSampleData()
    const backup = await createBackup()
    const before = {
      exercises: await db.exercises.toArray(),
      sessions: await db.sessions.toArray(),
      sets: await db.setEntries.toArray(),
      days: await db.workoutDays.toArray(),
    }

    await deleteAllData()
    expect(await db.setEntries.count()).toBe(0)

    const preview = parseBackup(JSON.parse(JSON.stringify(backup)))
    expect(preview.valid).toBe(true)
    if (!preview.valid) return
    expect(preview.counts).toMatchObject({ sessions: 1, sets: 2, exercises: 1 })

    await restoreBackup(preview.file, 'replace')
    /*
      Tuonnin jälkeen ajetaan kirjaston synkronointi, joten liiketaulussa on
      tiedoston rivit sellaisinaan ja niiden lisäksi tämän version
      kirjastoliikkeet.
    */
    for (const exercise of before.exercises) {
      expect(await db.exercises.get(exercise.id)).toEqual(exercise)
    }
    expect(await db.sessions.toArray()).toEqual(before.sessions)
    expect(await db.setEntries.toArray()).toEqual(before.sets)
    expect(await db.workoutDays.toArray()).toEqual(before.days)
    expect((await db.settings.get('app'))?.weeklyTarget).toBe(5)
  })

  it('yhdistäminen ei ylikirjoita olemassa olevia rivejä', async () => {
    await buildSampleData()
    const backup = await createBackup()

    const result = await restoreBackup(backup, 'merge')
    expect(result.added).toBe(0)
    expect(result.skipped).toBeGreaterThan(0)
    expect(await db.setEntries.count()).toBe(2)
  })

  it('korvaava tuonti poistaa nykyisen datan', async () => {
    await buildSampleData()
    const backup = await createBackup()
    const extraId = await createExercise({
      name: 'Ylimääräinen liike',
      primaryMuscles: ['biceps'],
      secondaryMuscles: [],
      equipment: 'dumbbell',
      kind: 'weight_reps',
      increment: 1.25,
      defaultRestSec: 90,
      defaultRepRange: { min: 8, max: 12 },
      notes: '',
    })

    await restoreBackup(backup, 'replace')
    expect(await db.exercises.get(extraId)).toBeUndefined()
  })

  /*
    Kuvan tallennus IndexedDB:hen testataan selaimessa E2E-polulla: fake-indexeddb
    ei osaa kloonata Blobia, joten yksikkötestissä varmistetaan koodauksen
    kierto, joka on se osa, jossa tieto voisi kadota.
  */
  it('kuva koodataan data-URLiksi ja takaisin ilman tavujen muuttumista', async () => {
    const bytes = new Uint8Array([1, 2, 3, 250, 255])
    const dataUrl = await blobToDataUrl(new Blob([bytes], { type: 'image/jpeg' }))
    expect(dataUrl.startsWith('data:image/jpeg;base64,')).toBe(true)

    const restored = dataUrlToBlob(dataUrl)
    expect(restored.type).toBe('image/jpeg')
    expect(new Uint8Array(await restored.arrayBuffer())).toEqual(bytes)
  })
})

describe('tuonnin validointi', () => {
  it('hylkää tiedoston, joka ei ole varmuuskopio', () => {
    const result = parseBackup({ jotain: 'muuta' })
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.message).toContain('kelvollinen varmuuskopio')
  })

  it('hylkää uudemman skeemaversion', () => {
    const result = parseBackup({
      app: 'salisovellus',
      schemaVersion: 99,
      exportedAt: Date.now(),
      data: {
        exercises: [],
        programs: [],
        workoutDays: [],
        dayExercises: [],
        sessions: [],
        sessionExercises: [],
        setEntries: [],
        images: [],
      },
    })
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.message).toContain('uudemmasta versiosta')
  })
})

/** 1.0-aikainen varmuuskopio: skeemaversio 1 eikä `aliases`-kenttää. */
function legacyBackup(exercises: Array<Record<string, unknown>>): unknown {
  return {
    app: 'salisovellus',
    schemaVersion: 1,
    exportedAt: 1_700_000_000_000,
    data: {
      exercises,
      programs: [],
      workoutDays: [],
      dayExercises: [],
      sessions: [],
      sessionExercises: [],
      setEntries: [],
      images: [],
    },
  }
}

function legacyExercise(id: string, name: string, isCustom: boolean): Record<string, unknown> {
  return {
    id,
    name,
    primaryMuscles: ['chest'],
    secondaryMuscles: ['triceps'],
    equipment: 'barbell',
    kind: 'weight_reps',
    increment: 2.5,
    defaultRestSec: 180,
    defaultRepRange: { min: 6, max: 10 },
    notes: '',
    archived: false,
    isCustom,
    createdAt: 1_700_000_000_000,
  }
}

describe('varmuuskopio ja liikkeiden aliakset', () => {
  it('vienti ja tuonti säilyttävät aliakset identtisinä', async () => {
    const aliases = ['pec deck', 'butterfly']
    const id = await createExercise({
      name: 'Vipunosto rintaliikelaitteessa',
      primaryMuscles: ['chest'],
      secondaryMuscles: ['front_delts'],
      equipment: 'machine',
      kind: 'weight_reps',
      increment: 2.5,
      defaultRestSec: 90,
      defaultRepRange: { min: 10, max: 15 },
      notes: '',
      aliases,
    })

    const backup = await createBackup()
    expect(backup.data.exercises.find((row) => row.id === id)?.aliases).toEqual(aliases)

    const preview = parseBackup(JSON.parse(JSON.stringify(backup)))
    expect(preview.valid).toBe(true)
    if (!preview.valid) return

    await deleteAllData()
    await restoreBackup(preview.file, 'replace')
    expect((await db.exercises.get(id))?.aliases).toEqual(aliases)
  })

  it('rajatapaus: vanha varmuuskopio ilman aliases-kenttää tuodaan virheettä', async () => {
    const preview = parseBackup(legacyBackup([legacyExercise('x1', 'Oma liike', true)]))
    expect(preview.valid).toBe(true)
    if (!preview.valid) return

    await restoreBackup(preview.file, 'replace')
    const row = await db.exercises.get('x1')
    expect(row).toMatchObject({ id: 'x1', name: 'Oma liike', isCustom: true, archived: false })
    expect(row?.aliases).toBeUndefined()
  })

  it('korvaava tuonti vanhasta kopiosta tuo v2-liikkeet ja aliakset', async () => {
    // Laite on jo versiossa 2, mutta liiketaulu tulee kokonaan tiedostosta.
    await syncExerciseLibrary()
    const preview = parseBackup(legacyBackup([legacyExercise('x1', 'Penkkipunnerrus', false)]))
    expect(preview.valid).toBe(true)
    if (!preview.valid) return

    await restoreBackup(preview.file, 'replace')

    expect((await db.exercises.get('x1'))?.aliases).toEqual(['bench', 'bench press', 'penkki'])
    expect(await db.exercises.where('name').equals('Sumomaastaveto').count()).toBe(1)
    expect(await getLibraryVersion()).toBe(LIBRARY_VERSION)

    const v2Count = EXERCISE_LIBRARY.filter((entry) => entry.since === 2).length
    expect(await db.exercises.count()).toBe(1 + v2Count)
  })
})

describe('CSV-vienti', () => {
  it('kirjoittaa sarjat litteänä taulukkona desimaalipilkulla', async () => {
    await buildSampleData()
    const csv = await createSetsCsv()
    const lines = csv.split('\n')
    expect(lines[0]).toContain('paino_kg')
    expect(lines).toHaveLength(3)
    // Rivien järjestys seuraa kirjausaikaa; molemmat sarjat ovat mukana.
    expect(csv).toContain('82,5')
    expect(csv).toContain('kyllä')
    expect(csv).toContain('Penkkipunnerrus')
  })
})
