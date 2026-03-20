import { useEffect } from 'react'
import { useEnergyStore } from '@store/energy.store'
import { messageService } from '@services/message.service'
import { MessageType } from '@core/types/message.types'
import type { ActionCostKey } from '@core/types/energy.types'
import type { EnergyState } from '@core/types/energy.types'

/**
 * useEnergy — Hook for reading energy state and performing energy transactions.
 *
 * Syncs the real energy level from the background SW on mount so the ring/bar
 * always shows the accurate value (not the default 100%).
 * Live updates during scraping come via AppShell's SCRAPING_PROGRESS handler.
 *
 * Usage:
 *   const { energy, consume, canAfford, isInfinite, reset } = useEnergy()
 */
export function useEnergy() {
  const { current, max, isInfinite, consume, refill, reset, setInfinite, canAfford } =
    useEnergyStore()

  // Fetch the real energy state from the background SW on mount.
  // The local store starts at energyConfig.maxEnergy (default) — without this sync
  // the ring/bar would always show 100% until a scraping broadcast arrives.
  useEffect(() => {
    messageService
      .send(MessageType.ENERGY_GET, undefined)
      .then((result) => {
        if (result?.success && result.data) {
          const d = result.data as EnergyState
          const patch: Partial<EnergyState> = {}
          if (typeof d.current === 'number') patch.current = d.current
          if (typeof d.max === 'number') patch.max = d.max
          if (typeof d.isInfinite === 'boolean') patch.isInfinite = d.isInfinite
          if (Object.keys(patch).length > 0) useEnergyStore.setState(patch)
        }
      })
      .catch(() => {})
  }, [])

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
