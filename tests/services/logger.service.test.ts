import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Logger } from '@services/logger.service'

describe('Logger', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.spyOn(console, 'debug').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('prefixes messages with [SEF:context]', () => {
    const logger = Logger.create('test-ctx', 'debug')
    logger.info('hello world')
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[SEF:test-ctx]'))
  })

  it('filters messages below configured log level', () => {
    const debugSpy = vi.spyOn(console, 'debug')
    const logger = Logger.create('ctx', 'info')
    logger.debug('should be suppressed')
    expect(debugSpy).not.toHaveBeenCalled()
  })

  it('passes messages at or above the configured log level', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const logger = Logger.create('ctx', 'warn')
    logger.warn('should appear')
    expect(warnSpy).toHaveBeenCalled()
  })

  it('includes optional data argument', () => {
    const logger = Logger.create('ctx', 'debug')
    const data = { key: 'value' }
    logger.info('msg', data)
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('msg'), data)
  })
})
