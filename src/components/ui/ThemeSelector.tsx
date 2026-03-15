import { Moon, Sun, Palette } from 'lucide-react'
import { useTheme } from '@hooks/useTheme'
import { THEME_DEFINITIONS, THEME_IDS } from '@core/config/theme.config'
import type { ThemeId } from '@core/types/extension.types'

/**
 * ThemeSelector — Dropdown for selecting among the 6 SEF themes + light/dark toggle.
 *
 * Usage:
 *   <ThemeSelector />
 */
export function ThemeSelector() {
  const { theme, setTheme, mode, toggleMode } = useTheme()

  return (
    <div className="flex items-center gap-2">
      {/* Theme picker */}
      <div className="relative">
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value as ThemeId)}
          className="
            appearance-none rounded-md border border-border bg-background
            pl-8 pr-8 py-1.5 text-sm text-foreground
            focus:outline-none focus:ring-2 focus:ring-ring
            cursor-pointer transition-colors hover:bg-muted
          "
          aria-label="Select theme"
        >
          {THEME_IDS.map((id) => (
            <option key={id} value={id}>
              {THEME_DEFINITIONS[id].name}
            </option>
          ))}
        </select>
        <Palette
          className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          size={14}
        />
      </div>

      {/* Dark/light mode toggle */}
      <button
        type="button"
        onClick={toggleMode}
        className="
          flex items-center justify-center rounded-md border border-border
          bg-background p-1.5 text-foreground transition-colors
          hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring
        "
        aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        title={mode === 'dark' ? 'Light mode' : 'Dark mode'}
      >
        {mode === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
      </button>
    </div>
  )
}
