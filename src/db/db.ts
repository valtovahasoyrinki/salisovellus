/**
 * Dexie-skeema ja versiointi (PLAN.md §2).
 *
 * Säännöt:
 * - Skeemamuutos = uusi `db.version(n).stores(...)` + tarvittaessa `.upgrade()`.
 *   Vanhoja versiolohkoja ei muokata jälkikäteen, muutoin olemassa oleva
 *   puhelin ei osaa päivittää dataansa.
 * - Tietokantaa kosketetaan vain tästä kansiosta (`src/db/repositories/*`).
 */
import Dexie, { type EntityTable } from 'dexie'
import type {
  DayExercise,
  Exercise,
  ExerciseImage,
  MetaRecord,
  Program,
  Session,
  SessionExercise,
  SetEntry,
  Settings,
} from '@/domain/types'

export const SCHEMA_VERSION = 2

export class SaliDatabase extends Dexie {
  exercises!: EntityTable<Exercise, 'id'>
  programs!: EntityTable<Program, 'id'>
  workoutDays!: EntityTable<import('@/domain/types').WorkoutDay, 'id'>
  dayExercises!: EntityTable<DayExercise, 'id'>
  sessions!: EntityTable<Session, 'id'>
  sessionExercises!: EntityTable<SessionExercise, 'id'>
  setEntries!: EntityTable<SetEntry, 'id'>
  images!: EntityTable<ExerciseImage, 'id'>
  settings!: EntityTable<Settings, 'id'>
  meta!: EntityTable<MetaRecord, 'key'>

  constructor(name = 'salisovellus') {
    super(name)

    this.version(1).stores({
      exercises: 'id, name, archived, equipment, kind, *primaryMuscles, *secondaryMuscles, createdAt',
      programs: 'id, active',
      workoutDays: 'id, programId, [programId+order]',
      dayExercises: 'id, dayId, [dayId+order], exerciseId',
      sessions: 'id, startedAt, status, dayId, dateKey',
      sessionExercises: 'id, sessionId, [sessionId+order], exerciseId',
      setEntries:
        'id, sessionExerciseId, sessionId, exerciseId, [exerciseId+completedAt], [sessionExerciseId+order], completedAt',
      images: 'id',
      settings: 'id',
      meta: 'key',
    })

    /*
      Versio 2 lisää `Exercise.aliases`-kentän (hakusanat). Taulut ja indeksit
      ovat täsmälleen samat kuin v1:ssä: aliaksia ei indeksoida, koska haku
      tehdään muistissa koko kirjastolle.

      `upgrade()`-kutsua ei tarvita, koska kenttä on valinnainen: puuttuva
      `aliases` tarkoittaa "ei aliaksia". Aliakset täytetään kirjastoliikkeille
      `syncExerciseLibrary()`-funktiossa, joka hoitaa myös uudet liikkeet ja
      nimitörmäykset. Versiolohko on silti pakollinen, koska tyyppisopimus
      muuttui (CLAUDE.md sääntö 5) ja `SCHEMA_VERSION` nousee varmuuskopioiden
      tunnistamista varten.
    */
    this.version(2).stores({
      exercises: 'id, name, archived, equipment, kind, *primaryMuscles, *secondaryMuscles, createdAt',
      programs: 'id, active',
      workoutDays: 'id, programId, [programId+order]',
      dayExercises: 'id, dayId, [dayId+order], exerciseId',
      sessions: 'id, startedAt, status, dayId, dateKey',
      sessionExercises: 'id, sessionId, [sessionId+order], exerciseId',
      setEntries:
        'id, sessionExerciseId, sessionId, exerciseId, [exerciseId+completedAt], [sessionExerciseId+order], completedAt',
      images: 'id',
      settings: 'id',
      meta: 'key',
    })
  }
}

export const db = new SaliDatabase()

/** Testit luovat oman eristetyn tietokannan. */
export function createTestDatabase(name: string): SaliDatabase {
  return new SaliDatabase(name)
}
