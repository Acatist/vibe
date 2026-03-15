import type { SessionState } from '@core/types/stealth.types'
import { STORAGE_KEYS } from '@core/constants/extension'
import { storageService } from './storage.service'
import { Logger } from './logger.service'

const log = Logger.create('SessionService')

const IDLE_THRESHOLD_MS = 60_000 // 1 minute of inactivity = idle
const COOLDOWN_DEFAULT_MS = 5 * 60_000 // 5 min cooldown after long session

function createDefaultState(): SessionState {
  return {
    id: crypto.randomUUID(),
    startTime: Date.now(),
    isActive: false,
    totalActiveMs: 0,
    idleMs: 0,
    breakCount: 0,
    lastActivityTime: Date.now(),
    isFatigued: false,
    nextBreakAt: Date.now() + 15 * 60_000,
  }
}

/**
 * SessionService — Tracks automation session lifecycle.
 *
 * Detects idle time, enforces cooldowns, updates session state,
 * and fires callbacks on idle/resume events.
 */
export class SessionService {
  private static instance: SessionService
  private state: SessionState = createDefaultState()
  private pollingTimer: ReturnType<typeof setInterval> | null = null
  private idleCallbacks: Set<(state: SessionState) => void> = new Set()
  private resumeCallbacks: Set<(state: SessionState) => void> = new Set()
  private updateCallbacks: Set<(state: SessionState) => void> = new Set()
  private wasIdle = false

  private constructor() {}

  static getInstance(): SessionService {
    if (!SessionService.instance) {
      SessionService.instance = new SessionService()
    }
    return SessionService.instance
  }

  async init(): Promise<void> {
    const saved = await storageService.get<SessionState | null>(STORAGE_KEYS.SESSION_STATE, null)
    if (saved) {
      this.state = saved
    }
    this.setupActivityDetection()
    log.debug('SessionService initialized', this.state)
  }

  startSession(): void {
    this.state = {
      ...createDefaultState(),
      isActive: true,
      startTime: Date.now(),
    }
    this.persist()
    this.emit()
    log.info('Session started', { id: this.state.id })
  }

  endSession(): void {
    this.state = {
      ...this.state,
      isActive: false,
      endTime: Date.now(),
    }
    this.persist()
    this.emit()
    log.info('Session ended', { duration: this.state.totalActiveMs })
  }

  recordActivity(): void {
    const now = Date.now()
    const wasIdleBefore = this.wasIdle

    if (wasIdleBefore) {
      this.wasIdle = false
      this.resumeCallbacks.forEach((cb) => cb(this.state))
      log.debug('Session resumed from idle')
    }

    this.state = {
      ...this.state,
      lastActivityTime: now,
    }
  }

  getSessionState(): Readonly<SessionState> {
    return { ...this.state }
  }

  isIdle(): boolean {
    return Date.now() - this.state.lastActivityTime > IDLE_THRESHOLD_MS
  }

  async waitForCooldown(ms = COOLDOWN_DEFAULT_MS): Promise<void> {
    log.info(`Waiting for cooldown: ${ms}ms`)
    await new Promise<void>((resolve) => setTimeout(resolve, ms))
  }

  onIdle(callback: (state: SessionState) => void): () => void {
    this.idleCallbacks.add(callback)
    return () => this.idleCallbacks.delete(callback)
  }

  onResume(callback: (state: SessionState) => void): () => void {
    this.resumeCallbacks.add(callback)
    return () => this.resumeCallbacks.delete(callback)
  }

  onChange(callback: (state: SessionState) => void): () => void {
    this.updateCallbacks.add(callback)
    return () => this.updateCallbacks.delete(callback)
  }

  private setupActivityDetection(): void {
    // Activity ticker: check idle status every 10s
    this.pollingTimer = setInterval(() => {
      const now = Date.now()
      const idleMs = now - this.state.lastActivityTime

      if (idleMs > IDLE_THRESHOLD_MS && !this.wasIdle) {
        this.wasIdle = true
        this.state = {
          ...this.state,
          idleMs: this.state.idleMs + idleMs,
        }
        this.idleCallbacks.forEach((cb) => cb(this.state))
        log.debug('Session went idle')
      }

      if (this.state.isActive && !this.wasIdle) {
        this.state = {
          ...this.state,
          totalActiveMs: this.state.totalActiveMs + 10_000,
          isFatigued: this.state.totalActiveMs > 30 * 60_000,
          nextBreakAt:
            this.state.nextBreakAt === this.state.startTime
              ? now + 15 * 60_000
              : this.state.nextBreakAt,
        }
        this.persist()
        this.emit()
      }
    }, 10_000)

    // DOM-based activity detection (content script context)
    if (typeof document !== 'undefined') {
      const events = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart']
      const throttled = this.throttle(() => this.recordActivity(), 2000)
      events.forEach((event) => document.addEventListener(event, throttled, { passive: true }))

      // Visibility API
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.recordActivity()
        }
      })
    }
  }

  private throttle<T extends () => void>(fn: T, delay: number): T {
    let lastCall = 0
    return ((...args) => {
      const now = Date.now()
      if (now - lastCall >= delay) {
        lastCall = now
        fn(...args)
      }
    }) as T
  }

  private emit(): void {
    const state = this.getSessionState()
    this.updateCallbacks.forEach((cb) => cb(state))
  }

  destroy(): void {
    if (this.pollingTimer !== null) {
      clearInterval(this.pollingTimer)
      this.pollingTimer = null
    }
  }

  private persist(): void {
    storageService
      .set(STORAGE_KEYS.SESSION_STATE, this.state)
      .catch((err: unknown) => log.error('Failed to persist session state', err))
  }
}

export const sessionService = SessionService.getInstance()
