import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface DomainMemoryRecord {
  domain: string
  contactsDiscovered: number
  outreachAttempted: number
  formSubmissions: number
  emailsOpened: number
  lastContactDate: number
}

interface DomainMemoryStore {
  records: Record<string, DomainMemoryRecord>
  upsertDomain: (domain: string, partial: Partial<Omit<DomainMemoryRecord, 'domain'>>) => void
  getDomain: (domain: string) => DomainMemoryRecord | null
  incrementField: (domain: string, field: keyof Pick<DomainMemoryRecord, 'contactsDiscovered' | 'outreachAttempted' | 'formSubmissions' | 'emailsOpened'>) => void
  getAll: () => DomainMemoryRecord[]
  clearMemory: () => void
}

function normalizeDomain(raw: string): string {
  try {
    return new URL(raw.startsWith('http') ? raw : `https://${raw}`).hostname.replace(/^www\./, '')
  } catch {
    return raw.toLowerCase().replace(/^www\./, '').trim()
  }
}

export const useDomainMemoryStore = create<DomainMemoryStore>()(
  persist(
    (set, get) => ({
      records: {},

      upsertDomain: (domain, partial) =>
        set((s) => {
          const key = normalizeDomain(domain)
          const existing = s.records[key] ?? {
            domain: key,
            contactsDiscovered: 0,
            outreachAttempted: 0,
            formSubmissions: 0,
            emailsOpened: 0,
            lastContactDate: 0,
          }
          return {
            records: {
              ...s.records,
              [key]: { ...existing, ...partial, domain: key },
            },
          }
        }),

      getDomain: (domain) => {
        const key = normalizeDomain(domain)
        return get().records[key] ?? null
      },

      incrementField: (domain, field) =>
        set((s) => {
          const key = normalizeDomain(domain)
          const existing = s.records[key] ?? {
            domain: key,
            contactsDiscovered: 0,
            outreachAttempted: 0,
            formSubmissions: 0,
            emailsOpened: 0,
            lastContactDate: 0,
          }
          return {
            records: {
              ...s.records,
              [key]: {
                ...existing,
                [field]: existing[field] + 1,
                lastContactDate: Date.now(),
              },
            },
          }
        }),

      getAll: () => Object.values(get().records),

      clearMemory: () => set({ records: {} }),
    }),
    {
      name: 'vibe-reach:domain-memory',
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
