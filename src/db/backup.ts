/**
 * Varmuuskopio, vienti ja tuonti (SPEC §6.10).
 *
 * Data on vain puhelimessa, joten tämä on kriittinen osa sovellusta:
 * - vienti JSON:na (kaikki data + skeemaversio) ja CSV:nä (sarjat litteänä)
 * - tuonti validoidaan zodilla ja esikatsellaan ennen kirjoitusta
 * - tuonti osaa yhdistää (merge) tai korvata (replace) nykyisen datan
 */
import { z } from 'zod'
import { db, SCHEMA_VERSION } from '@/db/db'
import { DEFAULT_SETTINGS } from '@/db/repositories/settingsRepo'
import { setLastBackupAt } from '@/db/repositories/metaRepo'
import type { Settings, Timestamp } from '@/domain/types'
import { dateKeyOf, formatTime } from '@/lib/date'

export const BACKUP_APP_ID = 'salisovellus'

const repRange = z.object({ min: z.number(), max: z.number() })

const exerciseSchema = z.object({
  id: z.string(),
  name: z.string(),
  primaryMuscles: z.array(z.string()),
  secondaryMuscles: z.array(z.string()),
  equipment: z.string(),
  kind: z.string(),
  increment: z.number(),
  defaultRestSec: z.number(),
  defaultRepRange: repRange,
  notes: z.string(),
  imageId: z.string().optional(),
  archived: z.boolean(),
  isCustom: z.boolean(),
  createdAt: z.number(),
})

const programSchema = z.object({
  id: z.string(),
  name: z.string(),
  active: z.boolean(),
  createdAt: z.number(),
})

const workoutDaySchema = z.object({
  id: z.string(),
  programId: z.string(),
  name: z.string(),
  order: z.number(),
  color: z.string(),
  icon: z.string(),
})

const dayExerciseSchema = z.object({
  id: z.string(),
  dayId: z.string(),
  exerciseId: z.string(),
  order: z.number(),
  targetSets: z.number(),
  repRange: repRange.optional(),
  restSec: z.number().optional(),
})

const sessionSchema = z.object({
  id: z.string(),
  dayId: z.string().optional(),
  dayName: z.string(),
  startedAt: z.number(),
  endedAt: z.number().optional(),
  note: z.string(),
  status: z.enum(['active', 'done']),
  dateKey: z.string(),
})

const sessionExerciseSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  exerciseId: z.string(),
  order: z.number(),
  note: z.string(),
  skipped: z.boolean(),
})

const setEntrySchema = z.object({
  id: z.string(),
  sessionExerciseId: z.string(),
  sessionId: z.string(),
  exerciseId: z.string(),
  order: z.number(),
  weight: z.number(),
  reps: z.number(),
  durationSec: z.number().optional(),
  warmup: z.boolean(),
  rir: z.number().optional(),
  completedAt: z.number(),
})

const imageSchema = z.object({
  id: z.string(),
  /** data:-URL, koska JSON ei kanna binääriä. */
  dataUrl: z.string(),
})

const settingsSchema = z
  .object({
    id: z.literal('app'),
    weeklyTarget: z.number(),
    increments: z.record(z.string(), z.number()),
    defaultRestSec: z.number(),
    restSoundEnabled: z.boolean(),
    restVibrationEnabled: z.boolean(),
    theme: z.enum(['dark', 'light', 'system']),
    weeklySetsRange: repRange,
    lastBackupAt: z.number().optional(),
  })
  .partial()
  .extend({ id: z.literal('app') })

export const backupSchema = z.object({
  app: z.literal(BACKUP_APP_ID),
  schemaVersion: z.number(),
  exportedAt: z.number(),
  data: z.object({
    exercises: z.array(exerciseSchema),
    programs: z.array(programSchema),
    workoutDays: z.array(workoutDaySchema),
    dayExercises: z.array(dayExerciseSchema),
    sessions: z.array(sessionSchema),
    sessionExercises: z.array(sessionExerciseSchema),
    setEntries: z.array(setEntrySchema),
    images: z.array(imageSchema).default([]),
    settings: settingsSchema.optional(),
  }),
})

