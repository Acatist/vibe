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
  perpetuity: {
    id: 'perpetuity',
    name: 'Perpetuity',
    description: 'Retro terminal monospace aesthetic',
    defaultMode: 'dark',
  },
  'cosmic-night': {
    id: 'cosmic-night',
    name: 'Cosmic Night',
    description: 'Deep violet starlit palette',
    defaultMode: 'dark',
  },
  'violet-bloom': {
    id: 'violet-bloom',
    name: 'Violet Bloom',
    description: 'Bold violet with soft rounded edges',
    defaultMode: 'dark',
  },
  'mocha-mousse': {
    id: 'mocha-mousse',
    name: 'Mocha Mousse',
    description: 'Warm earthy coffee tones',
    defaultMode: 'dark',
  },
  'elegant-luxury': {
    id: 'elegant-luxury',
    name: 'Elegant Luxury',
    description: 'Rich premium gold and amber',
    defaultMode: 'dark',
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
