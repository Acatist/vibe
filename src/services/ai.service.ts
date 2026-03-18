import { createAIProvider, type AIProvider } from '@/providers/ai'
import { useAIStore } from '@store/ai.store'
import type { AIProviderType } from '@core/types/ai.types'

// Per-provider cache
const providerCache = new Map<string, AIProvider>()

function cacheKey(provider: AIProviderType, apiKey: string, model: string) {
  return `${provider}:${model}:${apiKey.slice(-8)}`
}

function getProvider(provider: AIProviderType, apiKey: string, model: string): AIProvider {
  const key = cacheKey(provider, apiKey, model)
  let p = providerCache.get(key)
  if (!p) {
    p = createAIProvider(provider, apiKey, model)
    providerCache.set(key, p)
  }
  return p
}

/**
 * Returns the active provider. Falls back through the priority-sorted list
 * when the active provider has status 'failed' or no apiKey.
 */
export function getAIProvider(): AIProvider {
  const { configs, activeProvider, setActiveProvider } = useAIStore.getState()
  const sorted = [...configs].sort((a, b) => a.priority - b.priority)

  // Try active first
  const active = configs.find((c) => c.provider === activeProvider)
  if (active?.apiKey && active.status !== 'failed') {
    return getProvider(active.provider, active.apiKey, active.model)
  }

  // Failover: pick first enabled with a key that isn't failed
  const fallback = sorted.find(
    (c) => c.enabled && c.apiKey && c.status !== 'failed' && c.provider !== activeProvider,
  )
  if (fallback) {
    setActiveProvider(fallback.provider)
    return getProvider(fallback.provider, fallback.apiKey, fallback.model)
  }

  // Last resort: just use whatever is primary regardless of status
  const primary = sorted[0]
  return getProvider(primary.provider, primary.apiKey, primary.model)
}

/**
 * Test a specific provider config and update its status in the store.
 */
export async function testAIConnection(provider?: AIProviderType): Promise<boolean> {
  const { configs, activeProvider, setConfigStatus } = useAIStore.getState()
  const target = provider ?? activeProvider
  const cfg = configs.find((c) => c.provider === target)
  if (!cfg?.apiKey) {
    setConfigStatus(target, 'failed')
    return false
  }
  const p = createAIProvider(cfg.provider, cfg.apiKey, cfg.model)
  const result = await p.testConnection()
  setConfigStatus(target, result.success ? 'connected' : 'failed')
  return result.success
}

/**
 * Called when a provider returns an error during operation.
 * Marks it failed and auto-switches to next available provider.
 */
export function markProviderFailed(provider: AIProviderType): void {
  const { configs, setConfigStatus, setActiveProvider } = useAIStore.getState()
  setConfigStatus(provider, 'failed')
  const sorted = [...configs].sort((a, b) => a.priority - b.priority)
  const next = sorted.find(
    (c) => c.enabled && c.apiKey && c.status !== 'failed' && c.provider !== provider,
  )
  if (next) setActiveProvider(next.provider)
}
