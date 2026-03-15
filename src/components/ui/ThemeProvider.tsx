import { useEffect, type ReactNode } from 'react'
import { useThemeStore } from '@store/theme.store'
import { applyTheme } from '@core/config/theme.config'

interface ThemeProviderProps {
  children: ReactNode
}

/**
 * ThemeProvider — Applies the active Tweakcn theme to the document root.
 *
 * Wrap your root component with this to ensure all Shadcn/UI components
 * pick up the correct CSS variable values from the active theme.
 *
 * Usage:
 *   <ThemeProvider>
 *     <App />
 *   </ThemeProvider>
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const { themeId, mode } = useThemeStore()

  // Apply theme on mount and whenever theme/mode changes
  useEffect(() => {
    applyTheme(themeId, mode)
  }, [themeId, mode])

  return <>{children}</>
}
