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
      <ToastProvider>
        <RestTimerProvider
          soundEnabled={settings.restSoundEnabled}
          vibrationEnabled={settings.restVibrationEnabled}
        >
          {/*
            HashRouter: toimii millä tahansa staattisella hostilla ilman
            uudelleenkirjoitussääntöjä, myös GitHub Pagesin alipolussa.
          */}
          <HashRouter>
            <AppRoutes />
          </HashRouter>
        </RestTimerProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}
