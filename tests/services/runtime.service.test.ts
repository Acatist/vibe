import { describe, it, expect, beforeEach } from 'vitest'
import {
  getMode,
  getCapabilities,
  isSimulation,
  isStaging,
  isProduction,
  getLogPrefix,
} from '@services/runtime.service'
import { useRuntimeStore } from '@store/runtime.store'

describe('RuntimeService', () => {
  beforeEach(() => {
    // Reset the store to default (simulation)
    useRuntimeStore.setState({ mode: 'simulation' })
  })

  it('defaults to simulation mode', () => {
    expect(getMode()).toBe('simulation')
  })

  it('isSimulation returns true in simulation mode', () => {
    expect(isSimulation()).toBe(true)
    expect(isStaging()).toBe(false)
    expect(isProduction()).toBe(false)
  })

  it('returns correct capabilities for simulation', () => {
    const caps = getCapabilities()
    expect(caps.canSendEmail).toBe(false)
    expect(caps.canSubmitForm).toBe(false)
    expect(caps.canPostExternal).toBe(false)
    expect(caps.canScrapeReal).toBe(false)
    expect(caps.enableStealth).toBe(false)
    expect(caps.logPrefix).toBe('SIMULATION')
  })

  it('switches to staging mode', () => {
    useRuntimeStore.setState({ mode: 'staging' })
    expect(getMode()).toBe('staging')
    expect(isStaging()).toBe(true)
    expect(isSimulation()).toBe(false)
    const caps = getCapabilities()
    expect(caps.canSendEmail).toBe(true)
    expect(caps.enableRateLimiting).toBe(true)
    expect(caps.logPrefix).toBe('STAGING')
  })

  it('switches to production mode', () => {
    useRuntimeStore.setState({ mode: 'production' })
    expect(getMode()).toBe('production')
    expect(isProduction()).toBe(true)
    const caps = getCapabilities()
    expect(caps.canSendEmail).toBe(true)
    expect(caps.canSubmitForm).toBe(true)
    expect(caps.canPostExternal).toBe(true)
    expect(caps.logPrefix).toBe('PRODUCTION')
  })

  it('getLogPrefix returns correct prefix', () => {
    expect(getLogPrefix()).toBe('SIMULATION')
    useRuntimeStore.setState({ mode: 'production' })
    expect(getLogPrefix()).toBe('PRODUCTION')
  })
})
