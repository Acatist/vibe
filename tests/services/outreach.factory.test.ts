import { describe, it, expect, beforeEach } from 'vitest'
import { createOutreachService } from '@services/outreach'
import { SimulationOutreachService } from '@services/outreach/outreach.simulation'
import { StagingOutreachService } from '@services/outreach/outreach.staging'
import { ProductionOutreachService } from '@services/outreach/outreach.production'
import { useRuntimeStore } from '@store/runtime.store'

describe('OutreachFactory', () => {
  beforeEach(() => {
    useRuntimeStore.setState({ mode: 'simulation' })
  })

  it('returns SimulationOutreachService in simulation mode', () => {
    const service = createOutreachService()
    expect(service).toBeInstanceOf(SimulationOutreachService)
  })

  it('returns StagingOutreachService in staging mode', () => {
    useRuntimeStore.setState({ mode: 'staging' })
    const service = createOutreachService()
    expect(service).toBeInstanceOf(StagingOutreachService)
  })

  it('returns ProductionOutreachService in production mode', () => {
    useRuntimeStore.setState({ mode: 'production' })
    const service = createOutreachService()
    expect(service).toBeInstanceOf(ProductionOutreachService)
  })
})
