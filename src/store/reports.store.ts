import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Report } from '@core/types/report.types'

/** Guard against legacy data missing required string fields */
function isValidReport(r: unknown): r is Report {
  if (!r || typeof r !== 'object') return false
  const o = r as Record<string, unknown>
  return (
    typeof o.id === 'string' &&
    typeof o.campaignName === 'string' &&
    typeof o.clientName === 'string'
  )
}

interface ReportsStore {
  reports: Report[]
  addReport: (report: Omit<Report, 'id'>) => string
  deleteReport: (id: string) => void
  getReport: (id: string) => Report | undefined
}

export const useReportsStore = create<ReportsStore>()(
  persist(
    (set, get) => ({
      reports: [],

      addReport: (data) => {
        const id = crypto.randomUUID()
        const report: Report = { ...data, id }
        set((s) => ({ reports: [report, ...s.reports] }))
        return id
      },

      deleteReport: (id) => set((s) => ({ reports: s.reports.filter((r) => r.id !== id) })),

      getReport: (id) => get().reports.find((r) => r.id === id),
    }),
    {
      name: 'vibe-reach:reports',
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
      // Drop any legacy reports that don't match the current schema
      onRehydrateStorage: () => (state) => {
        if (state) {
          const valid = state.reports.filter(isValidReport)
          if (valid.length !== state.reports.length) {
            state.reports = valid
          }
        }
      },
    },
  ),
)
