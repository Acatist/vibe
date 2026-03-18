import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { AIProviderType } from '@core/types/ai.types'

export const DEFAULT_MODELS: Record<AIProviderType, string> = {
  openai: 'gpt-4o-mini',
  grok: 'grok-3-mini',
  google: 'gemini-2.0-flash',
}

export const AVAILABLE_MODELS: Record<AIProviderType, { value: string; label: string }[]> = {
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4o-mini', label: 'GPT-4o mini' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-4', label: 'GPT-4' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
    { value: 'o1', label: 'o1' },
    { value: 'o1-mini', label: 'o1-mini' },
    { value: 'o3-mini', label: 'o3-mini' },
  ],
  grok: [
    { value: 'grok-3', label: 'Grok 3' },
    { value: 'grok-3-mini', label: 'Grok 3 mini' },
    { value: 'grok-2', label: 'Grok 2' },
    { value: 'grok-2-mini', label: 'Grok 2 mini' },
  ],
  google: [
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    { value: 'gemini-2.0-pro', label: 'Gemini 2.0 Pro' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  ],
}

export const PROVIDER_LABELS: Record<AIProviderType, string> = {
  openai: 'OpenAI',
  grok: 'Grok (xAI)',
  google: 'Google AI',
}

export const PROVIDER_ICONS: Record<AIProviderType, string> = {
  openai: '🤖',
  grok: '⚡',
  google: '🔵',
}

// Per-provider config entry
export interface AIProviderConfig {
  provider: AIProviderType
  apiKey: string
  model: string
  enabled: boolean
  status: 'untested' | 'connected' | 'failed'
  priority: number // 0 = primary; higher = fallback
}

interface AIStore {
  configs: AIProviderConfig[]
  activeProvider: AIProviderType

  // Multi-provider actions
  upsertConfig: (cfg: Omit<AIProviderConfig, 'priority'> & { priority?: number }) => void
  removeConfig: (provider: AIProviderType) => void
  setConfigStatus: (provider: AIProviderType, status: AIProviderConfig['status']) => void
  reorderConfig: (provider: AIProviderType, direction: 'up' | 'down') => void
  setActiveProvider: (provider: AIProviderType) => void

  // Legacy single-provider setters (backward-compat)
  setProvider: (provider: AIProviderType) => void
  setApiKey: (key: string) => void
  setModel: (model: string) => void
  setConnectionStatus: (status: 'untested' | 'connected' | 'failed') => void
}

function sorted(cfgs: AIProviderConfig[]): AIProviderConfig[] {
  return [...cfgs].sort((a, b) => a.priority - b.priority)
}

const DEFAULT_CONFIGS: AIProviderConfig[] = [
  {
    provider: 'openai',
    apiKey: '',
    model: 'gpt-4o-mini',
    enabled: true,
    status: 'untested',
    priority: 0,
  },
]

export const useAIStore = create<AIStore>()(
  persist(
    (set, get) => ({
      configs: DEFAULT_CONFIGS,
      activeProvider: 'openai',

      upsertConfig: (incoming) =>
        set((s) => {
          const exists = s.configs.find((c) => c.provider === incoming.provider)
          const priority = incoming.priority ?? exists?.priority ?? s.configs.length
          const entry: AIProviderConfig = {
            ...incoming,
            priority,
            status: incoming.status ?? exists?.status ?? 'untested',
          }
          const next = exists
            ? s.configs.map((c) => (c.provider === incoming.provider ? entry : c))
            : sorted([...s.configs, entry])
          return { configs: next }
        }),

      removeConfig: (provider) =>
        set((s) => {
          const next = s.configs.filter((c) => c.provider !== provider)
          const active =
            s.activeProvider === provider
              ? (next.find((c) => c.enabled)?.provider ?? next[0]?.provider ?? 'openai')
              : s.activeProvider
          return { configs: next, activeProvider: active }
        }),

      setConfigStatus: (provider, status) =>
        set((s) => ({
          configs: s.configs.map((c) => (c.provider === provider ? { ...c, status } : c)),
        })),

      reorderConfig: (provider, direction) =>
        set((s) => {
          const arr = sorted(s.configs)
          const idx = arr.findIndex((c) => c.provider === provider)
          const swap = direction === 'up' ? idx - 1 : idx + 1
          if (idx === -1 || swap < 0 || swap >= arr.length) return {}
          ;[arr[idx].priority, arr[swap].priority] = [arr[swap].priority, arr[idx].priority]
          return { configs: sorted(arr) }
        }),

      setActiveProvider: (activeProvider) => set({ activeProvider }),

      // Legacy shims
      setProvider: (provider) => {
        const { configs, upsertConfig } = get()
        if (!configs.find((c) => c.provider === provider)) {
          upsertConfig({
            provider,
            apiKey: '',
            model: DEFAULT_MODELS[provider],
            enabled: true,
            status: 'untested',
          })
        }
        set({ activeProvider: provider })
      },
      setApiKey: (apiKey) =>
        set((s) => ({
          configs: s.configs.map((c) =>
            c.provider === s.activeProvider ? { ...c, apiKey, status: 'untested' } : c,
          ),
        })),
      setModel: (model) =>
        set((s) => ({
          configs: s.configs.map((c) => (c.provider === s.activeProvider ? { ...c, model } : c)),
        })),
      setConnectionStatus: (status) =>
        set((s) => ({
          configs: s.configs.map((c) => (c.provider === s.activeProvider ? { ...c, status } : c)),
        })),
    }),
    {
      name: 'vibe-reach:ai',
      storage: createJSONStorage(() => ({
        getItem: async (key) => {
          const r = await chrome.storage.local.get(key)
          return (r[key] as string | null) ?? null
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

/** Selector: returns the active provider config, always fresh. */
export const selectActiveConfig = (s: {
  configs: AIProviderConfig[]
  activeProvider: AIProviderType
}) => s.configs.find((c) => c.provider === s.activeProvider)

/** Selector: returns the active provider's API key, always fresh. */
export const selectApiKey = (s: { configs: AIProviderConfig[]; activeProvider: AIProviderType }) =>
  s.configs.find((c) => c.provider === s.activeProvider)?.apiKey ?? ''
