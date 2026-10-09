import { Outlet, useLocation } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { motion } from 'motion/react'
import { BottomNav } from '@/app/BottomNav'
import { RestTimerBar } from '@/features/workout/RestTimerBar'
import { getActiveSession } from '@/db/repositories/sessionRepo'

/**
 * Sovelluksen runko: sisältö, kelluva lepoajastin ja alapalkki.
 * Kirjausnäkymä piilottaa alapalkin – tärkeimmät toiminnot ovat silloin
 * ruudun alaosassa yhden käden käytettävissä (SPEC §6.3).
 */
export function AppShell() {
  const location = useLocation()
  const activeSession = useLiveQuery(() => getActiveSession(), [], undefined)
  const inWorkout = location.pathname.startsWith('/workout/')

  return (
    <div className="min-h-dvh bg-bg text-text">
      <main className={inWorkout ? 'pb-0' : 'pb-[calc(env(safe-area-inset-bottom,0px)+4.75rem)]'}>
        {/*
          Näkymäsiirtymä on vain sisääntulo: avaimen vaihtuessa div korvautuu ja
          animaatio alkaa alusta. AnimatePresencen exit-vaihetta ei käytetä,
          koska keskeytynyt poistuma jätti näkymän opacity: 0 -tilaan, jos
          reitti vaihtui ennen animaation loppua.
        */}
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 520, damping: 40, mass: 0.6 }}
        >
          <Outlet />
        </motion.div>
      </main>

      <RestTimerBar inWorkout={inWorkout} />
      {inWorkout ? null : <BottomNav activeSessionId={activeSession?.id} />}
    </div>
  )
}
