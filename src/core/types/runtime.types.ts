// ─────────────────────────────────────────────
// Runtime Environment Types
// ─────────────────────────────────────────────

export type RuntimeMode = 'simulation' | 'staging' | 'production'

export interface RuntimeCapabilities {
  /** Whether real emails can be sent */
  canSendEmail: boolean
  /** Whether real forms can be submitted */
  canSubmitForm: boolean
  /** Whether external posting (LinkedIn, etc.) is allowed */
  canPostExternal: boolean
  /** Whether real scraping runs (false = returns mock data) */
  canScrapeReal: boolean
  /** Whether full stealth engine is active */
  enableStealth: boolean
  /** Whether rate limiting is enforced */
  enableRateLimiting: boolean
  /** Log prefix injected into all log output */
  logPrefix: string
}
