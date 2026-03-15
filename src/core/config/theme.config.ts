import type { ThemeId, ThemeMode } from '@core/types/extension.types'

export interface ThemeDefinition {
  id: ThemeId
  name: string
  description: string
  defaultMode: ThemeMode
}

export const THEME_DEFINITIONS: Record<ThemeId, ThemeDefinition> = {
  twitter: {
    id: 'twitter',
    name: 'Twitter',
    description: 'Clean blue social media aesthetic',
    defaultMode: 'dark',
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight',
    description: 'Deep purple hacker aesthetic',
    defaultMode: 'dark',
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean',
    description: 'Deep blue-cyan underwater palette',
    defaultMode: 'dark',
  },
  forest: {
    id: 'forest',
    name: 'Forest',
    description: 'Dark green earthy tones',
    defaultMode: 'dark',
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset',
    description: 'Warm orange and amber gradients',
    defaultMode: 'dark',
  },
  minimal: {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean neutral black and white',
    defaultMode: 'light',
  },
}

export const THEME_IDS = Object.keys(THEME_DEFINITIONS) as ThemeId[]

/**
 * Apply theme to the document root by setting data attributes.
 * CSS in globals.css responds to [data-theme] and [data-mode] attributes.
 */
export function applyTheme(themeId: ThemeId, mode: ThemeMode, root?: HTMLElement): void {
  const target = root ?? document.documentElement
  target.setAttribute('data-theme', themeId)
  target.setAttribute('data-mode', mode)
  if (mode === 'dark') {
    target.classList.add('dark')
  } else {
    target.classList.remove('dark')
  }
}

export function getThemeDefinition(id: ThemeId): ThemeDefinition {
  return THEME_DEFINITIONS[id]
}
