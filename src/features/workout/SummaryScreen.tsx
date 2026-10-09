import { useNavigate, useParams } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { motion, useReducedMotion } from 'motion/react'
import {
  getPreviousSessionForDay,
  getSessionDetail,
  listSetsForExercise,
  reopenSession,
} from '@/db/repositories/sessionRepo'
import { recordLabel } from '@/domain/records'
import { summarizeSession, type SessionSummary } from '@/domain/sessionSummary'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { ScreenSkeleton } from '@/components/ui/Skeleton'
import { StatTile } from '@/components/ui/StatTile'
import { TrophyIcon } from '@/components/icons'
import { formatDuration, formatTime } from '@/lib/date'
import {
  formatNumber,
  formatPercentDelta,
  formatSetCount,
  formatVolume,
  formatWeight,
  formatWeightDelta,
} from '@/lib/format'

export function SummaryScreen() {
  const { sessionId = '' } = useParams()
  const navigate = useNavigate()

  const summary = useLiveQuery(
    async (): Promise<SessionSummary | null> => {
      const detail = await getSessionDetail(sessionId)
      if (!detail) return null

      /*
        Ennätykset ovat kaikkien aikojen ennätyksiä, joten jokaiselle liikkeelle
        luetaan sen aiempi historia. Kyselyt osuvat compound-indeksiin
        [exerciseId+completedAt].
      */
      const exercises = await Promise.all(
        detail.exercises.map(async (item) => {
          const all = await listSetsForExercise(item.exercise.id)
          return {
            exercise: item.exercise,
            sets: item.sets,
            history: all.filter((set) => set.sessionId !== sessionId),
          }
        }),
      )

      const previousSession = detail.session.dayId
        ? await getPreviousSessionForDay(detail.session.dayId, detail.session.startedAt)
        : undefined
      const previousDetail = previousSession ? await getSessionDetail(previousSession.id) : undefined

      return summarizeSession({
        session: detail.session,
        exercises,
        ...(previousDetail
          ? {
              previous: {
                session: previousDetail.session,
                exercises: previousDetail.exercises.map((item) => ({
                  exercise: item.exercise,
                  sets: item.sets,
                })),
              },
            }
          : {}),
      })
    },
    [sessionId],
    undefined,
  )

  if (summary === undefined) return <ScreenSkeleton />
  if (summary === null) {
    return (
      <>
        <ScreenHeader title="Yhteenveto" back="/" />
        <EmptyState
          title="Treeniä ei löytynyt"
          description="Treeni on voitu poistaa."
          action={
            <Button variant="primary" onClick={() => void navigate('/')}>
              Kotiin
            </Button>
          }
        />
      </>
    )
  }

  return (
    <>
      <ScreenHeader
        title={summary.dayName}
        subtitle={`${formatTime(summary.startedAt)} · ${formatDuration(summary.durationSec)}`}
        back="/"
      />

      <div className="space-y-4 px-4 pt-4 pb-6">
        {summary.records.length > 0 ? <RecordBanner summary={summary} /> : null}

        <div className="grid grid-cols-2 gap-2">
          <StatTile
            label="Työsarjat"
            value={summary.workSetCount}
            format={(value) => String(Math.round(value))}
            {...(summary.previous ? { delta: summary.previous.workSetCountDelta } : {})}
          />
          <StatTile
            label="Volyymi"
            value={summary.totalVolume}
            format={formatVolume}
            {...(summary.previous ? { delta: summary.previous.volumeDelta } : {})}
            formatDelta={(value) => `${value > 0 ? '+' : '−'}${formatVolume(Math.abs(value))}`}
          />
        </div>

        {summary.previous ? (
          <Card className="p-4">
            <h2 className="text-sm font-semibold">Vertailu edelliseen kertaan</h2>
            <p className="num mt-1 text-sm text-muted">
              {summary.previous.volumeDelta === 0
                ? 'Volyymi sama kuin viimeksi.'
                : `Volyymi ${formatVolume(Math.abs(summary.previous.volumeDelta))} ${
                    summary.previous.volumeDelta > 0 ? 'enemmän' : 'vähemmän'
                  } kuin viimeksi (${formatPercentDelta(
                    summary.previous.totalVolume === 0
                      ? 0
                      : (summary.previous.volumeDelta / summary.previous.totalVolume) * 100,
                  )}).`}
            </p>
          </Card>
        ) : (
          <Card className="p-4">
            <h2 className="text-sm font-semibold">Ensimmäinen kerta tällä päivällä</h2>
            <p className="mt-1 text-sm text-muted">
              Tästä tulee vertailutaso seuraavalle kerralle.
            </p>
          </Card>
        )}

        <section className="space-y-2">
          <h2 className="px-1 text-sm font-semibold">Liikkeet</h2>
          {summary.exercises.map((item) => (
            <Card key={item.exerciseId} className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[0.9375rem] font-medium">{item.exerciseName}</p>
                  <p className="num mt-0.5 text-xs text-muted">
                    {formatSetCount(item.workSetCount)} · {formatVolume(item.volume)}
                    {item.heaviestWeight === null
                      ? ''
                      : ` · raskain ${formatWeight(item.heaviestWeight)}`}
                  </p>
                </div>
                {item.records.length > 0 ? (
                  <Badge variant="record" icon={<TrophyIcon size={14} />}>
                    Ennätys
                  </Badge>
                ) : null}
              </div>
              <div className="num mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                {item.volumeDelta === null ? null : (
                  <Delta label="volyymi" value={item.volumeDelta} format={formatVolume} />
                )}
                {item.bestE1rmDelta === null ? null : (
                  <Delta
                    label="e1RM"
                    value={item.bestE1rmDelta}
                    format={(value) => `${formatNumber(value)} kg`}
                  />
                )}
                {item.heaviestWeightDelta === null || item.heaviestWeightDelta === 0 ? null : (
                  <span className={item.heaviestWeightDelta > 0 ? 'text-good' : 'text-muted'}>
                    paino {formatWeightDelta(item.heaviestWeightDelta)}
                  </span>
                )}
              </div>
            </Card>
          ))}
        </section>

        <div className="flex gap-2 pt-2">
          <Button
            variant="secondary"
            fullWidth
            onClick={() => {
              void reopenSession(sessionId).then(() => void navigate(`/workout/${sessionId}`))
            }}
          >
            Jatka treeniä
          </Button>
          <Button variant="primary" fullWidth onClick={() => void navigate('/')}>
            Valmis
          </Button>
        </div>
      </div>
    </>
  )
}

