/**
 * Suorituskykytestin data (SPEC §8): 3 vuotta, ~600 treeniä, ~15 000 sarjaa.
 *
 * Tuottaa varmuuskopiomuotoisen JSON-tiedoston, joka tuodaan sovellukseen
 * Asetukset → Varmuuskopio → Tuo. Tiedosto ei mene versionhallintaan.
 *
 * Aja: node scripts/generate-test-data.mjs [tiedosto]
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

const OUT = process.argv[2] ?? 'testdata/salisovellus-testidata.json'
const YEARS = 3
const SESSIONS_PER_WEEK = 4
const DAY_MS = 86_400_000

let counter = 0
const id = (prefix) => `${prefix}${(counter += 1).toString(36).padStart(6, '0')}`

/** Päiväavain Helsingin aikavyöhykkeessä. */
const dateKeyOf = (ts) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Helsinki',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(ts)
  return parts
}

const EXERCISES = [
  { name: 'Penkkipunnerrus', day: 'Push', primary: ['chest'], secondary: ['triceps', 'front_delts'], equipment: 'barbell', start: 70, inc: 2.5, sets: 4, reps: [6, 10] },
  { name: 'Pystypunnerrus', day: 'Push', primary: ['front_delts'], secondary: ['triceps'], equipment: 'barbell', start: 40, inc: 2.5, sets: 3, reps: [6, 10] },
  { name: 'Vinopenkkipunnerrus käsipainoilla', day: 'Push', primary: ['chest'], secondary: ['front_delts'], equipment: 'dumbbell', start: 22, inc: 2, sets: 3, reps: [8, 12] },
  { name: 'Sivunostot', day: 'Push', primary: ['side_delts'], secondary: [], equipment: 'dumbbell', start: 10, inc: 1.25, sets: 3, reps: [12, 15] },
  { name: 'Ojentajapunnerrus taljassa', day: 'Push', primary: ['triceps'], secondary: [], equipment: 'cable', start: 25, inc: 2.5, sets: 4, reps: [10, 14] },
  { name: 'Dipit', day: 'Push', primary: ['chest'], secondary: ['triceps'], equipment: 'bodyweight', kind: 'bodyweight', start: 0, inc: 2.5, sets: 3, reps: [8, 12] },
  { name: 'Penkkipunnerrus laitteessa', day: 'Push', primary: ['chest'], secondary: ['front_delts'], equipment: 'machine', start: 55, inc: 5, sets: 3, reps: [10, 14] },
  { name: 'Kulmasoutu', day: 'Pull', primary: ['upper_back'], secondary: ['lats', 'biceps'], equipment: 'barbell', start: 60, inc: 2.5, sets: 4, reps: [6, 10] },
  { name: 'Ylätalja', day: 'Pull', primary: ['lats'], secondary: ['biceps'], equipment: 'cable', start: 50, inc: 2.5, sets: 3, reps: [8, 12] },
  { name: 'Istuva alatalja', day: 'Pull', primary: ['upper_back'], secondary: ['biceps'], equipment: 'cable', start: 45, inc: 2.5, sets: 3, reps: [10, 12] },
  { name: 'Hammerkääntö', day: 'Pull', primary: ['biceps'], secondary: ['forearms'], equipment: 'dumbbell', start: 14, inc: 1.25, sets: 3, reps: [10, 14] },
  { name: 'Takaolkapäälennot', day: 'Pull', primary: ['rear_delts'], secondary: [], equipment: 'dumbbell', start: 8, inc: 1.25, sets: 4, reps: [12, 15] },
  { name: 'Leuanveto', day: 'Pull', primary: ['lats'], secondary: ['biceps'], equipment: 'bodyweight', kind: 'bodyweight', start: 0, inc: 2.5, sets: 4, reps: [6, 10] },
  { name: 'Maastaveto', day: 'Pull', primary: ['lower_back'], secondary: ['glutes', 'hamstrings', 'traps'], equipment: 'barbell', start: 100, inc: 5, sets: 3, reps: [4, 6] },
  { name: 'Takakyykky', day: 'Legs', primary: ['quads'], secondary: ['glutes', 'lower_back'], equipment: 'barbell', start: 85, inc: 2.5, sets: 4, reps: [5, 8] },
  { name: 'Romanialainen maastaveto', day: 'Legs', primary: ['hamstrings'], secondary: ['glutes', 'lower_back'], equipment: 'barbell', start: 75, inc: 2.5, sets: 3, reps: [8, 10] },
  { name: 'Jalkaprässi', day: 'Legs', primary: ['quads'], secondary: ['glutes'], equipment: 'machine', start: 120, inc: 5, sets: 3, reps: [10, 14] },
  { name: 'Pohjenousu', day: 'Legs', primary: ['calves'], secondary: [], equipment: 'machine', start: 60, inc: 2.5, sets: 4, reps: [12, 18] },
  { name: 'Vatsarutistus taljassa', day: 'Legs', primary: ['abs'], secondary: ['obliques'], equipment: 'cable', start: 30, inc: 2.5, sets: 3, reps: [12, 16] },
  { name: 'Askelkyykky käsipainoilla', day: 'Legs', primary: ['quads'], secondary: ['glutes'], equipment: 'dumbbell', start: 18, inc: 2, sets: 3, reps: [10, 12] },
  { name: 'Jalkojen ojennus', day: 'Legs', primary: ['quads'], secondary: [], equipment: 'machine', start: 45, inc: 5, sets: 4, reps: [12, 15] },
  { name: 'Lankku', day: 'Legs', primary: ['abs'], secondary: ['obliques'], equipment: 'bodyweight', kind: 'time', start: 0, inc: 1.25, sets: 3, reps: [1, 1] },
]