export type BackupFile = z.infer<typeof backupSchema>

/* --- Vienti ---------------------------------------------------------------- */

/** Viety testattavaksi: JSON ei kanna binääriä, joten kuva koodataan data-URLiksi. */
export async function blobToDataUrl(blob: Blob): Promise<string> {
  const buffer = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  for (const byte of buffer) binary += String.fromCharCode(byte)
  return `data:${blob.type || 'image/jpeg'};base64,${btoa(binary)}`
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, payload] = dataUrl.split(',')
  const type = header?.match(/data:([^;]+)/)?.[1] ?? 'image/jpeg'
  const binary = atob(payload ?? '')
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type })
}

export interface ExportOptions {
  includeImages?: boolean
}

export async function createBackup(options: ExportOptions = {}): Promise<BackupFile> {
  const includeImages = options.includeImages ?? true
  const [
    exercises,
    programs,
    workoutDays,
    dayExercises,
    sessions,
    sessionExercises,
    setEntries,
    images,
    settings,
  ] = await Promise.all([
    db.exercises.toArray(),
    db.programs.toArray(),
    db.workoutDays.toArray(),
    db.dayExercises.toArray(),
    db.sessions.toArray(),
    db.sessionExercises.toArray(),
    db.setEntries.toArray(),
    includeImages ? db.images.toArray() : Promise.resolve([]),
    db.settings.get('app'),
  ])

  return {
    app: BACKUP_APP_ID,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: Date.now(),
    data: {
      exercises,
      programs,
      workoutDays,
      dayExercises,
      sessions,
      sessionExercises,
      setEntries,
      images: await Promise.all(
        images.map(async (image) => ({ id: image.id, dataUrl: await blobToDataUrl(image.blob) })),
      ),
      settings: settings ?? DEFAULT_SETTINGS,
    },
  } as BackupFile
}

export function backupFileName(exportedAt: Timestamp = Date.now()): string {
  return `salisovellus-${dateKeyOf(exportedAt)}-${formatTime(exportedAt).replace(':', '')}.json`
}

/** CSV: sarjat litteänä taulukkona (SPEC §6.10). Erotin on puolipiste, fi-FI. */
export async function createSetsCsv(): Promise<string> {
  const [sets, sessions, exercises] = await Promise.all([
    db.setEntries.orderBy('completedAt').toArray(),
    db.sessions.toArray(),
    db.exercises.toArray(),
  ])
  const sessionById = new Map(sessions.map((session) => [session.id, session]))
  const exerciseById = new Map(exercises.map((exercise) => [exercise.id, exercise]))

  const header = [
    'paivamaara',
    'aika',
    'treenipaiva',
    'liike',
    'valine',
    'sarja',
    'paino_kg',
    'toistot',
    'kesto_s',
    'lammittely',
    'rir',
  ].join(';')

  const rows = sets.map((set) => {
    const session = sessionById.get(set.sessionId)
    const exercise = exerciseById.get(set.exerciseId)
    return [
      dateKeyOf(set.completedAt),
      formatTime(set.completedAt),
      session?.dayName ?? '',
      exercise?.name ?? '',
      exercise?.equipment ?? '',
      String(set.order + 1),
      String(set.weight).replace('.', ','),
      String(set.reps),
      set.durationSec === undefined ? '' : String(set.durationSec),
      set.warmup ? 'kyllä' : 'ei',
      set.rir === undefined ? '' : String(set.rir),
    ]
      .map((value) => (value.includes(';') ? `"${value}"` : value))
      .join(';')
  })

  return [header, ...rows].join('\n')
}

/* --- Tuonti ---------------------------------------------------------------- */

export interface ImportPreview {
  valid: true
  file: BackupFile
  exportedAt: Timestamp
  schemaVersion: number
  counts: {
    sessions: number
    exercises: number
    sets: number
    programs: number
    images: number
  }
}

export interface ImportError {
  valid: false
  message: string
}