/** Ennätysten juhlinta: näyttävä mutta lyhyt (SPEC §6.5). */
function RecordBanner({ summary }: { summary: SessionSummary }) {
  const reduced = useReducedMotion()

  return (
    <Card className="relative overflow-hidden border-record/50 p-4">
      {reduced ? null : <Sparks />}
      <div className="relative flex items-center gap-3">
        <motion.span
          initial={{ scale: 0.6, rotate: -12 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 18 }}
          className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-record/15 text-record"
        >
          <TrophyIcon size={24} />
        </motion.span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">
            {summary.records.length === 1 ? 'Uusi ennätys' : `${summary.records.length} uutta ennätystä`}
          </h2>
          <ul className="num mt-0.5 space-y-0.5 text-xs text-muted">
            {summary.records.slice(0, 4).map((record) => (
              <li key={`${record.exerciseId}-${record.kind}`}>
                {record.exerciseName} · {recordLabel(record.kind)} {formatNumber(record.value)}
                {record.kind === 'most_reps_at_weight' ? ' toistoa' : ' kg'}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  )
}

/** Kipinät ennätysbannerissa: vain transform ja opacity. */
function Sparks() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {Array.from({ length: 10 }, (_, index) => (
        <motion.span
          key={index}
          className="absolute size-1 rounded-full bg-record"
          style={{ left: `${8 + index * 9}%`, top: '50%' }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1, 0.4],
            y: [0, -22 - (index % 4) * 10],
            x: [0, (index % 2 === 0 ? 1 : -1) * (6 + index)],
          }}
          transition={{ duration: 1.1, delay: index * 0.045, ease: 'easeOut' }}
        />
      ))}
    </div>
  )
}

function Delta({
  label,
  value,
  format,
}: {
  label: string
  value: number
  format: (value: number) => string
}) {
  if (value === 0) return <span className="text-muted">{label} ±0</span>
  return (
    <span className={value > 0 ? 'text-good' : 'text-muted'}>
      {label} {value > 0 ? '+' : '−'}
      {format(Math.abs(value))}
    </span>
  )
}
