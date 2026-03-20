import { create } from 'zustand'
import type { EnergyState } from '@core/types/energy.types'
import type { ActionCostKey } from '@core/types/energy.types'
import { messageService } from '@services/message.service'
import { MessageType } from '@core/types/message.types'
import { ACTION_COSTS } from '@core/constants/actions'
import { energyConfig } from '@config/energy.config'

/**
 * EnergyStore — UI cache for energy state.
 *
 * The background service worker's EnergyService is the single source of truth.
 * This store is populated/updated via:
 *   1. An ENERGY_GET request on mount (see useEnergy hook)
 *   2. SCRAPING_PROGRESS broadcasts (energyLeft field) handled in AppShell
 *
 * Mutations (refill / reset / setInfinite) optimistically update local state
 * AND send the corresponding message to the background so it stays in sync.
 * No persist middleware — the background already persists the authoritative state.
 */

interface EnergyStore extends EnergyState {
  consume: (action: ActionCostKey, customCost?: number) => boolean
  refill: (amount?: number) => void
  reset: () => void
  setInfinite: (infinite: boolean) => void
  canAfford: (action: ActionCostKey, customCost?: number) => boolean
  /** @deprecated kept for interface compat — real sync goes through AppShell / useEnergy */
  syncFromService: () => void
}

/** Helper: re-sync from background after a mutation resolves. */
function _syncFromBackground(): void {
  messageService
    .send(MessageType.ENERGY_GET, undefined)
    .then((res) => {
      if (res?.success && res.data) {
        const d = res.data as EnergyState
        // Guard: only apply fields that are valid numbers / booleans to avoid
        // clobbering the store with undefined if the background returns partial data.
        const patch: Partial<EnergyState> = {}
        if (typeof d.current === 'number') patch.current = d.current
        if (typeof d.max === 'number') patch.max = d.max
        if (typeof d.isInfinite === 'boolean') patch.isInfinite = d.isInfinite
        if (Object.keys(patch).length > 0) useEnergyStore.setState(patch)
      }
    })
    .catch(() => {})
}

export const useEnergyStore = create<EnergyStore>()((set, get) => ({
  current: energyConfig.maxEnergy,
  max: energyConfig.maxEnergy,
  lastRefillTime: Date.now(),
  isInfinite: energyConfig.infiniteMode,
  totalConsumed: 0,
  sessionConsumed: 0,

  consume: (action, customCost) => {
    const { current, isInfinite } = get()
    if (isInfinite) return true
    const cost = customCost ?? ACTION_COSTS[action]
    if (current < cost) return false
    // Optimistic local update
    set((s) => ({
      current: s.current - cost,
      totalConsumed: s.totalConsumed + cost,
      sessionConsumed: s.sessionConsumed + cost,
    }))
    // Sync background
    messageService
      .send(MessageType.ENERGY_CONSUME, { action, amount: cost })
      .then(() => _syncFromBackground())
      .catch(() => {})
    return true
  },

  refill: (amount) => {
    // Compute explicit amount before sending — JSON.stringify drops undefined,
    // so sending { amount: undefined } would cause the background to only refill
    // by config.refillAmount (100) instead of filling to max.
    const { current, max } = get()
    const fillAmount = amount ?? max - current
    set({ current: Math.min(current + fillAmount, max) })
    messageService
      .send(MessageType.ENERGY_REFILL, { amount: fillAmount })
      .then(() => _syncFromBackground())
      .catch(() => {})
  },

  reset: () => {
    set((s) => ({ current: s.max }))
    messageService
      .send(MessageType.ENERGY_RESET, undefined)
      .then(() => _syncFromBackground())
      .catch(() => {})
  },

  setInfinite: (infinite) => {
    set({ isInfinite: infinite })
    messageService.send(MessageType.ENERGY_SET_INFINITE, { infinite }).catch(() => {})
  },

  canAfford: (action, customCost) => {
    const { current, isInfinite } = get()
    if (isInfinite) return true
    const cost = customCost ?? ACTION_COSTS[action]
    return current >= cost
  },

  syncFromService: () => {
    // No-op — sync is driven by AppShell (SCRAPING_PROGRESS) and useEnergy (mount)
  },
}))
