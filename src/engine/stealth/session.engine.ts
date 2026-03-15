import type { BehaviorProfile } from '@core/types/stealth.types'
import { sleep } from '@utils/timing'
import { randomBetween, withProbability } from '@utils/random'
import { Logger } from '@services/logger.service'

const log = Logger.create('SessionEngine')

export interface SessionSimulationConfig {
  /** Total session target duration in minutes */
  durationMinutes: number
  /** Whether to fire activity at random intervals to simulate active use */
  simulateActivity?: boolean
  /** Called on each micro-break */
  onMicroBreak?: (breakNumber: number, durationMs: number) => Promise<void>
  /** Called on each long break */
  onLongBreak?: (durationMs: number) => Promise<void>
  /** Called when session is considered fatigued */
  onFatigue?: () => void
}

/**
 * SessionEngine — Simulates realistic human session behavior.
 *
 * Controls:
 * - Micro-break scheduling (short pauses during activity)
 * - Long-break enforcement (after activity threshold)
 * - Fatigue simulation (degrading performance over time)
 * - Cooldown periods between automation runs
 * - Idle/resume detection hooks
 */
export class SessionEngine {
  private profile: BehaviorProfile | null = null
  private isRunning = false
  private isFatigued = false
  private breakCount = 0
  private activityStartTime = 0
  private totalActiveMs = 0

  configure(profile: BehaviorProfile): void {
    this.profile = profile
  }

  /**
   * Run a complete simulated session for the given duration.
   */
  async simulateSession(config: SessionSimulationConfig): Promise<void> {
    if (!this.profile) throw new Error('SessionEngine: no profile configured')

    this.isRunning = true
    this.isFatigued = false
    this.breakCount = 0
    this.activityStartTime = Date.now()

    const totalMs = config.durationMinutes * 60_000
    const profile = this.profile
    let elapsed = 0

    log.info(`Session simulation started: ${config.durationMinutes} min`)

    while (this.isRunning && elapsed < totalMs) {
      const [minBreakMin, maxBreakMin] = profile.microBreakInterval
      const activityPeriodMs = randomBetween(minBreakMin * 60_000, maxBreakMin * 60_000)

      // Active period
      const periodStart = Date.now()
      while (this.isRunning && Date.now() - periodStart < activityPeriodMs && elapsed < totalMs) {
        await sleep(1000)
        elapsed = Date.now() - this.activityStartTime
        this.totalActiveMs += 1000

        // Apply fatigue
        if (this.totalActiveMs > profile.longBreakThreshold * 60_000 && !this.isFatigued) {
          this.isFatigued = true
          config.onFatigue?.()
          log.warn('Session engine: fatigue threshold reached')
        }
      }

      // Long break threshold check
      if (this.totalActiveMs >= profile.longBreakThreshold * 60_000) {
        const [longMin, longMax] = profile.longBreakDuration
        const longBreakMs = randomBetween(longMin, longMax)
        log.info(`Long break: ${(longBreakMs / 1000).toFixed(0)}s`)
        config.onLongBreak && (await config.onLongBreak(longBreakMs))
        await sleep(longBreakMs)
        this.totalActiveMs = 0
        this.isFatigued = false
        this.breakCount++
        continue
      }

      // Micro-break
      if (elapsed < totalMs) {
        const [breakMin, breakMax] = profile.microBreakDuration
        const breakMs = randomBetween(breakMin, breakMax)
        this.breakCount++
        log.debug(`Micro-break #${this.breakCount}: ${(breakMs / 1000).toFixed(1)}s`)
        config.onMicroBreak && (await config.onMicroBreak(this.breakCount, breakMs))
        await sleep(breakMs)
      }
    }

    this.isRunning = false
    log.info(`Session simulation complete. Breaks: ${this.breakCount}`)
  }

  stop(): void {
    this.isRunning = false
    log.info('Session engine stopped')
  }

  /**
   * Returns time until next recommended break based on activity duration (ms).
   */
  getNextBreakTime(activeMs: number): number {
    if (!this.profile) return 5 * 60_000
    const [minMin, maxMin] = this.profile.microBreakInterval
    const avgIntervalMs = ((minMin + maxMin) / 2) * 60_000
    const timeSinceBreak = activeMs % avgIntervalMs
    return Math.max(0, avgIntervalMs - timeSinceBreak)
  }

  isSessionFatigued(): boolean {
    return this.isFatigued
  }

  /**
   * Calculate a fatigue multiplier (1.0 = fresh, 0.0 = exhausted).
   * Used to degrade typing/cursor speed over time.
   */
  getFatigueMultiplier(activeMs: number): number {
    if (!this.profile) return 1.0
    const maxMs = this.profile.longBreakThreshold * 60_000
    const progress = Math.min(activeMs / maxMs, 1.0)
    return 1.0 - progress * this.profile.fatigueFactor
  }

  /**
   * Wait for a cooldown period between automation runs.
   * Uses a randomized duration near the profile's long-break lower bound.
   */
  async waitCooldown(): Promise<void> {
    if (!this.profile) return
    const [min, max] = this.profile.longBreakDuration
    const cooldown = randomBetween(min * 0.5, max * 0.5)
    log.info(`Cooldown: ${(cooldown / 1000).toFixed(0)}s`)
    await sleep(cooldown)
  }

  /**
   * Returns whether now is a good time to take a break given activity duration.
   */
  shouldTakeBreak(activeMs: number): boolean {
    if (!this.profile) return false
    withProbability(0, () => {}) // noop to use import
    const [minMin] = this.profile.microBreakInterval
    return activeMs > minMin * 60_000
  }
}
