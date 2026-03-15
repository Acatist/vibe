import { useEffect } from 'react'
import { useEnergyStore } from '@store/energy.store'
import { energyService } from '@services/energy.service'
import type { ActionCostKey } from '@core/types/energy.types'

/**
 * useEnergy — Hook for reading energy state and performing energy transactions.
 *
 * Usage:
 *   const { energy, consume, canAfford, isInfinite, reset } = useEnergy()
 *
 *   const ok = consume('click')
 *   if (!ok) toast.error('Not enough energy!')
 */
export function useEnergy() {
  const {
    current,
    max,
    isInfinite,
    consume,
    refill,
    reset,
    setInfinite,
    canAfford,
    syncFromService,
  } = useEnergyStore()

  // Subscribe to EnergyService changes from other contexts (e.g., background)
  useEffect(() => {
    const unsubscribe = energyService.onChange(() => {
      syncFromService()
    })
    return unsubscribe
  }, [syncFromService])

  return {
    energy: { current, max, isInfinite },
    energyPercent: max > 0 ? Math.round((current / max) * 100) : 0,
    consume,
    refill,
    reset,
    setInfinite,
    canAfford: (action: ActionCostKey, customCost?: number) => canAfford(action, customCost),
    isInfinite,
  }
}
