import { gaussianRandom, clamp } from './random'
import type { BehaviorProfile } from '@core/types/stealth.types'

/**
 * timing.ts — Human-realistic delay utilities
 */

/**
 * Resolves after exactly `ms` milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)))
}

/**
 * Resolves after a uniformly random duration in [min, max] ms.
 */
export function sleepRandom(min: number, max: number): Promise<void> {
  const ms = min + Math.random() * (max - min)
  return sleep(ms)
}

/**
 * Resolves after a Gaussian-distributed duration centered on `mean` ms.
 * Clamped to [mean - 3*stdDev, mean + 3*stdDev].
 */
export function sleepGaussian(mean: number, stdDev: number): Promise<void> {
  const ms = clamp(gaussianRandom(mean, stdDev), Math.max(0, mean - 3 * stdDev), mean + 3 * stdDev)
  return sleep(ms)
}

/**
 * Computes the inter-character delay for a given WPM.
 * Average English word = 5 characters.
 * Returns milliseconds per character.
 */
export function wpmToCharDelay(wpm: number): number {
  const charPerMin = wpm * 5
  return 60_000 / charPerMin
}

/**
 * Returns a human-realistic delay for a single keystroke based on a behavior profile.
 * Adds Gaussian jitter around the base WPM-derived delay.
 */
export function humanKeystrokeDelay(_profile: BehaviorProfile, currentWPM: number): number {
  const base = wpmToCharDelay(currentWPM)
  const jitter = base * 0.4 // ±40% jitter
  return clamp(gaussianRandom(base, jitter / 2), 20, base * 3)
}

/**
 * Returns a thinking pause duration based on a behavior profile.
 */
export function humanThinkingPause(profile: BehaviorProfile): number {
  const [min, max] = [400, 1800]
  const base = min + Math.random() * (max - min)
  return base * (1 / profile.cursorSpeedMultiplier)
}

/**
 * Returns a duration for a micro-break based on the profile.
 */
export function microBreakDuration(profile: BehaviorProfile): number {
  const [min, max] = profile.microBreakDuration
  return min + Math.random() * (max - min)
}

/**
 * Returns a post-navigation settle delay (page load + rendering).
 */
export function pageSettleDelay(): Promise<void> {
  return sleepRandom(800, 2500)
}

/**
 * Creates a high-resolution timestamp suitable for event timing.
 */
export function hrNow(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now()
}
