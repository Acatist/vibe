import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  Investigation,
  InvestigationPlan,
  InvestigationStatus,
  ScrapeStatus,
} from '@core/types/investigation.types'
import type { ScrapeTarget } from '@core/types/ai.types'

/** Minimal campaign brief stored so AppShell can build Contact objects from scraping messages. */
export interface ActiveBrief {
  affinityCategory: string
  affinitySubcategory: string
  contactType: string
}

interface InvestigationStore {
  investigations: Investigation[]
  currentId: string | null
  lastAnalysisMarkdown: string
  /** Reason why the last scraping session ended (null = target reached / normal) */
  lastFinishReason: string | null

  // ── Live scraping state (not persisted) ──────────────────────────────────
  /** Brief stored when scraping starts so the global AppShell listener can build contacts. */
  activeBrief: ActiveBrief | null
  liveScrapingStatus: 'idle' | 'running' | 'paused'
  liveContactsFound: number
  liveCurrentUrl: string
  liveScrapingTotal: number
  livePagesScanned: number

  startInvestigation: (prompt: string, consistency: number) => string
  setPlan: (id: string, plan: InvestigationPlan) => void
  approvePlan: (id: string) => void
  setStatus: (id: string, status: InvestigationStatus) => void
  setError: (id: string, error: string) => void
  addContactIds: (id: string, contactIds: string[]) => void
  completeInvestigation: (id: string) => void
  getCurrent: () => Investigation | null
  setLastAnalysisMarkdown: (md: string) => void
  setLastFinishReason: (reason: string | null) => void
  setTargetUrls: (id: string, urls: ScrapeTarget[]) => void
  setScrapeStatus: (id: string, status: ScrapeStatus) => void
  setScrapeProgress: (id: string, current: number, total: number) => void
  /** Store the active brief before scraping starts so AppShell can build Contact objects. */
  setActiveBrief: (brief: ActiveBrief | null) => void
  /** Update live scraping progress (called from AppShell message listener). */
  setLiveScrapingProgress: (payload: {
    status: 'running' | 'paused'
    contactsFound: number
    currentUrl: string
    total: number
    pagesScanned?: number
  }) => void
  /** Reset live scraping state when scraping finishes or errors. */
  setLiveScrapingDone: () => void
}

export const useInvestigationStore = create<InvestigationStore>()(
  persist(
    (set, get) => ({
      investigations: [],
      currentId: null,
      lastAnalysisMarkdown: '',
      lastFinishReason: null,
      activeBrief: null,
      liveScrapingStatus: 'idle',
      liveContactsFound: 0,
      liveCurrentUrl: '',
      liveScrapingTotal: 0,
      livePagesScanned: 0,

      setLastAnalysisMarkdown: (md) => set({ lastAnalysisMarkdown: md }),
      setLastFinishReason: (reason) => set({ lastFinishReason: reason }),
      setActiveBrief: (brief) => set({ activeBrief: brief }),
      setLiveScrapingProgress: ({ status, contactsFound, currentUrl, total, pagesScanned }) =>
        set({
          liveScrapingStatus: status,
          liveContactsFound: contactsFound,
          liveCurrentUrl: currentUrl,
          liveScrapingTotal: total,
          livePagesScanned: pagesScanned ?? 0,
        }),
      setLiveScrapingDone: () =>
        set({
          liveScrapingStatus: 'idle',
          liveContactsFound: 0,
          liveCurrentUrl: '',
          liveScrapingTotal: 0,
          livePagesScanned: 0,
        }),

      startInvestigation: (prompt, consistency) => {
        const id = crypto.randomUUID()
        const investigation: Investigation = {
          id,
          prompt,
          consistency,
          status: 'analyzing',
          plan: null,
          contactIds: [],
          createdAt: Date.now(),
          completedAt: null,
          error: null,
          targetUrls: [],
          scrapeStatus: 'idle',
          scrapeProgress: { current: 0, total: 0 },
        }
        set((s) => ({
          investigations: [investigation, ...s.investigations],
          currentId: id,
        }))
        return id
      },

      setPlan: (id, plan) =>
        set((s) => ({
          investigations: s.investigations.map((inv) =>
            inv.id === id ? { ...inv, plan, status: 'planned' as const } : inv,
          ),
        })),

      approvePlan: (id) =>
        set((s) => ({
          investigations: s.investigations.map((inv) =>
            inv.id === id && inv.plan
              ? { ...inv, plan: { ...inv.plan, approved: true }, status: 'executing' as const }
              : inv,
          ),
        })),

      setStatus: (id, status) =>
        set((s) => ({
          investigations: s.investigations.map((inv) => (inv.id === id ? { ...inv, status } : inv)),
        })),

      setError: (id, error) =>
        set((s) => ({
          investigations: s.investigations.map((inv) =>
            inv.id === id ? { ...inv, error, status: 'error' as const } : inv,
          ),
        })),

      addContactIds: (id, contactIds) =>
        set((s) => ({
          investigations: s.investigations.map((inv) =>
            inv.id === id ? { ...inv, contactIds: [...inv.contactIds, ...contactIds] } : inv,
          ),
        })),

      completeInvestigation: (id) =>
        set((s) => ({
          investigations: s.investigations.map((inv) =>
            inv.id === id ? { ...inv, status: 'complete' as const, completedAt: Date.now() } : inv,
          ),
        })),

      getCurrent: () => {
        const { investigations, currentId } = get()
        return investigations.find((inv) => inv.id === currentId) ?? null
      },

      setTargetUrls: (id, urls) =>
        set((s) => ({
          investigations: s.investigations.map((inv) =>
            inv.id === id ? { ...inv, targetUrls: urls } : inv,
          ),
        })),

      setScrapeStatus: (id, status) =>
        set((s) => ({
          investigations: s.investigations.map((inv) =>
            inv.id === id ? { ...inv, scrapeStatus: status } : inv,
          ),
        })),

      setScrapeProgress: (id, current, total) =>
        set((s) => ({
          investigations: s.investigations.map((inv) =>
            inv.id === id ? { ...inv, scrapeProgress: { current, total } } : inv,
          ),
        })),
    }),
    {
      name: 'vibe-reach:investigation',
      partialize: (state) => {
        // Live scraping state and activeBrief are transient — don't persist them.
        const {
          activeBrief: _ab,
          liveScrapingStatus: _ls,
          liveContactsFound: _lc,
          liveCurrentUrl: _lu,
          liveScrapingTotal: _lt,
          livePagesScanned: _lp,
          ...rest
        } = state
        return rest
      },
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
