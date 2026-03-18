import type { ScrapingService } from './scraping.interface'
import { SimulationScrapingService } from './scraping.simulation'
import { StagingScrapingService } from './scraping.staging'
import { ProductionScrapingService } from './scraping.production'
import { getMode } from '@services/runtime.service'

let cached: ScrapingService | null = null
let cachedMode: string | null = null

/**
 * Single factory entry point for the scraping service.
 */
export function createScrapingService(): ScrapingService {
  const mode = getMode()
  if (cached && cachedMode === mode) return cached

  switch (mode) {
    case 'simulation':
      cached = new SimulationScrapingService()
      break
    case 'staging':
      cached = new StagingScrapingService()
      break
    case 'production':
      cached = new ProductionScrapingService()
      break
  }
  cachedMode = mode
  return cached!
}
