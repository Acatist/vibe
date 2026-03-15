import type { BehaviorProfile } from '@core/types/stealth.types'

/**
 * Slow user profile: casual, infrequent internet user.
 * High typo rate, slow cursor, frequent breaks.
 */
export const slowUserProfile: BehaviorProfile = {
  name: 'slow-user',
  wpmRange: [20, 40],
  cursorSpeedMultiplier: 0.4,
  typoRate: 0.12,
  thinkingPauseRate: 0.35,
  microBreakInterval: [3, 7],
  microBreakDuration: [2000, 8000],
  longBreakThreshold: 15,
  longBreakDuration: [30000, 90000],
  fatigueFactor: 0.6,
  cursorTension: 0.45,
  cursorJitter: 5,
}
