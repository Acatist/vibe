import type { BehaviorProfile } from '@core/types/stealth.types'

/**
 * Power user profile: experienced, fast internet user.
 * High typing speed, minimal breaks, very low typo rate.
 */
export const powerUserProfile: BehaviorProfile = {
  name: 'power-user',
  wpmRange: [90, 130],
  cursorSpeedMultiplier: 1.8,
  typoRate: 0.02,
  thinkingPauseRate: 0.05,
  microBreakInterval: [10, 20],
  microBreakDuration: [500, 2000],
  longBreakThreshold: 60,
  longBreakDuration: [120000, 300000],
  fatigueFactor: 0.15,
  cursorTension: 0.25,
  cursorJitter: 1.5,
}
