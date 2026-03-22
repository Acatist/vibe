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
          // Deduplicate by id and form-centric signature:
          // contactFormUrl + organization + name (normalized).
          // Two people from the same org with different forms are NOT duplicates.
          const existingIds = new Set(s.contacts.map((c) => c.id))
          const existingSignatures = new Set(
            s.contacts.map((c) => {
              const form = (c.contactFormUrl ?? '').toLowerCase().replace(/\/+$/, '')
              const org = c.organization.toLowerCase().trim()
              const name = c.name.toLowerCase().trim()
              return `${form}||${org}||${name}`
            }),
          )
          const fresh = newContacts.filter((nc) => {
            if (existingIds.has(nc.id)) return false
            const form = (nc.contactFormUrl ?? '').toLowerCase().replace(/\/+$/, '')
            const org = nc.organization.toLowerCase().trim()
            const name = nc.name.toLowerCase().trim()
            if (existingSignatures.has(`${form}||${org}||${name}`)) return false
            return true
          })
          return { contacts: [...s.contacts, ...fresh], hasEverAddedContact: true }
        }),

      addContact: (contact) =>
        set((s) => {
          // Prevent duplicate by form-centric signature
          const newForm = (contact.contactFormUrl ?? '').toLowerCase().replace(/\/+$/, '')
          const newOrg = contact.organization.toLowerCase().trim()
          const newName = contact.name.toLowerCase().trim()
          const newSig = `${newForm}||${newOrg}||${newName}`
          if (s.contacts.some((c) => {
            const form = (c.contactFormUrl ?? '').toLowerCase().replace(/\/+$/, '')
            const org = c.organization.toLowerCase().trim()
            const name = c.name.toLowerCase().trim()
            return `${form}||${org}||${name}` === newSig
          })) {
            return s
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
