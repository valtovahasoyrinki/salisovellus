import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { getActiveProgram, listDays } from '@/db/repositories/programRepo'
import {
  getActiveSession,
  getLastDoneSession,
  startEmptySession,
  startPastSession,
  startSessionFromDay,
} from '@/db/repositories/sessionRepo'
import { nextWorkoutDay } from '@/domain/rotation'
import type { WorkoutDay } from '@/domain/types'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { ScreenSkeleton } from '@/components/ui/Skeleton'
import { Sheet } from '@/components/ui/Sheet'
import { TextField } from '@/components/ui/TextField'
import { CalendarIcon, DumbbellIcon, dayIcon } from '@/components/icons'
import { dateKeyOf } from '@/lib/date'

/** Treenin aloitus: kierron mukainen päivä, muu päivä, tyhjä tai jälkikirjaus. */
export function WorkoutStartScreen() {
  const navigate = useNavigate()
  const [pastOpen, setPastOpen] = useState(false)
  // Tämä päivä luetaan kertaalleen, jotta render pysyy puhtaana.
  const [today] = useState(() => dateKeyOf(Date.now()))
  const [pastDate, setPastDate] = useState(today)
  const [pastDayId, setPastDayId] = useState<string | null>(null)

  // Ohjelma ja päivät samassa kyselyssä, jotta tyhjä tila ei välähdä.
  const days = useLiveQuery(
    async () => {
      const program = await getActiveProgram()
      return program ? listDays(program.id) : []
    },
    [],
    undefined,
  )
  const lastDone = useLiveQuery(async () => (await getLastDoneSession()) ?? null, [], undefined)
  const active = useLiveQuery(async () => (await getActiveSession()) ?? null, [], undefined)

  if (days === undefined || lastDone === undefined || active === undefined) return <ScreenSkeleton />

  if (active) {
    void navigate(`/workout/${active.id}`, { replace: true })
    return <ScreenSkeleton />
  }

  const suggested = nextWorkoutDay(days, lastDone?.dayId)

  const start = (day: WorkoutDay): void => {
    void startSessionFromDay(day.id).then((id) => void navigate(`/workout/${id}`, { replace: true }))
  }

  return (
    <>
      <ScreenHeader title="Aloita treeni" back="/" />

      {days.length === 0 ? (
        <EmptyState
          title="Ohjelmassa ei ole päiviä"
          description="Tee ohjelma ensin, tai aloita tyhjä treeni ja lisää liikkeet kirjauksen aikana."
          icon={<DumbbellIcon size={28} />}
          action={
            <div className="flex flex-col gap-2">
              <Button variant="primary" onClick={() => void navigate('/program')}>
                Avaa ohjelma
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  void startEmptySession().then((id) => void navigate(`/workout/${id}`, { replace: true }))
                }}
              >
                Tyhjä treeni
              </Button>
            </div>
          }
        />
      ) : (
        <div className="space-y-3 px-4 pt-4 pb-6">
          <ul className="space-y-2">
            {days.map((day) => {
              const Icon = dayIcon(day.icon)
              const isNext = day.id === suggested?.id
              return (
                <li key={day.id}>
                  <Card
                    className={`flex items-center gap-3 p-3 ${isNext ? 'border-accent' : ''}`}
                  >
                    <span
                      className="flex size-11 shrink-0 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `var(--${day.color})`, color: 'var(--accent-ink)' }}
                    >
                      <Icon size={22} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{day.name}</p>
                      {isNext ? <Badge variant="good">Seuraava kierrossa</Badge> : null}
                    </div>
                    <Button variant={isNext ? 'primary' : 'secondary'} onClick={() => start(day)}>
                      Aloita
                    </Button>
                  </Card>
                </li>
              )
            })}
          </ul>

          <Button
            variant="secondary"
            fullWidth
            onClick={() => {
              void startEmptySession().then((id) => void navigate(`/workout/${id}`, { replace: true }))
            }}
          >
            Tyhjä treeni
          </Button>

          <Button
            variant="ghost"
            fullWidth
            icon={<CalendarIcon size={18} />}
            onClick={() => {
              setPastDayId(suggested?.id ?? days[0]?.id ?? null)
              setPastOpen(true)
            }}
          >
            Kirjaa menneelle päivälle
          </Button>
        </div>
      )}

      <Sheet open={pastOpen} onClose={() => setPastOpen(false)} title="Jälkikirjaus">
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Unohtunut treeni kirjataan valitulle päivälle. Aika asetetaan klo 18.00.
          </p>
          <TextField
            label="Päivä"
            type="date"
            value={pastDate}
            max={today}
            onChange={(event) => setPastDate(event.target.value)}
          />
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Treenipäivä</legend>
            <div className="flex flex-wrap gap-2">
              {days.map((day) => (
                <button
                  key={day.id}
                  type="button"
                  aria-pressed={pastDayId === day.id}
                  onClick={() => setPastDayId(day.id)}
                  className={`min-h-11 rounded-xl border px-4 text-sm font-medium ${
                    pastDayId === day.id
                      ? 'border-accent bg-accent text-accent-ink'
                      : 'border-border bg-surface-2 text-muted'
                  }`}
                >
                  {day.name}
                </button>
              ))}
              <button
                type="button"
                aria-pressed={pastDayId === null}
                onClick={() => setPastDayId(null)}
                className={`min-h-11 rounded-xl border px-4 text-sm font-medium ${
                  pastDayId === null
                    ? 'border-accent bg-accent text-accent-ink'
                    : 'border-border bg-surface-2 text-muted'
                }`}
              >
                Vapaa treeni
              </button>
            </div>
          </fieldset>
          <Button
            variant="primary"
            fullWidth
            onClick={() => {
              void startPastSession(pastDate, pastDayId ?? undefined).then((id) => {
                setPastOpen(false)
                void navigate(`/workout/${id}`, { replace: true })
              })
            }}
          >
            Aloita jälkikirjaus
          </Button>
        </div>
      </Sheet>
    </>
  )
}
