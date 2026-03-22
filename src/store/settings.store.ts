import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { ProfileName, LogLevel } from '@core/types/extension.types'
import { extensionConfig } from '@config/extension.config'
import type { FormFallbackProfile } from '@core/types/contact.types'
import { DEFAULT_FALLBACK_PROFILE } from '@core/types/contact.types'

interface SettingsStore {
  profile: ProfileName
  debugMode: boolean
  logLevel: LogLevel
  infiniteEnergy: boolean
  stealthEnabled: boolean
  downloadFolder: string
  fileNamePrefix: string
  includeDate: boolean
  savedFolderPath: string // resolved via showDirectoryPicker, display-only in extension
  /** Extended fallback data for filling form fields beyond the Business Profile */
  formFallbackProfile: FormFallbackProfile
  setProfile: (profile: ProfileName) => void
  setDebugMode: (debug: boolean) => void
  setLogLevel: (level: LogLevel) => void
  setInfiniteEnergy: (infinite: boolean) => void
  setStealthEnabled: (enabled: boolean) => void
  setDownloadFolder: (folder: string) => void
  setFileNamePrefix: (prefix: string) => void
  setIncludeDate: (include: boolean) => void
  setSavedFolderPath: (path: string) => void
  setFormFallbackProfile: (profile: FormFallbackProfile) => void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      profile: extensionConfig.defaultProfile,
      debugMode: extensionConfig.debug,
      logLevel: extensionConfig.logLevel,
      infiniteEnergy: false,
      stealthEnabled: true,
      downloadFolder: 'Vibe Informes',
      fileNamePrefix: 'informe-vibe',
      includeDate: true,
      savedFolderPath: '',
      formFallbackProfile: DEFAULT_FALLBACK_PROFILE,

      setProfile: (profile) => set({ profile }),
      setDownloadFolder: (downloadFolder) => set({ downloadFolder }),
      setFileNamePrefix: (fileNamePrefix) => set({ fileNamePrefix }),
      setIncludeDate: (includeDate) => set({ includeDate }),
      setSavedFolderPath: (savedFolderPath) => set({ savedFolderPath }),
      setDebugMode: (debugMode) => set({ debugMode }),
      setLogLevel: (logLevel) => set({ logLevel }),
      setInfiniteEnergy: (infiniteEnergy) => set({ infiniteEnergy }),
      setStealthEnabled: (stealthEnabled) => set({ stealthEnabled }),
      setFormFallbackProfile: (formFallbackProfile) => set({ formFallbackProfile }),
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
