import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { AnimatePresence, motion } from 'motion/react'
import { syncExerciseLibrary } from '@/db/seed/seedLibrary'
import {
  addExerciseToDay,
  createDay,
  deleteDay,
  ensureProgram,
  getActiveProgram,
  listDayExercisesWithExercise,
  listDays,
  removeDayExercise,
  updateDay,
} from '@/db/repositories/programRepo'
import { setOnboardingDone } from '@/db/repositories/metaRepo'
import type { Exercise, WorkoutDay } from '@/domain/types'
import { Button, IconButton } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Sheet } from '@/components/ui/Sheet'
import { TextField } from '@/components/ui/TextField'
import { CheckIcon, DumbbellIcon, PlusIcon, TrashIcon, dayIcon } from '@/components/icons'
import { ExercisePickerSheet } from '@/features/exercises/ExercisePickerSheet'

type Step = 0 | 1 | 2

const STEP_COUNT = 3

/**
 * Kirjasto ja ohjelma luodaan heti, kun käyttäjä siirtyy ensimmäisestä
 * ruudusta eteenpäin – myös silloin kun hän ohittaa loput.
 */
async function prepare(): Promise<void> {
  await syncExerciseLibrary()
  await ensureProgram()
}

export default function OnboardingScreen() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>(0)

  /*
    useLiveQuery ajaa kyselyn lukutransaktiossa, joten täällä ei saa kirjoittaa.
    Ohjelman ja kirjaston luonti tapahtuu `prepare`-funktiossa painalluksen
    yhteydessä, ja tämä kysely vain lukee tuloksen.
  */
  const days = useLiveQuery(
    async () => {
      const program = await getActiveProgram()
      return program ? listDays(program.id) : []
    },
    [],
    undefined,
  )

  const finish = async (): Promise<void> => {
    await prepare()
    await setOnboardingDone(true)
    void navigate('/', { replace: true })
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="safe-top px-5 pt-6">
        <ProgressBar progress={(step + 1) / STEP_COUNT} label={`Vaihe ${step + 1} / ${STEP_COUNT}`} />
      </header>

      <main className="flex-1 overflow-y-auto px-5 pt-6 pb-28">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ type: 'spring', stiffness: 420, damping: 36 }}
          >
            {step === 0 ? <WelcomeStep /> : null}
            {step === 1 ? <DaysStep days={days ?? []} /> : null}
            {step === 2 ? <ExercisesStep days={days ?? []} /> : null}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="safe-bottom fixed inset-x-0 bottom-0 border-t border-border bg-bg/95 px-5 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg gap-2">
          <Button variant="ghost" onClick={() => void finish()}>
            Ohita
          </Button>
          {step > 0 ? (
            <Button variant="secondary" onClick={() => setStep((step - 1) as Step)}>
              Takaisin
            </Button>
          ) : null}
          <Button
            variant="primary"
            fullWidth
            onClick={() => {
              if (step === 2) {
                void finish()
                return
              }
              void prepare().then(() => setStep((step + 1) as Step))
            }}
          >
            {step === 0 ? 'Aloita' : step === 1 ? 'Valitse liikkeet' : 'Valmis'}
          </Button>
        </div>
      </footer>
    </div>
  )
}

