import type { StealthConfig } from '@core/types/stealth.types'

/**
 * Stealth engine configuration.
 * Controls cursor movement, typing behavior, and session simulation.
 */
export const stealthConfig: StealthConfig = {
  baseCursorSpeed: 0.8, // px per ms at 1.0x multiplier
  baseWPM: 65, // fallback WPM when no profile is set
  minKeystrokeMs: 30, // never go faster than 30ms per key
  maxJitterPx: 4, // max random pixel offset at 1.0x profile
  overshootPx: [3, 12], // pixels to overshoot target before correcting
  preclickPause: [80, 250], // ms to pause over element before clicking
  thinkingPauseDuration: [400, 1800], // ms for mid-sentence thinking pauses
  punctuationPauseDuration: [120, 400], // ms extra pause after punctuation
}
