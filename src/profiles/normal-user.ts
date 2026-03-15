import type { BehaviorProfile } from '@core/types/stealth.types'

/**
 * Normal user profile: average internet user.
 * Moderate typing speed, occasional breaks, small typo rate.
 */
export const normalUserProfile: BehaviorProfile = {
  name: 'normal-user',
  wpmRange: [55, 80],
  cursorSpeedMultiplier: 1.0,
  typoRate: 0.05,
  thinkingPauseRate: 0.15,
  microBreakInterval: [5, 12],
  microBreakDuration: [1000, 4000],
  longBreakThreshold: 30,
  longBreakDuration: [60000, 180000],
  fatigueFactor: 0.35,
  cursorTension: 0.35,
  cursorJitter: 3,
}
