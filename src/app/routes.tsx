import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router'
import { AppShell } from '@/app/AppShell'
import { ScreenSkeleton } from '@/components/ui/Skeleton'
import { HomeScreen } from '@/features/home/HomeScreen'
import { WorkoutScreen } from '@/features/workout/WorkoutScreen'
import { WorkoutStartScreen } from '@/features/workout/WorkoutStartScreen'
import { SummaryScreen } from '@/features/workout/SummaryScreen'

/*
  Koti ja kirjaus latautuvat heti – ne ovat sovelluksen kriittinen polku.
  Muut näkymät jaetaan omiin nippuihinsa, jotta käynnistys pysyy alle sekunnissa.
*/
const HistoryScreen = lazy(() => import('@/features/history/HistoryScreen'))
const SessionDetailScreen = lazy(() => import('@/features/history/SessionDetailScreen'))
const OverviewScreen = lazy(() => import('@/features/analysis/OverviewScreen'))
const ExerciseAnalysisScreen = lazy(() => import('@/features/analysis/ExerciseAnalysisScreen'))
const ProgramScreen = lazy(() => import('@/features/program/ProgramScreen'))
const DayScreen = lazy(() => import('@/features/program/DayScreen'))
const ExerciseLibraryScreen = lazy(() => import('@/features/exercises/ExerciseLibraryScreen'))
const ExerciseDetailScreen = lazy(() => import('@/features/exercises/ExerciseDetailScreen'))
const SettingsScreen = lazy(() => import('@/features/settings/SettingsScreen'))
const BackupScreen = lazy(() => import('@/features/backup/BackupScreen'))
const OnboardingScreen = lazy(() => import('@/features/onboarding/OnboardingScreen'))
/* Kehitystyökalu: komponenttigalleria visuaaliseen tarkistukseen (ei navigaatiossa). */
/*
  Komponenttigalleria on kehitystyökalu ja sisältää demoarvoja, joten se
  rakennetaan vain kehitysajossa: tuotantonippuun ei jää mock-dataa.
*/
const ComponentGallery = import.meta.env.DEV
  ? lazy(() => import('@/features/devtools/ComponentGallery'))
  : null

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<ScreenSkeleton />}>{children}</Suspense>
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomeScreen />} />
        <Route path="workout/new" element={<WorkoutStartScreen />} />
        <Route path="workout/:sessionId" element={<WorkoutScreen />} />
        <Route path="workout/:sessionId/summary" element={<SummaryScreen />} />
        <Route
          path="history"
          element={
            <Lazy>
              <HistoryScreen />
            </Lazy>
          }
        />
        <Route
          path="history/:sessionId"
          element={
            <Lazy>
              <SessionDetailScreen />
            </Lazy>
          }
        />
        <Route
          path="analysis"
          element={
            <Lazy>
              <OverviewScreen />
            </Lazy>
          }
        />
        <Route
          path="analysis/exercise/:exerciseId"
          element={
            <Lazy>
              <ExerciseAnalysisScreen />
            </Lazy>
          }
        />
        <Route
          path="program"
          element={
            <Lazy>
              <ProgramScreen />
            </Lazy>
          }
        />
        <Route
          path="program/day/:dayId"
          element={
            <Lazy>
              <DayScreen />
            </Lazy>
          }
        />
        <Route
          path="exercises"
          element={
            <Lazy>
              <ExerciseLibraryScreen />
            </Lazy>
          }
        />
        <Route
          path="exercises/:exerciseId"
          element={
            <Lazy>
              <ExerciseDetailScreen />
            </Lazy>
          }
        />
        <Route
          path="settings"
          element={
            <Lazy>
              <SettingsScreen />
            </Lazy>
          }
        />
        <Route
          path="settings/backup"
          element={
            <Lazy>
              <BackupScreen />
            </Lazy>
          }
        />
        {ComponentGallery === null ? null : (
          <Route
            path="dev/gallery"
            element={
              <Lazy>
                <ComponentGallery />
              </Lazy>
            }
          />
        )}
      </Route>

      {/* Käyttöönotto on oma koko ruudun kulku: ei alapalkkia eikä ajastinpalkkia. */}
      <Route
        path="/onboarding"
        element={
          <Lazy>
            <OnboardingScreen />
          </Lazy>
        }
      />
    </Routes>
  )
}
