import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface FormPattern {
  domain: string
  fieldMappings: Record<string, string>
  submitSelector: string
  successSignal: string
  lastSuccess: number
  successCount: number
}

interface FormPatternsStore {
  patterns: Record<string, FormPattern>
  savePattern: (domain: string, pattern: Omit<FormPattern, 'domain' | 'successCount'> & { successCount?: number }) => void
  getPattern: (domain: string) => FormPattern | null
  clearPatterns: () => void
}

function normalizeDomain(raw: string): string {
  try {
    return new URL(raw.startsWith('http') ? raw : `https://${raw}`).hostname.replace(/^www\./, '')
  } catch {
    return raw.toLowerCase().replace(/^www\./, '').trim()
  }
}

export const useFormPatternsStore = create<FormPatternsStore>()(
  persist(
    (set, get) => ({
      patterns: {},

      savePattern: (domain, pattern) =>
        set((s) => {
          const key = normalizeDomain(domain)
          const existing = s.patterns[key]
          return {
            patterns: {
              ...s.patterns,
              [key]: {
                ...pattern,
                domain: key,
                successCount: (existing?.successCount ?? 0) + 1,
              },
            },
          }
        }),

      getPattern: (domain) => {
        const key = normalizeDomain(domain)
        return get().patterns[key] ?? null
      },

      clearPatterns: () => set({ patterns: {} }),
    }),
    {
      name: 'vibe-reach:form-patterns',
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
