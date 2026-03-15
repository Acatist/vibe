import { describe, it, expect, vi, beforeEach } from 'vitest'
import { StorageService } from '@services/storage.service'

describe('StorageService', () => {
  let service: StorageService

  beforeEach(() => {
    vi.clearAllMocks()
    // @ts-expect-error reset singleton for isolation
    StorageService['instance'] = undefined
    service = StorageService.getInstance()
  })

  it('get returns defaultValue when storage is empty', async () => {
    vi.mocked(chrome.storage.local.get).mockResolvedValueOnce({})
    const result = await service.get('some-key', 42)
    expect(result).toBe(42)
  })

  it('get returns stored value when present', async () => {
    vi.mocked(chrome.storage.local.get).mockResolvedValueOnce({ 'some-key': 99 })
    const result = await service.get<number>('some-key', 0)
    expect(result).toBe(99)
  })

  it('set calls chrome.storage.local.set with correct key/value', async () => {
    vi.mocked(chrome.storage.local.set).mockResolvedValueOnce(undefined)
    await service.set('my-key', { foo: 'bar' })
    expect(chrome.storage.local.set).toHaveBeenCalledWith({ 'my-key': { foo: 'bar' } })
  })

  it('remove calls chrome.storage.local.remove', async () => {
    vi.mocked(chrome.storage.local.remove).mockResolvedValueOnce(undefined)
    await service.remove('my-key')
    expect(chrome.storage.local.remove).toHaveBeenCalledWith('my-key')
  })

  it('onChange registers a listener and returns an unsubscribe function', () => {
    const callback = vi.fn()
    const unsubscribe = service.onChange('my-key', callback)
    expect(chrome.storage.onChanged.addListener).toHaveBeenCalled()
    expect(typeof unsubscribe).toBe('function')
    unsubscribe()
    expect(chrome.storage.onChanged.removeListener).toHaveBeenCalled()
  })
})
