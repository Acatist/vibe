import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Campaign, CampaignStatus, OutreachMessage } from '@core/types/campaign.types'

interface CampaignStore {
  campaigns: Campaign[]

  createCampaign: (
    campaign: Omit<Campaign, 'id' | 'createdAt' | 'startedAt' | 'completedAt'>,
  ) => string
  updateCampaignStatus: (id: string, status: CampaignStatus) => void
  setMessages: (id: string, messages: OutreachMessage[]) => void
  updateMessageStatus: (
    campaignId: string,
    contactId: string,
    status: OutreachMessage['status'],
    error?: string,
  ) => void
  startCampaign: (id: string) => void
  completeCampaign: (id: string) => void
  getCampaign: (id: string) => Campaign | undefined
  deleteCampaign: (id: string) => void
  clearAllCampaigns: () => void
}

export const useCampaignStore = create<CampaignStore>()(
  persist(
    (set, get) => ({
      campaigns: [],

      createCampaign: (data) => {
        const id = crypto.randomUUID()
        const campaign: Campaign = {
          ...data,
          id,
          createdAt: Date.now(),
          startedAt: null,
          completedAt: null,
        }
        set((s) => ({ campaigns: [campaign, ...s.campaigns] }))
        return id
      },

      updateCampaignStatus: (id, status) =>
        set((s) => ({
          campaigns: s.campaigns.map((c) => (c.id === id ? { ...c, status } : c)),
        })),

      setMessages: (id, messages) =>
        set((s) => ({
          campaigns: s.campaigns.map((c) => (c.id === id ? { ...c, messages } : c)),
        })),

      updateMessageStatus: (campaignId, contactId, status, error) =>
        set((s) => ({
          campaigns: s.campaigns.map((c) =>
            c.id === campaignId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.contactId === contactId
                      ? {
                          ...m,
                          status,
                          sentAt: status === 'sent' ? Date.now() : m.sentAt,
                          error: error ?? null,
                        }
                      : m,
                  ),
                }
              : c,
          ),
        })),

      startCampaign: (id) =>
        set((s) => ({
          campaigns: s.campaigns.map((c) =>
            c.id === id ? { ...c, status: 'running' as const, startedAt: Date.now() } : c,
          ),
        })),

      completeCampaign: (id) =>
        set((s) => ({
          campaigns: s.campaigns.map((c) =>
            c.id === id ? { ...c, status: 'completed' as const, completedAt: Date.now() } : c,
          ),
        })),

      getCampaign: (id) => get().campaigns.find((c) => c.id === id),

      deleteCampaign: (id) => set((s) => ({ campaigns: s.campaigns.filter((c) => c.id !== id) })),

      clearAllCampaigns: () => set({ campaigns: [] }),
    }),
    {
      name: 'vibe-reach:campaigns',
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