const DAYS = ['Push', 'Pull', 'Legs']

const programId = id('p')
const program = { id: programId, name: 'Ohjelma', active: true, createdAt: Date.now() - YEARS * 365 * DAY_MS }

const workoutDays = DAYS.map((name, index) => ({
  id: id('d'),
  programId,
  name,
  order: index,
  color: `day-${index + 1}`,
  icon: name.toLowerCase(),
}))

const exercises = EXERCISES.map((template) => ({
  id: id('e'),
  name: template.name,
  primaryMuscles: template.primary,
  secondaryMuscles: template.secondary,
  equipment: template.equipment,
  kind: template.kind ?? 'weight_reps',
  increment: template.inc,
  defaultRestSec: template.sets >= 4 ? 180 : 120,
  defaultRepRange: { min: template.reps[0], max: template.reps[1] },
  notes: '',
  archived: false,
  isCustom: false,
  createdAt: program.createdAt,
  template,
}))

const dayExercises = []
for (const day of workoutDays) {
  let order = 0
  for (const exercise of exercises) {
    if (exercise.template.day !== day.name) continue
    dayExercises.push({
      id: id('de'),
      dayId: day.id,
      exerciseId: exercise.id,
      order: order += 1,
      targetSets: exercise.template.sets,
      repRange: exercise.defaultRepRange,
    })
  }
}

const sessions = []
const sessionExercises = []
const setEntries = []

const totalSessions = Math.round(YEARS * 52 * SESSIONS_PER_WEEK)
const start = Date.now() - YEARS * 365 * DAY_MS
// Kehitys: paino nousee hitaasti ja epätasaisesti, kuten oikeassa treenissä.
const progress = new Map(exercises.map((exercise) => [exercise.id, exercise.template.start]))

for (let index = 0; index < totalSessions; index += 1) {
  const day = workoutDays[index % workoutDays.length]
  const startedAt = start + Math.round((index / SESSIONS_PER_WEEK) * 7 * DAY_MS) + 17 * 3_600_000
  const sessionId = id('s')
  const durationMin = 55 + (index % 7) * 3

  sessions.push({
    id: sessionId,
    dayId: day.id,
    dayName: day.name,
    startedAt,
    endedAt: startedAt + durationMin * 60_000,
    note: '',
    status: 'done',
    dateKey: dateKeyOf(startedAt),
  })

  let order = 0
  for (const exercise of exercises) {
    if (exercise.template.day !== day.name) continue
    const sessionExerciseId = id('se')
    sessionExercises.push({
      id: sessionExerciseId,
      sessionId,
      exerciseId: exercise.id,
      order: order += 1,
      note: '',
      skipped: false,
    })

    const base = progress.get(exercise.id)
    const [minReps, maxReps] = exercise.template.reps
    const setCount = exercise.template.sets

    // Lämmittelysarja raskaissa liikkeissä.
    if (exercise.template.sets >= 4) {
      setEntries.push({
        id: id('x'),
        sessionExerciseId,
        sessionId,
        exerciseId: exercise.id,
        order: 0,
        weight: Math.round(base * 0.5 * 2) / 2,
        reps: 10,
        warmup: true,
        completedAt: startedAt + 60_000 * (order * 6),
      })
    }

    let reachedTop = true
    for (let setIndex = 0; setIndex < setCount; setIndex += 1) {
      const fatigue = Math.floor(setIndex / 2)
      const reps = Math.max(minReps - 1, maxReps - fatigue - ((index + setIndex) % 2))
      if (reps < maxReps) reachedTop = false
      const isTime = exercise.kind === 'time'
      setEntries.push({
        id: id('x'),
        sessionExerciseId,
        sessionId,
        exerciseId: exercise.id,
        order: setIndex + (exercise.template.sets >= 4 ? 1 : 0),
        weight: base,
        reps: isTime ? 1 : reps,
        ...(isTime ? { durationSec: 45 + setIndex * 5 + (index % 20) } : {}),
        warmup: false,
        rir: setIndex === setCount - 1 ? 0 : 2,
        completedAt: startedAt + 60_000 * (order * 6 + setIndex + 1),
      })
    }

    // Kaksoisprogressio: paino nousee, kun kaikki sarjat osuivat ylärajaan.
    if (reachedTop) progress.set(exercise.id, base + exercise.template.inc)
  }
}

const backup = {
  app: 'salisovellus',
  schemaVersion: 1,
  exportedAt: Date.now(),
  data: {
    exercises: exercises.map(({ template: _template, ...rest }) => rest),
    programs: [program],
    workoutDays,
    dayExercises,
    sessions,
    sessionExercises,
    setEntries,
    images: [],
    settings: {
      id: 'app',
      weeklyTarget: 4,
      increments: { barbell: 2.5, dumbbell: 1.25, machine: 2.5, cable: 2.5, bodyweight: 1.25, other: 2.5 },
      defaultRestSec: 150,
      restSoundEnabled: true,
      restVibrationEnabled: true,
      theme: 'dark',
      weeklySetsRange: { min: 10, max: 20 },
    },
  },
}

await mkdir(dirname(OUT), { recursive: true })
await writeFile(OUT, JSON.stringify(backup))
console.log(
  `${OUT}: ${sessions.length} treeniä, ${setEntries.length} sarjaa, ${exercises.length} liikettä`,
)
