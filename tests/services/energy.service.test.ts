import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EnergyService } from '@services/energy.service'

describe('EnergyService', () => {
  let service: EnergyService

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset singleton
    // @ts-expect-error access private for test isolation
    EnergyService['instance'] = undefined
    service = EnergyService.getInstance()
  })

  it('starts with maxEnergy after init', async () => {
    vi.mocked(chrome.storage.local.get).mockResolvedValueOnce({})
    await service.init()
    const state = service.getState()
    expect(state.current).toBe(state.max)
  })

  it('consume deducts energy for a valid action', async () => {
    vi.mocked(chrome.storage.local.get).mockResolvedValueOnce({})
    vi.mocked(chrome.storage.local.set).mockResolvedValueOnce(undefined)
    await service.init()
    const before = service.getState().current
    const result = await service.consume('click')
    expect(result.success).toBe(true)
    expect(service.getState().current).toBeLessThan(before)
  })

  it('consume fails when energy is insufficient', async () => {
    vi.mocked(chrome.storage.local.get).mockResolvedValueOnce({})
    vi.mocked(chrome.storage.local.set).mockResolvedValue(undefined)
    await service.init()

    // Drain energy to 0
    const state = service.getState()
    await service.consume('checkout', state.current + 1)
    const result = await service.consume('checkout', state.max + 9999)
    expect(result.success).toBe(false)
  })

  it('refill increases energy up to max', async () => {
    vi.mocked(chrome.storage.local.get).mockResolvedValueOnce({})
    vi.mocked(chrome.storage.local.set).mockResolvedValue(undefined)
    await service.init()

    // Deplete some energy
    await service.consume('scrape')
    const afterConsume = service.getState().current

    await service.refill(50)
    const afterRefill = service.getState().current
    expect(afterRefill).toBeGreaterThan(afterConsume)
  })

  it('setInfinite allows consume regardless of cost', async () => {
    vi.mocked(chrome.storage.local.get).mockResolvedValueOnce({})
    vi.mocked(chrome.storage.local.set).mockResolvedValue(undefined)
    await service.init()
    service.setInfinite(true)

    const result = await service.consume('checkout', 99999)
    expect(result.success).toBe(true)
  })

  it('canAfford returns false when energy too low', async () => {
    vi.mocked(chrome.storage.local.get).mockResolvedValueOnce({})
    vi.mocked(chrome.storage.local.set).mockResolvedValue(undefined)
    await service.init()
    expect(service.canAfford('checkout', 99999)).toBe(false)
  })

  it('onChange callback is called on state change', async () => {
    vi.mocked(chrome.storage.local.get).mockResolvedValueOnce({})
    vi.mocked(chrome.storage.local.set).mockResolvedValue(undefined)
    await service.init()

    const cb = vi.fn()
    const unsub = service.onChange(cb)
    await service.refill(10)
    expect(cb).toHaveBeenCalled()
    unsub()
  })
})
