import { describe, it, expect, beforeEach } from 'vitest'
import { createScrapingService } from '@services/scraping'
import { SimulationScrapingService } from '@services/scraping/scraping.simulation'
import { StagingScrapingService } from '@services/scraping/scraping.staging'
import { ProductionScrapingService } from '@services/scraping/scraping.production'
import { useRuntimeStore } from '@store/runtime.store'

describe('ScrapingFactory', () => {
  beforeEach(() => {
    useRuntimeStore.setState({ mode: 'simulation' })
  })

  it('returns SimulationScrapingService in simulation mode', () => {
    const service = createScrapingService()
    expect(service).toBeInstanceOf(SimulationScrapingService)
  })

  it('returns StagingScrapingService in staging mode', () => {
    useRuntimeStore.setState({ mode: 'staging' })
    const service = createScrapingService()
    expect(service).toBeInstanceOf(StagingScrapingService)
  })

  it('returns ProductionScrapingService in production mode', () => {
    useRuntimeStore.setState({ mode: 'production' })
    const service = createScrapingService()
    expect(service).toBeInstanceOf(ProductionScrapingService)
  })
})