function WelcomeStep() {
  return (
    <div className="space-y-5">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-accent text-accent-ink">
        <DumbbellIcon size={28} />
      </span>
      <h1 className="text-2xl font-semibold tracking-tight">Salisovellus</h1>
      <p className="text-[0.9375rem] leading-relaxed text-muted">
        Kirjaat sarjat salilla sekunneissa, sovellus laskee kehityksen. Data pysyy puhelimessa,
        toimii ilman verkkoa eikä vaadi tiliä.
      </p>
      <ul className="space-y-2 text-sm text-muted">
        {[
          'Ohjelma, jota muokkaat itse – treenipäivät kiertävät järjestyksessä.',
          'Sarjarivit esitäytetään edellisen kerran ja progressioehdotuksen mukaan.',
          'Analyysi näyttää e1RM-käyrät, ennätykset ja sen, missä junnaat.',
        ].map((line) => (
          <li key={line} className="flex gap-2">
            <CheckIcon size={18} className="mt-0.5 shrink-0 text-good" />
            {line}
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted">
        Käyttöönotossa luodaan liikekirjasto ja kolme treenipäivää: Push, Pull ja Legs. Kaikkea voi
        muuttaa myöhemmin.
      </p>
    </div>
  )
}

function DaysStep({ days }: { days: WorkoutDay[] }) {
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Treenipäivät</h1>
        <p className="mt-1 text-sm text-muted">
          Nimeä päivät haluamallasi tavalla. Kierto kulkee ylhäältä alas ja alkaa taas alusta.
        </p>
      </div>

      <ul className="space-y-2">
        {days.map((day, index) => {
          const Icon = dayIcon(day.icon)
          return (
            <li key={day.id}>
              <Card className="flex items-center gap-3 p-3">
                <span
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `var(--${day.color})`, color: 'var(--accent-ink)' }}
                >
                  <Icon size={20} />
                </span>
                <input
                  className="min-w-0 flex-1 bg-transparent text-[0.9375rem] font-medium outline-none"
                  value={day.name}
                  aria-label={`Treenipäivän ${index + 1} nimi`}
                  onChange={(event) => void updateDay(day.id, { name: event.target.value })}
                />
                {days.length > 1 ? (
                  <IconButton
                    label={`Poista päivä ${day.name}`}
                    onClick={() => void deleteDay(day.id)}
                  >
                    <TrashIcon size={18} />
                  </IconButton>
                ) : null}
              </Card>
            </li>
          )
        })}
      </ul>

      <Button
        variant="secondary"
        fullWidth
        icon={<PlusIcon size={18} />}
        onClick={() => {
          setNewName('')
          setAdding(true)
        }}
      >
        Lisää treenipäivä
      </Button>

      <Sheet open={adding} onClose={() => setAdding(false)} title="Uusi treenipäivä">
        <div className="space-y-4">
          <TextField
            label="Nimi"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="Esim. Ylävartalo"
            autoComplete="off"
          />
          <Button
            variant="primary"
            fullWidth
            onClick={() => {
              const name = newName.trim()
              if (name === '' || days[0] === undefined) return
              void createDay(days[0].programId, { name, icon: 'full' })
              setAdding(false)
            }}
          >
            Lisää
          </Button>
        </div>
      </Sheet>
    </div>
  )
}

function ExercisesStep({ days }: { days: WorkoutDay[] }) {
  const [activeDayId, setActiveDayId] = useState<string | null>(null)
  const [picking, setPicking] = useState(false)

  // Valittu päivä johdetaan renderissä: ilman valintaa ensimmäinen päivä.
  const dayId = activeDayId ?? days[0]?.id ?? ''
  const rows = useLiveQuery(
    async () => (dayId === '' ? [] : listDayExercisesWithExercise(dayId)),
    [dayId],
    [],
  )

  const addToDay = (exercise: Exercise): void => {
    void addExerciseToDay(dayId, exercise.id, {
      targetSets: 3,
      repRange: exercise.defaultRepRange,
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Liikkeet</h1>
        <p className="mt-1 text-sm text-muted">
          Lisää jokaiseen päivään liikkeet kirjastosta. Voit järjestää ja muokata niitä myöhemmin.
        </p>
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {days.map((day) => (
          <button
            key={day.id}
            type="button"
            aria-pressed={day.id === dayId}
            onClick={() => setActiveDayId(day.id)}
            className={`min-h-11 shrink-0 rounded-xl border px-4 text-sm font-medium ${
              day.id === dayId
                ? 'border-accent bg-accent text-accent-ink'
                : 'border-border bg-surface-2 text-muted'
            }`}
          >
            {day.name}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <Card className="p-5 text-center text-sm text-muted">
          Päivässä ei ole vielä liikkeitä.
        </Card>
      ) : (
        <ol className="space-y-2">
          {rows.map((item, index) => (
            <li key={item.row.id}>
              <Card className="flex items-center gap-3 p-3">
                <span className="num w-5 text-center text-sm text-faint">{index + 1}</span>
                <span className="min-w-0 flex-1 truncate text-[0.9375rem]">
                  {item.exercise.name}
                </span>
                <span className="num text-xs text-muted">{item.row.targetSets} sarjaa</span>
                <IconButton
                  label={`Poista ${item.exercise.name}`}
                  onClick={() => void removeDayExercise(item.row.id)}
                >
                  <TrashIcon size={18} />
                </IconButton>
              </Card>
            </li>
          ))}
        </ol>
      )}

      <Button
        variant="secondary"
        fullWidth
        icon={<PlusIcon size={18} />}
        onClick={() => setPicking(true)}
        disabled={dayId === ''}
      >
        Lisää liike
      </Button>

      <ExercisePickerSheet
        open={picking}
        onClose={() => setPicking(false)}
        title="Lisää liike"
        createLabel="Luo ja lisää päivään"
        multiple
        selectedIds={new Set(rows.map((item) => item.exercise.id))}
        onPick={addToDay}
        onCreated={addToDay}
      />
    </div>
  )
}
