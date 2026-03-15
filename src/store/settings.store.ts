import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { ProfileName, LogLevel } from '@core/types/extension.types'
import { extensionConfig } from '@config/extension.config'

interface SettingsStore {
  profile: ProfileName
  debugMode: boolean
  logLevel: LogLevel
  infiniteEnergy: boolean
  setProfile: (profile: ProfileName) => void
  setDebugMode: (debug: boolean) => void
  setLogLevel: (level: LogLevel) => void
  setInfiniteEnergy: (infinite: boolean) => void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      profile: extensionConfig.defaultProfile,
      debugMode: extensionConfig.debug,
      logLevel: extensionConfig.logLevel,
      infiniteEnergy: false,

      setProfile: (profile) => set({ profile }),
      setDebugMode: (debugMode) => set({ debugMode }),
      setLogLevel: (logLevel) => set({ logLevel }),
      setInfiniteEnergy: (infiniteEnergy) => set({ infiniteEnergy }),
    }),
    {
      name: 'sef:settings',
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
