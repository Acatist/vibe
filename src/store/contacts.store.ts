import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Contact, ContactCategory } from '@core/types/contact.types'

interface ContactsStore {
  contacts: Contact[]
  hasEverAddedContact: boolean
  hiddenMockContactIds: string[]
  addContacts: (contacts: Contact[]) => void
  addContact: (contact: Contact) => void
  updateContact: (id: string, updates: Partial<Contact>) => void
  deleteContact: (id: string) => void
  deleteContactsBatch: (ids: string[]) => void
  hideMockContact: (id: string) => void
  getByInvestigation: (investigationId: string) => Contact[]
  getByCategory: (category: ContactCategory) => Contact[]
}

export const useContactsStore = create<ContactsStore>()(
  persist(
    (set, get) => ({
      contacts: [],
      hasEverAddedContact: false,
      hiddenMockContactIds: [],

      addContacts: (newContacts) =>
        set((s) => {
          // Deduplicate by id, email (case-insensitive), AND domain (hostname)
          const existingIds = new Set(s.contacts.map((c) => c.id))
          const existingEmails = new Set(
            s.contacts.filter((c) => c.email).map((c) => c.email.toLowerCase().trim()),
          )
          const existingDomains = new Set(
            s.contacts
              .filter((c) => c.website)
              .map((c) => {
                try { return new URL(c.website).hostname } catch { return '' }
              })
              .filter(Boolean),
          )
          const fresh = newContacts.filter((nc) => {
            if (existingIds.has(nc.id)) return false
            if (nc.email && existingEmails.has(nc.email.toLowerCase().trim())) return false
            if (nc.website) {
              try {
                const h = new URL(nc.website).hostname
                if (existingDomains.has(h)) return false
              } catch { /* ignore invalid URL */ }
            }
            return true
          })
          return { contacts: [...s.contacts, ...fresh], hasEverAddedContact: true }
        }),

      addContact: (contact) =>
        set((s) => {
          // Prevent duplicate by email or domain
          if (
            contact.email &&
            s.contacts.some(
              (c) => c.email && c.email.toLowerCase().trim() === contact.email.toLowerCase().trim(),
            )
          ) {
            return s
          }
          if (contact.website) {
            try {
              const newHost = new URL(contact.website).hostname
              if (s.contacts.some((c) => {
                try { return c.website && new URL(c.website).hostname === newHost } catch { return false }
              })) return s
            } catch { /* ignore invalid URL */ }
          }
          return { contacts: [...s.contacts, contact], hasEverAddedContact: true }
        }),

      updateContact: (id, updates) =>
        set((s) => ({
          contacts: s.contacts.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        })),

      deleteContact: (id) =>
        set((s) => ({
          contacts: s.contacts.filter((c) => c.id !== id),
        })),

      deleteContactsBatch: (ids) => {
        const idSet = new Set(ids)
        set((s) => ({
          contacts: s.contacts.filter((c) => !idSet.has(c.id)),
        }))
      },

      hideMockContact: (id) =>
        set((s) => ({ hiddenMockContactIds: [...s.hiddenMockContactIds, id] })),

      getByInvestigation: (investigationId) =>
        get().contacts.filter((c) => c.investigationId === investigationId),

      getByCategory: (category) => get().contacts.filter((c) => c.category === category),
    }),
    {
      name: 'vibe-reach:contacts',
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
