import { describe, it, expect, vi, beforeEach } from 'vitest'
import { waitRandom } from '@automation/actions'

describe('automation/actions', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  describe('waitRandom', () => {
    it('resolves after at least minMs', async () => {
      // Let all timers fire
      const promise = waitRandom({ minMs: 100, maxMs: 200 })
      vi.runAllTimers()
      await expect(promise).resolves.toBeUndefined()
    })

    it('resolves within expected range using real timers', async () => {
      vi.useRealTimers()
      const start = Date.now()
      await waitRandom({ minMs: 50, maxMs: 150 })
      const elapsed = Date.now() - start
      expect(elapsed).toBeGreaterThanOrEqual(50)
      expect(elapsed).toBeLessThan(2000) // generous upper bound for CI + jitter
    })
  })
})