/** Validoi ja esikatsele tuontitiedosto ennen kirjoitusta (SPEC §6.10). */
export function parseBackup(raw: unknown): ImportPreview | ImportError {
  const parsed = backupSchema.safeParse(raw)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return {
      valid: false,
      message: issue
        ? `Tiedosto ei ole kelvollinen varmuuskopio: ${issue.path.join('.') || 'juuri'} – ${issue.message}`
        : 'Tiedosto ei ole kelvollinen varmuuskopio.',
    }
  }
  const file = parsed.data
  if (file.schemaVersion > SCHEMA_VERSION) {
    return {
      valid: false,
      message: `Varmuuskopio on uudemmasta versiosta (${file.schemaVersion} > ${SCHEMA_VERSION}). Päivitä sovellus ensin.`,
    }
  }
  return {
    valid: true,
    file,
    exportedAt: file.exportedAt,
    schemaVersion: file.schemaVersion,
    counts: {
      sessions: file.data.sessions.length,
      exercises: file.data.exercises.length,
      sets: file.data.setEntries.length,
      programs: file.data.programs.length,
      images: file.data.images.length,
    },
  }
}

export type ImportMode = 'merge' | 'replace'

export interface ImportResult {
  added: number
  skipped: number
}

/**
 * Kirjoittaa varmuuskopion tietokantaan.
 * `merge` säilyttää nykyisen datan ja ohittaa rivit, joiden id on jo olemassa.
 * `replace` tyhjentää taulut ensin.
 */
export async function restoreBackup(file: BackupFile, mode: ImportMode): Promise<ImportResult> {
  const tables = [
    db.exercises,
    db.programs,
    db.workoutDays,
    db.dayExercises,
    db.sessions,
    db.sessionExercises,
    db.setEntries,
    db.images,
    db.settings,
    db.meta,
  ]

  let added = 0
  let skipped = 0

  await db.transaction('rw', tables, async () => {
    if (mode === 'replace') {
      await Promise.all([
        db.exercises.clear(),
        db.programs.clear(),
        db.workoutDays.clear(),
        db.dayExercises.clear(),
        db.sessions.clear(),
        db.sessionExercises.clear(),
        db.setEntries.clear(),
        db.images.clear(),
      ])
    }

    /*
      Rivit on jo validoitu zodilla, joten kirjoitus voi olla taulukohtaisesti
      yleinen. `put: (row: never)` sallii minkä tahansa Dexie-taulun tähän
      ilman `any`-tyyppiä.
    */
    const writeRows = async (
      table: {
        get: (id: string) => PromiseLike<unknown>
        put: (row: never) => PromiseLike<unknown>
      },
      rows: Array<{ id: string }>,
    ): Promise<void> => {
      for (const row of rows) {
        if (mode === 'merge' && (await table.get(row.id)) !== undefined) {
          skipped += 1
          continue
        }
        await table.put(row as never)
        added += 1
      }
    }

    await writeRows(db.exercises, file.data.exercises)
    await writeRows(db.programs, file.data.programs)
    await writeRows(db.workoutDays, file.data.workoutDays)
    await writeRows(db.dayExercises, file.data.dayExercises)
    await writeRows(db.sessions, file.data.sessions)
    await writeRows(db.sessionExercises, file.data.sessionExercises)
    await writeRows(db.setEntries, file.data.setEntries)
    await writeRows(
      db.images,
      file.data.images.map((image) => ({ id: image.id, blob: dataUrlToBlob(image.dataUrl) })),
    )

    if (file.data.settings) {
      const current = (await db.settings.get('app')) ?? DEFAULT_SETTINGS
      const merged: Settings = { ...current, ...(file.data.settings as Partial<Settings>), id: 'app' }
      await db.settings.put(merged)
    }
  })

  await setLastBackupAt(file.exportedAt)
  return { added, skipped }
}

/** Poistaa kaiken datan (asetukset mukaan lukien) – kaksoisvahvistus kutsujalla. */
export async function deleteAllData(): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((table) => table.clear()))
  })
}
