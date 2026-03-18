import type { RuntimeMode, RuntimeCapabilities } from '@core/types/runtime.types'

/**
 * Capability matrix for each runtime environment.
 *
 * simulation — No real outreach actions. AI + scraping still run (mock scraping).
 * staging    — Real scraping + limited outreach with rate limiting + debugging.
 * production — Full system operation with all safety controls.
 */
export const RUNTIME_CAPABILITIES: Record<RuntimeMode, RuntimeCapabilities> = {
  simulation: {
    canSendEmail: false,
    canSubmitForm: false,
    canPostExternal: false,
    canScrapeReal: false,
    enableStealth: false,
    enableRateLimiting: false,
    logPrefix: 'SIMULATION',
  },
  staging: {
    canSendEmail: true,
    canSubmitForm: true,
    canPostExternal: false,
    canScrapeReal: true,
    enableStealth: true,
    enableRateLimiting: true,
    logPrefix: 'STAGING',
  },
  production: {
    canSendEmail: true,
    canSubmitForm: true,
    canPostExternal: true,
    canScrapeReal: true,
    enableStealth: true,
    enableRateLimiting: true,
    logPrefix: 'PRODUCTION',
  },
}

/** Default runtime mode — safest for development */
export const DEFAULT_RUNTIME_MODE: RuntimeMode = 'simulation'
