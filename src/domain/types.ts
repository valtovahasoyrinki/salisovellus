/**
 * Sovelluksen domain-tyypit. Tämä tiedosto on lukittu sopimus (PLAN.md §2):
 * muutokset vaativat uuden Dexie-version ja migraatiotestin.
 *
 * Tunnisteet ovat ASCII-muotoisia (vienti/tuonti, indeksit), käyttöliittymän
 * suomenkieliset nimet löytyvät moduuleista `muscles.ts` ja `equipment.ts`.
 */

/** Epoch-millisekunnit. */
export type Timestamp = number;
/** Paikallinen päivä Helsingin aikavyöhykkeessä, "YYYY-MM-DD". */
export type DateKey = string;
/** ISO-viikko, "YYYY-Www" (esim. "2026-W41"). */
export type WeekKey = string;

export type MuscleId =
  | 'chest'
  | 'lats'
  | 'upper_back'
  | 'traps'
  | 'front_delts'
  | 'side_delts'
  | 'rear_delts'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'abs'
  | 'obliques'
  | 'lower_back'
  | 'glutes'
  | 'quads'
  | 'hamstrings'
  | 'calves'
  | 'adductors';

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'other';

/**
 * `weight_reps` – paino × toistot.
 * `bodyweight`  – kehonpaino, kirjattu paino on lisäpaino (avustetuissa negatiivinen).
 * `time`        – kesto sekunteina (esim. plank), painolla valinnainen lisäkuorma.
 */
export type ExerciseKind = 'weight_reps' | 'bodyweight' | 'time';

export interface RepRange {
  min: number;
  max: number;
}

export interface Exercise {
  id: string;
  name: string;
  primaryMuscles: MuscleId[];
  secondaryMuscles: MuscleId[];
  equipment: Equipment;
  kind: ExerciseKind;
  /** Painonlisäyksen askel kilogrammoina (−/+ -painikkeet, progressioehdotus). */
  increment: number;
  defaultRestSec: number;
  defaultRepRange: RepRange;
  notes: string;
  /** Viittaus `images`-tauluun, jos liikkeelle on oma kuva. */
  imageId?: string;
  archived: boolean;
  /** Käyttäjän itse luoma liike (ei kirjaston siemendataa). */
  isCustom: boolean;
  createdAt: Timestamp;
}

export interface Program {
  id: string;
  name: string;
  active: boolean;
  createdAt: Timestamp;
}

export interface WorkoutDay {
  id: string;
  programId: string;
  name: string;
  /** Kierron järjestys (0-pohjainen). */
  order: number;
  /** Tokenin nimi `src/styles/tokens.css`:stä, esim. "day-1". */
  color: string;
  icon: DayIcon;
}

export type DayIcon = 'push' | 'pull' | 'legs' | 'upper' | 'lower' | 'full' | 'arms' | 'core';

export interface DayExercise {
  id: string;
  dayId: string;
  exerciseId: string;
  order: number;
  targetSets: number;
  /** Ohittaa liikkeen oletustoistoalueen tässä päivässä. */
  repRange?: RepRange;
  /** Ohittaa liikkeen oletuslevon tässä päivässä. */
  restSec?: number;
}

export type SessionStatus = 'active' | 'done';

export interface Session {
  id: string;
  /** Ohjelman päivä, josta treeni alkoi. Tyhjä treeni: undefined. */
  dayId?: string;
  /** Päivän nimi kirjaushetkellä – historia on pyhä, nimen muutos ei muuta menneitä. */
  dayName: string;
  startedAt: Timestamp;
  endedAt?: Timestamp;
  note: string;
  status: SessionStatus;
  /** `startedAt` Helsingin aikavyöhykkeen päivänä, ryhmittelyä ja kalenteria varten. */
  dateKey: DateKey;
}

export interface SessionExercise {
  id: string;
  sessionId: string;
  exerciseId: string;
  order: number;
  note: string;
  skipped: boolean;
}

export interface SetEntry {
  id: string;
  sessionExerciseId: string;
  /** Denormalisoitu (PLAN.md §2): analyysikyselyt indeksillä [exerciseId+completedAt]. */
  sessionId: string;
  exerciseId: string;
  order: number;
  /** Kilogrammat. `bodyweight`-liikkeillä lisäpaino, voi olla negatiivinen. */
  weight: number;
  reps: number;
  /** Vain `time`-tyypin liikkeille. */
  durationSec?: number;
  warmup: boolean;
  /** Reps in reserve, valinnainen. */
  rir?: number;
  completedAt: Timestamp;
}

export interface ExerciseImage {
  id: string;
  blob: Blob;
}

export type ThemeMode = 'dark' | 'light' | 'system';

export interface Settings {
  /** Vakio 'app' – taulussa on aina täsmälleen yksi rivi. */
  id: 'app';
  weeklyTarget: number;
  /** Oletuspainonlisäykset välineen mukaan. */
  increments: Record<Equipment, number>;
  defaultRestSec: number;
  restSoundEnabled: boolean;
  restVibrationEnabled: boolean;
  theme: ThemeMode;
  /** Viikkosarjojen ohjealue lihasryhmälle (§6.8). */
  weeklySetsRange: RepRange;
  lastBackupAt?: Timestamp;
}

/** Kelluvan lepoajastimen pysyvä tila: loppuaikaleima, ei laskuri (§6.4). */
export interface RestTimerState {
  endsAt: Timestamp;
  totalSec: number;
  /** Mistä liikkeestä ajastin käynnistyi – näytetään kelluvassa elementissä. */
  exerciseName: string;
  sessionId: string;
}

export interface MetaRecord {
  key: string;
  value: unknown;
}

/** Ennätystyypit liikkeittäin (§6.6). */
export type RecordKind = 'heaviest' | 'best_e1rm' | 'most_reps_at_weight' | 'best_set_volume';
