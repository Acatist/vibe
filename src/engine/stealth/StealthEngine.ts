import type { ProfileName } from '@core/types/extension.types'
import type { BehaviorProfile } from '@core/types/stealth.types'
import { CursorEngine } from './cursor.engine'
import { TypingEngine } from './typing.engine'
import { SessionEngine } from './session.engine'
import { getProfile } from '@profiles/index'
import { Logger } from '@services/logger.service'

const log = Logger.create('StealthEngine')

/**
 * StealthEngine — Core human behavior emulation engine.
 *
 * Composes the CursorEngine, TypingEngine, and SessionEngine into a
 * unified interface. Configure once with a behavior profile, then use
 * `.cursor`, `.typing`, and `.session` to access each sub-engine.
 *
 * Usage:
 *   const engine = StealthEngine.create('normal-user')
 *   await engine.cursor.moveTo(button)
 *   await engine.typing.humanType(input, 'hello world')
 *   await engine.session.simulateSession({ durationMinutes: 10 })
 */
export class StealthEngine {
  readonly cursor: CursorEngine
  readonly typing: TypingEngine
  readonly session: SessionEngine

  private profile: BehaviorProfile

  private constructor(profile: BehaviorProfile) {
    this.profile = profile
    this.cursor = new CursorEngine()
    this.typing = new TypingEngine()
    this.session = new SessionEngine()
    this.applyProfile(profile)
  }

  /**
   * Create a StealthEngine configured with the given behavior profile.
   */
  static create(profileName: ProfileName = 'normal-user'): StealthEngine {
    const profile = getProfile(profileName)
    log.info(`StealthEngine created with profile: ${profileName}`)
    return new StealthEngine(profile)
  }

  /**
   * Reconfigure all sub-engines with a new behavior profile.
   */
  configure(profileName: ProfileName): void {
    this.profile = getProfile(profileName)
    this.applyProfile(this.profile)
    log.info(`StealthEngine reconfigured: ${profileName}`)
  }

  /**
   * Access the active behavior profile configuration.
   */
  getProfile(): Readonly<BehaviorProfile> {
    return { ...this.profile }
  }

  private applyProfile(profile: BehaviorProfile): void {
    this.cursor.configure(profile)
    this.typing.configure(profile)
    this.session.configure(profile)
  }
}

// Default singleton engine using normal-user profile
export const stealthEngine = StealthEngine.create('normal-user')
