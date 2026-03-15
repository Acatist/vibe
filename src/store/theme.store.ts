import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { ThemeId, ThemeMode } from '@core/types/extension.types'
import { applyTheme } from '@core/config/theme.config'
import { extensionConfig } from '@config/extension.config'

interface ThemeStore {
  themeId: ThemeId
  mode: ThemeMode
  setTheme: (themeId: ThemeId) => void
  setMode: (mode: ThemeMode) => void
  toggleMode: () => void
  applyToDOM: () => void
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      themeId: extensionConfig.defaultTheme,
      mode: extensionConfig.defaultThemeMode,

      setTheme: (themeId) => {
        set({ themeId })
        applyTheme(themeId, get().mode)
      },

      setMode: (mode) => {
        set({ mode })
        applyTheme(get().themeId, mode)
      },

      toggleMode: () => {
        const newMode = get().mode === 'dark' ? 'light' : 'dark'
        set({ mode: newMode })
        applyTheme(get().themeId, newMode)
      },

      applyToDOM: () => {
        applyTheme(get().themeId, get().mode)
      },
    }),
    {
      name: 'sef:theme',
      storage: createJSONStorage(() => ({
        getItem: async (key) => {
          const result = await chrome.storage.local.get(key)
          return (result[key] as string | null) ?? null
        },
        setItem: async (key, value) => {
          await chrome.storage.local.set({ [key]: value })
        },
        removeItem: async (key) => {
          await chrome.storage.local.remove(key)
        },
      })),
    },
  ),
)
