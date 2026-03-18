import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Contact, ContactCategory } from '@core/types/contact.types'

interface ContactsStore {
  contacts: Contact[]
  addContacts: (contacts: Contact[]) => void
  addContact: (contact: Contact) => void
  updateContact: (id: string, updates: Partial<Contact>) => void
  deleteContact: (id: string) => void
  getByInvestigation: (investigationId: string) => Contact[]
  getByCategory: (category: ContactCategory) => Contact[]
}

export const useContactsStore = create<ContactsStore>()(
  persist(
    (set, get) => ({
      contacts: [],

      addContacts: (newContacts) =>
        set((s) => ({
          contacts: [
            ...s.contacts,
            ...newContacts.filter((nc) => !s.contacts.some((c) => c.id === nc.id)),
          ],
        })),

      addContact: (contact) =>
        set((s) => ({
          contacts: [...s.contacts, contact],
        })),

      updateContact: (id, updates) =>
        set((s) => ({
          contacts: s.contacts.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        })),

      deleteContact: (id) =>
        set((s) => ({
          contacts: s.contacts.filter((c) => c.id !== id),
        })),

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
