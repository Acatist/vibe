// ─────────────────────────────────────────────
// Energy / Quota System Types
// ─────────────────────────────────────────────

export type ActionCostKey =
  | 'click'
  | 'hover'
  | 'scroll'
  | 'keypress'
  | 'scrape'
  | 'scrapeUrl' // 1 unit per URL scraped — 10 scrapes = 1% energy
  | 'formFill'
  | 'submitForm'
  | 'sendEmail'
  | 'sendLinkedInMessage'
  | 'like'
  | 'follow'
  | 'unfollow'
  | 'comment'
  | 'share'
  | 'search'
  | 'navigate'
  | 'addToCart'
  | 'checkout'
  | 'captchaAvoidance'
  | 'screenshot'

export type ActionCostMap = Record<ActionCostKey, number>

export interface EnergyState {
  current: number
  max: number
  lastRefillTime: number
  isInfinite: boolean
  totalConsumed: number
  sessionConsumed: number
}

export interface EnergyConfig {
  maxEnergy: number
  /** Energy units refilled per interval */
  refillAmount: number
  /** Milliseconds between auto-refills */
  refillInterval: number
  /** Whether infinite mode is enabled by default */
  infiniteMode: boolean
  /** Whether debug mode (bypass checks) is on */
  debugMode: boolean
  /** Whether to persist energy state across sessions */
  persistState: boolean
}

export interface EnergyConsumeResult {
  success: boolean
  consumed: number
  remaining: number
  reason?: string
}
