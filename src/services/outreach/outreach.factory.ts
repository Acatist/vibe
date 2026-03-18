import type { OutreachService } from './outreach.interface'
import { SimulationOutreachService } from './outreach.simulation'
import { StagingOutreachService } from './outreach.staging'
import { ProductionOutreachService } from './outreach.production'
import { getMode } from '@services/runtime.service'

/**
 * Single factory entry point for the outreach service.
 *
 * Resolves the correct Strategy implementation based on the current
 * runtime mode.  The rest of the codebase never checks runtime — it
 * just calls `createOutreachService()`.
 */
let cached: OutreachService | null = null
let cachedMode: string | null = null

export function createOutreachService(): OutreachService {
  const mode = getMode()
  if (cached && cachedMode === mode) return cached

  switch (mode) {
    case 'simulation':
      cached = new SimulationOutreachService()
      break
    case 'staging':
      cached = new StagingOutreachService()
      break
    case 'production':
      cached = new ProductionOutreachService()
      break
  }
  cachedMode = mode
  return cached!
}
