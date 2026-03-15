// ─────────────────────────────────────────────
// Stealth Engine Types
// ─────────────────────────────────────────────

export interface Point {
  x: number
  y: number
}

export interface BezierOptions {
  /** Number of intermediate points along the path */
  steps?: number
  /** How far control points deviate from the straight line (0–1) */
  tension?: number
  /** Pixels of random jitter applied to each path step */
  jitter?: number
  /** Whether to add overshoot at the end */
  overshoot?: boolean
}

export interface CursorOptions {
  /** Milliseconds per step (lower = faster) */
  stepDuration?: number
  /** Speed multiplier from profile */
  speedMultiplier?: number
  /** Whether to dispatch events on the document */
  dispatchEvents?: boolean
}

export interface TypingOptions {
  /** Words per minute override */
  wpm?: number
  /** Probability of making a typo (0–1) */
  typoRate?: number
  /** Probability of a thinking pause between words (0–1) */
  thinkingPauseRate?: number
  /** Whether to clear existing content before typing */
  clearFirst?: boolean
}

export type TypoType =
  | 'adjacent-key'
  | 'double-press'
  | 'transposition'
  | 'missed-key'
  | 'fat-finger'

export interface TypingEvent {
  type: 'keydown' | 'keypress' | 'keyup' | 'input'
  key: string
  timestamp: number
  isTypo: boolean
  isCorrection: boolean
}

export interface BehaviorProfile {
  name: string
  /** Min and max WPM range */
  wpmRange: [number, number]
  /** Cursor speed multiplier relative to base */
  cursorSpeedMultiplier: number
  /** Probability of making a typo per keystroke (0-1) */
  typoRate: number
  /** Probability of a thinking pause per word (0-1) */
  thinkingPauseRate: number
  /** Break frequency: how often micro-breaks occur (minutes) */
  microBreakInterval: [number, number]
  /** Duration of micro-breaks (milliseconds) */
  microBreakDuration: [number, number]
  /** Long break threshold (minutes of activity before forced long break) */
  longBreakThreshold: number
  /** Long break duration (milliseconds) */
  longBreakDuration: [number, number]
  /** How aggressively fatigue reduces speed (0-1) */
  fatigueFactor: number
  /** Bezier tension for cursor paths */
  cursorTension: number
  /** Jitter pixels for cursor movement */
  cursorJitter: number
}

export interface StealthConfig {
  /** Base cursor movement speed (px/ms) */
  baseCursorSpeed: number
  /** Base typing WPM when no profile overrides */
  baseWPM: number
  /** Minimum milliseconds between keystrokes at max WPM */
  minKeystrokeMs: number
  /** Maximum micro-jitter pixels for cursor */
  maxJitterPx: number
  /** Overshoot distance in pixels */
  overshootPx: [number, number]
  /** Pause after reaching target before clicking (ms) */
  preclickPause: [number, number]
  /** Thinking pause duration range (ms) */
  thinkingPauseDuration: [number, number]
  /** Punctuation pause duration range (ms) */
  punctuationPauseDuration: [number, number]
}

export interface SessionState {
  id: string
  startTime: number
  endTime?: number
  isActive: boolean
  totalActiveMs: number
  idleMs: number
  breakCount: number
  lastActivityTime: number
  isFatigued: boolean
  nextBreakAt: number
}
