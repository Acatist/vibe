import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { RuntimeMode } from '@core/types/runtime.types'
import { DEFAULT_RUNTIME_MODE } from '@config/runtime.config'

interface RuntimeStore {
  mode: RuntimeMode
  setMode: (mode: RuntimeMode) => void
}

export const useRuntimeStore = create<RuntimeStore>()(
  persist(
    (set) => ({
      mode: DEFAULT_RUNTIME_MODE,
      setMode: (mode) => set({ mode }),
    }),
    {
      name: 'sef:runtime',
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
