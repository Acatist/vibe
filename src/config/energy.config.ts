import type { EnergyConfig } from '@core/types/energy.types'

/**
 * Energy system configuration.
 * Controls quotas, refill rates, and developer modes.
 */
export const energyConfig: EnergyConfig = {
  maxEnergy: 1000,
  refillAmount: 100, // energy restored per interval
  refillInterval: 60 * 60 * 1000, // 1 hour in ms
  infiniteMode: false,
  debugMode: false,
  persistState: true,
}
