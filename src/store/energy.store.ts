import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { EnergyState } from '@core/types/energy.types'
import type { ActionCostKey } from '@core/types/energy.types'
import { energyService } from '@services/energy.service'
import { ACTION_COSTS } from '@core/constants/actions'
import { energyConfig } from '@config/energy.config'

interface EnergyStore extends EnergyState {
  consume: (action: ActionCostKey, customCost?: number) => boolean
  refill: (amount?: number) => void
  reset: () => void
  setInfinite: (infinite: boolean) => void
  canAfford: (action: ActionCostKey, customCost?: number) => boolean
  syncFromService: () => void
}

export const useEnergyStore = create<EnergyStore>()(
  persist(
    (set, get) => ({
      current: energyConfig.maxEnergy,
      max: energyConfig.maxEnergy,
      lastRefillTime: Date.now(),
      isInfinite: energyConfig.infiniteMode,
      totalConsumed: 0,
      sessionConsumed: 0,

      consume: (action, customCost) => {
        const result = energyService.consume(action, customCost)
        if (result.success) {
          set(energyService.getState())
        }
        return result.success
      },

      refill: (amount) => {
        energyService.refill(amount)
        set(energyService.getState())
      },

      reset: () => {
        energyService.reset()
        set(energyService.getState())
      },

      setInfinite: (infinite) => {
        energyService.setInfinite(infinite)
        set(energyService.getState())
      },

      canAfford: (action, customCost) => {
        const { current, isInfinite } = get()
        if (isInfinite) return true
        const cost = customCost ?? ACTION_COSTS[action]
        return current >= cost
      },

      syncFromService: () => {
        set(energyService.getState())
      },
    }),
    {
      name: 'sef:energy_state',
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
