import type { EnergyState, EnergyConsumeResult, EnergyConfig } from '@core/types/energy.types'
import type { ActionCostKey } from '@core/types/energy.types'
import { ACTION_COSTS } from '@core/constants/actions'
import { STORAGE_KEYS } from '@core/constants/extension'
import { storageService } from './storage.service'
import { Logger } from './logger.service'
import { energyConfig } from '@config/energy.config'

const log = Logger.create('EnergyService')

const DEFAULT_STATE: EnergyState = {
  current: energyConfig.maxEnergy,
  max: energyConfig.maxEnergy,
  lastRefillTime: Date.now(),
  isInfinite: energyConfig.infiniteMode,
  totalConsumed: 0,
  sessionConsumed: 0,
}

/**
 * EnergyService — Controls and persists the automation energy quota system.
 *
 * Each automated action costs energy points.
 * Energy refills over time or can be reset manually.
 */
export class EnergyService {
  private static instance: EnergyService
  private state: EnergyState = { ...DEFAULT_STATE }
  private config: EnergyConfig = { ...energyConfig }
  private refillTimer: ReturnType<typeof setInterval> | null = null
  private listeners: Set<(state: EnergyState) => void> = new Set()

  private constructor() {}

  static getInstance(): EnergyService {
    if (!EnergyService.instance) {
      EnergyService.instance = new EnergyService()
    }
    return EnergyService.instance
  }

  async init(): Promise<void> {
    if (this.config.persistState) {
      this.state = await storageService.get<EnergyState>(STORAGE_KEYS.ENERGY_STATE, DEFAULT_STATE)
    }
    if (this.config.refillInterval > 0) {
      this.startAutoRefill()
    }
    log.debug('EnergyService initialized', this.state)
  }

  getState(): Readonly<EnergyState> {
    return { ...this.state }
  }

  /**
   * Consume energy for a named action.
   * Returns whether the action was allowed and how much was consumed.
   */
  consume(action: ActionCostKey, customCost?: number): EnergyConsumeResult {
    if (this.state.isInfinite || this.config.debugMode) {
      return { success: true, consumed: 0, remaining: this.state.current }
    }

    const cost = customCost ?? ACTION_COSTS[action]
    if (this.state.current < cost) {
      log.warn(
        `Insufficient energy for action "${action}". Need ${cost}, have ${this.state.current}`,
      )
      return {
        success: false,
        consumed: 0,
        remaining: this.state.current,
        reason: `Insufficient energy: need ${cost}, have ${this.state.current}`,
      }
    }

    this.state = {
      ...this.state,
      current: this.state.current - cost,
      totalConsumed: this.state.totalConsumed + cost,
      sessionConsumed: this.state.sessionConsumed + cost,
    }

    this.persist()
    this.emit()

    log.debug(`Energy consumed: ${cost} for "${action}". Remaining: ${this.state.current}`)
    return { success: true, consumed: cost, remaining: this.state.current }
  }

  refill(amount?: number): void {
    const refillAmount = amount ?? this.config.refillAmount
    this.state = {
      ...this.state,
      current: Math.min(this.state.current + refillAmount, this.state.max),
      lastRefillTime: Date.now(),
    }
    this.persist()
    this.emit()
    log.debug(`Energy refilled by ${refillAmount}. Current: ${this.state.current}`)
  }

  reset(): void {
    this.state = {
      ...DEFAULT_STATE,
      isInfinite: this.state.isInfinite,
    }
    this.persist()
    this.emit()
    log.info('Energy reset to full')
  }

  setInfinite(infinite: boolean): void {
    this.state = { ...this.state, isInfinite: infinite }
    this.persist()
    this.emit()
    log.info(`Infinite energy: ${infinite}`)
  }

  setMax(max: number): void {
    this.state = {
      ...this.state,
      max,
      current: Math.min(this.state.current, max),
    }
    this.persist()
    this.emit()
  }

  canAfford(action: ActionCostKey, customCost?: number): boolean {
    if (this.state.isInfinite || this.config.debugMode) return true
    const cost = customCost ?? ACTION_COSTS[action]
    return this.state.current >= cost
  }

  startAutoRefill(): void {
    if (this.refillTimer) clearInterval(this.refillTimer)
    this.refillTimer = setInterval(() => {
      this.refill()
    }, this.config.refillInterval)
  }

  stopAutoRefill(): void {
    if (this.refillTimer) {
      clearInterval(this.refillTimer)
      this.refillTimer = null
    }
  }

  onChange(callback: (state: EnergyState) => void): () => void {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  private emit(): void {
    const state = this.getState()
    this.listeners.forEach((cb) => cb(state))
  }

  private persist(): void {
    if (!this.config.persistState) return
    storageService
      .set(STORAGE_KEYS.ENERGY_STATE, this.state)
      .catch((err: unknown) => log.error('Failed to persist energy state', err))
  }
}

export const energyService = EnergyService.getInstance()
