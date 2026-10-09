import { createElement, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { motion } from 'motion/react'
import { isOnboardingDone } from '@/db/repositories/metaRepo'
import { startSessionFromDay } from '@/db/repositories/sessionRepo'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ListRow } from '@/components/ui/ListRow'
import { ProgressRing } from '@/components/ui/ProgressRing'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  CalendarIcon,
  ChevronRightIcon,
  DumbbellIcon,
  FlameIcon,
  InfoIcon,
  SettingsIcon,
  WarningIcon,
  dayIcon,
} from '@/components/icons'
import { useSettings } from '@/app/useSettings'
import { formatDayLabel, formatDuration } from '@/lib/date'
import { formatWorkoutCount } from '@/lib/format'
import { useHomeData } from './useHomeData'

/** Varmuuskopiomuistutuksen raja (SPEC §6.10). */
const BACKUP_REMINDER_DAYS = 14

export function HomeScreen() {
  const navigate = useNavigate()
  const settings = useSettings()
  const home = useHomeData(settings.weeklyTarget, settings.weeklySetsRange)
  const onboardingDone = useLiveQuery(() => isOnboardingDone(), [], undefined)

  // Ensimmäinen avaus ohjataan käyttöönottoon, kun ohjelmaa ei vielä ole.
  useEffect(() => {
    if (onboardingDone === false && !home.loading && home.days.length === 0) {
      void navigate('/onboarding', { replace: true })
    }
  }, [onboardingDone, home.loading, home.days.length, navigate])

  const weekProgress = settings.weeklyTarget > 0 ? home.weekDoneCount / settings.weeklyTarget : 0

  return (
    <>
      <header className="safe-top flex items-center justify-between px-4 pt-6 pb-2">
        <h1 className="text-2xl font-semibold tracking-tight">Salisovellus</h1>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Asetukset"
          onClick={() => void navigate('/settings')}
        >
          <SettingsIcon size={22} />
        </Button>
      </header>

      <div className="space-y-3 px-4 pb-4">
        {home.activeSession ? (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-accent p-4">
              <p className="text-xs text-muted">Treeni kesken</p>
              <h2 className="mt-0.5 text-lg font-semibold">{home.activeSession.dayName}</h2>
              <p className="num mt-0.5 text-xs text-muted">
                Aloitettu {formatDayLabel(home.activeSession.startedAt)} ·{' '}
                {formatDuration((home.now - home.activeSession.startedAt) / 1000)} sitten
              </p>
              <Button
                variant="primary"
                fullWidth
                size="lg"
                className="mt-3"
                onClick={() => void navigate(`/workout/${home.activeSession?.id ?? ''}`)}
              >
                Jatka treeniä
              </Button>
            </Card>
          </motion.div>
        ) : (
          <Card className="p-4">
            <p className="text-xs text-muted">Seuraava kierrossa</p>
            <div className="mt-1 flex items-center gap-3">
              <span
                className="flex size-12 shrink-0 items-center justify-center rounded-xl"
                style={{
                  backgroundColor: home.nextDay ? `var(--${home.nextDay.color})` : 'var(--surface-3)',
                  color: home.nextDay ? 'var(--accent-ink)' : 'var(--text)',
                }}
              >
                {createElement(home.nextDay ? dayIcon(home.nextDay.icon) : DumbbellIcon, {
                  size: 24,
                })}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-lg font-semibold">
                  {home.nextDay?.name ?? 'Ei ohjelmaa'}
                </h2>
                <p className="text-xs text-muted">
                  {home.lastDone
                    ? `Viimeksi ${formatDayLabel(home.lastDone.startedAt)}: ${home.lastDone.dayName}`
                    : 'Ensimmäinen treeni'}
                </p>
              </div>
            </div>
            <Button
              variant="primary"
              fullWidth
              size="lg"
              className="mt-3"
              disabled={home.loading}
              onClick={() => {
                if (home.nextDay) {
                  void startSessionFromDay(home.nextDay.id).then((id) =>
                    navigate(`/workout/${id}`),
                  )
                } else {
                  void navigate('/workout/new')
                }
              }}
            >
              {home.nextDay ? `Aloita ${home.nextDay.name}` : 'Aloita treeni'}
            </Button>
            <Button
              variant="ghost"
              fullWidth
              size="sm"
              className="mt-1"
              onClick={() => void navigate('/workout/new')}
            >
              Valitse toinen päivä
            </Button>
          </Card>
        )}

        <Card className="flex items-center gap-4 p-4">
          <ProgressRing
            progress={weekProgress}
            size={64}
            strokeWidth={6}
            tone={weekProgress >= 1 ? 'good' : 'accent'}
            label={`Viikkotavoite ${home.weekDoneCount} / ${settings.weeklyTarget} treeniä`}
          >
            <span className="num text-sm font-semibold">
              {home.weekDoneCount}/{settings.weeklyTarget}
            </span>
          </ProgressRing>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold">Tämä viikko</h2>
            <p className="num mt-0.5 text-xs text-muted">
              {formatWorkoutCount(home.weekDoneCount)} tehty, tavoite {settings.weeklyTarget}.
            </p>
            {home.weeklyTargetStreak > 0 ? (
              <Badge variant="good" icon={<FlameIcon size={14} />} className="mt-1.5">
                {home.weeklyTargetStreak} viikon putki
              </Badge>
            ) : null}
          </div>
        </Card>

        {home.loading ? (
          <Skeleton className="h-24 w-full" />
        ) : home.insights.length > 0 ? (
          <Card className="divide-y divide-border">
            {home.insights.map((insight) => (
              <button
                key={insight.id}
                type="button"
                className="flex w-full items-start gap-2.5 px-4 py-3 text-left"
                onClick={() =>
                  void navigate(
                    insight.exerciseId
                      ? `/analysis/exercise/${insight.exerciseId}`
                      : '/analysis',
                  )
                }
              >
                <InfoIcon size={18} className="mt-0.5 shrink-0 text-faint" />
                <span className="num flex-1 text-sm leading-snug">{insight.text}</span>
                <ChevronRightIcon size={18} className="mt-0.5 shrink-0 text-faint" />
              </button>
            ))}
          </Card>
        ) : null}

        {home.daysSinceBackup === null || home.daysSinceBackup >= BACKUP_REMINDER_DAYS ? (
          <Card className="flex items-start gap-2.5 p-4">
            <WarningIcon size={20} className="mt-0.5 shrink-0 text-warn" />
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold">Varmuuskopio puuttuu</h2>
              <p className="mt-0.5 text-xs text-muted">
                {home.daysSinceBackup === null
                  ? 'Dataa ei ole vielä kopioitu. Se on vain tässä puhelimessa.'
                  : `Viimeisestä kopiosta ${home.daysSinceBackup} päivää.`}
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => void navigate('/settings/backup')}>
              Vie
            </Button>
          </Card>
        ) : null}

        {home.recentSessions.length > 0 ? (
          <Card>
            <h2 className="px-4 pt-3 pb-1 text-sm font-semibold">Viimeiset treenit</h2>
            <ul className="divide-y divide-border">
              {home.recentSessions.map((session) => (
                <li key={session.id}>
                  <ListRow
                    to={`/history/${session.id}`}
                    title={session.dayName}
                    subtitle={formatDayLabel(session.startedAt)}
                    leading={<CalendarIcon size={20} className="text-muted" />}
                  />
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
      </div>
    </>
  )
}
