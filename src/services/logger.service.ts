import type { LogLevel } from '@core/types/extension.types'
import { extensionConfig } from '@config/extension.config'
import { getLogPrefix } from '@services/runtime.service'

interface LogEntry {
  timestamp: number
  level: LogLevel
  context: string
  message: string
  data?: unknown
}

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
}

/**
 * Logger — Centralized structured logging system.
 *
 * Usage:
 *   const log = Logger.create('MyModule')
 *   log.debug('Processing...', { count: 3 })
 *   log.info('Done')
 *   log.warn('Slow response', { ms: 2000 })
 *   log.error('Failed', error)
 */
export class Logger {
  private readonly context: string
  private readonly minLevel: LogLevel
  private readonly buffer: LogEntry[] = []
  private readonly maxBufferSize = 200

  private constructor(context: string, level?: LogLevel) {
    this.context = context
    this.minLevel = level ?? extensionConfig.logLevel
  }

  static create(context: string, level?: LogLevel): Logger {
    return new Logger(context, level)
  }

  debug(message: string, data?: unknown): void {
    this.log('debug', message, data)
  }

  info(message: string, data?: unknown): void {
    this.log('info', message, data)
  }

  warn(message: string, data?: unknown): void {
    this.log('warn', message, data)
  }

  error(message: string, data?: unknown): void {
    this.log('error', message, data)
  }

  getBuffer(): ReadonlyArray<LogEntry> {
    return this.buffer
  }

  clearBuffer(): void {
    this.buffer.length = 0
  }

  private log(level: LogLevel, message: string, data?: unknown): void {
    if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[this.minLevel]) return

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      context: this.context,
      message,
      data,
    }

    this.buffer.push(entry)
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer.shift()
    }

    const runtimePrefix = getLogPrefix()
    const prefix = `[${runtimePrefix}][SEF:${this.context}]`
    const formatted = `${prefix} ${message}`

    switch (level) {
      case 'debug':
        if (extensionConfig.debug) {
          // eslint-disable-next-line no-console
          console.debug(formatted, ...(data !== undefined ? [data] : []))
        }
        break
      case 'info':
        // eslint-disable-next-line no-console
        console.info(formatted, ...(data !== undefined ? [data] : []))
        break
      case 'warn':
        console.warn(formatted, ...(data !== undefined ? [data] : []))
        break
      case 'error':
        console.error(formatted, ...(data !== undefined ? [data] : []))
        break
    }
  }
}

export const logger = Logger.create('Global')
