import { HashRouter } from 'react-router'
import { AppRoutes } from '@/app/routes'
import { RestTimerProvider } from '@/app/providers/RestTimerProvider'
import { ThemeProvider } from '@/app/providers/ThemeProvider'
import { ToastProvider } from '@/app/providers/ToastProvider'
import { useSettings } from '@/app/useSettings'

export function App() {
  const settings = useSettings()

  return (
    <ThemeProvider>
      {/* Ajastin on ulompana, jotta ilmoitukset osaavat asettua sen yläpuolelle. */}
      <RestTimerProvider
        soundEnabled={settings.restSoundEnabled}
        vibrationEnabled={settings.restVibrationEnabled}
      >
        <ToastProvider>
          {/*
            HashRouter: toimii millä tahansa staattisella hostilla ilman
            uudelleenkirjoitussääntöjä, myös GitHub Pagesin alipolussa.
          */}
          <HashRouter>
            <AppRoutes />
          </HashRouter>
        </ToastProvider>
      </RestTimerProvider>
    </ThemeProvider>
  )
}
