import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface BusinessProfile {
  logoDataUrl: string // base64 data-url, max 512×512 resized on upload
  companyName: string
  nif: string
  address: string
  phone: string
  email: string
}

interface BusinessStore extends BusinessProfile {
  setLogo: (dataUrl: string) => void
  setCompanyName: (v: string) => void
  setNif: (v: string) => void
  setAddress: (v: string) => void
  setPhone: (v: string) => void
  setEmail: (v: string) => void
}

export const useBusinessStore = create<BusinessStore>()(
  persist(
    (set) => ({
      logoDataUrl: '',
      companyName: '',
      nif: '',
      address: '',
      phone: '',
      email: '',

      setLogo: (logoDataUrl) => set({ logoDataUrl }),
      setCompanyName: (companyName) => set({ companyName }),
      setNif: (nif) => set({ nif }),
      setAddress: (address) => set({ address }),
      setPhone: (phone) => set({ phone }),
      setEmail: (email) => set({ email }),
    }),
    {
      name: 'vibe-reach:business',
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
