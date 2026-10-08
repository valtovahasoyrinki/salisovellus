import { useEffect } from 'react'
import { applyThemeAttribute, systemTheme } from '@/app/bootstrap'
import { useSettings } from '@/app/useSettings'

/** Teema (SPEC §6.11): tumma oletuksena, vaalea tai järjestelmä. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useSettings()

  useEffect(() => {
    if (theme !== 'system') {
      applyThemeAttribute(theme)
      return
    }
    applyThemeAttribute(systemTheme())
    const media = window.matchMedia('(prefers-color-scheme: light)')
    const onChange = (): void => {
      applyThemeAttribute(systemTheme())
    }
    media.addEventListener('change', onChange)
    return () => {
      media.removeEventListener('change', onChange)
    }
  }, [theme])

  return children
}
