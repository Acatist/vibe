import type { ProfileName } from '@core/types/extension.types'
import { getProfile } from '@profiles/index'
import { Logger } from './logger.service'

const log = Logger.create('StealthService')

/**
 * StealthService — Thin orchestration layer for the StealthEngine.
 *
 * Provides a service-layer interface to the stealth automation engine,
 * managing profile injection and exposing high-level stealth operations.
 *
 * Note: The concrete StealthEngine is imported lazily to keep this service
 * usable in both content-script and background contexts.
 */
export class StealthService {
  private static instance: StealthService
  private currentProfile: ProfileName = 'normal-user'

  private constructor() {}

  static getInstance(): StealthService {
    if (!StealthService.instance) {
      StealthService.instance = new StealthService()
    }
    return StealthService.instance
  }

  setProfile(profile: ProfileName): void {
    this.currentProfile = profile
    log.info(`Stealth profile set to: ${profile}`)
  }

  getProfile(): ProfileName {
    return this.currentProfile
  }

  getProfileConfig() {
    return getProfile(this.currentProfile)
  }

  /**
   * Returns the behavior config for use by StealthEngine sub-engines.
   */
  getBehaviorProfile() {
    return getProfile(this.currentProfile)
  }
}

export const stealthService = StealthService.getInstance()
