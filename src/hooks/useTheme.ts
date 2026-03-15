import { useThemeStore } from '@store/theme.store'
import { useEffect } from 'react'
import { applyTheme } from '@core/config/theme.config'

/**
 * useTheme — Hook for reading and updating the active theme + mode.
 *
 * Usage:
 *   const { theme, setTheme, mode, toggleMode } = useTheme()
 */
export function useTheme() {
  const { themeId, mode, setTheme, setMode, toggleMode } = useThemeStore()

  // Apply theme to DOM on first mount
  useEffect(() => {
    applyTheme(themeId, mode)
  }, [themeId, mode])

  return { theme: themeId, setTheme, mode, setMode, toggleMode }
}
