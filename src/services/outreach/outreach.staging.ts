import type { Contact } from '@core/types/contact.types'
import type { OutreachService, OutreachResult } from './outreach.interface'
import { ProductionOutreachService } from './outreach.production'
import { Logger } from '@services/logger.service'

const log = Logger.create('Outreach:Staging')

/** Simple token-bucket rate limiter */
class RateLimiter {
  private tokens: number
  private lastRefill: number

  constructor(
    private readonly maxTokens: number = 10,
    private readonly refillMs: number = 60_000,
  ) {
    this.tokens = maxTokens
    this.lastRefill = Date.now()
  }

  canProceed(): boolean {
    const now = Date.now()
    const elapsed = now - this.lastRefill
    if (elapsed >= this.refillMs) {
      this.tokens = this.maxTokens
      this.lastRefill = now
    }
    if (this.tokens > 0) {
      this.tokens--
      return true
    }
    return false
  }
}

/**
 * StagingOutreachService — Rate-limited real outreach for testing.
 *
 * Delegates to the production implementation but enforces a token-bucket
 * rate limiter (10 actions per minute).  Actions that exceed the limit
 * are logged and rejected gracefully.
 */
export class StagingOutreachService implements OutreachService {
  private prod = new ProductionOutreachService()
  private limiter = new RateLimiter(10, 60_000)

  private checkLimit(action: string): OutreachResult | null {
    if (!this.limiter.canProceed()) {
      log.warn(`Rate limit exceeded for ${action} — skipping`)
      return { success: false, simulated: false, error: 'Rate limit exceeded (staging)' }
    }
    return null
  }

  async sendEmail(contact: Contact, subject: string, body: string): Promise<OutreachResult> {
    const blocked = this.checkLimit('sendEmail')
    if (blocked) return blocked
    log.debug(`[staging] sendEmail to ${contact.email}`)
    return this.prod.sendEmail(contact, subject, body)
  }

  async submitForm(url: string, formData: Record<string, string>): Promise<OutreachResult> {
    const blocked = this.checkLimit('submitForm')
    if (blocked) return blocked
    log.debug(`[staging] submitForm at ${url}`)
    return this.prod.submitForm(url, formData)
  }

  async sendLinkedInMessage(contact: Contact, message: string): Promise<OutreachResult> {
    const blocked = this.checkLimit('sendLinkedInMessage')
    if (blocked) return blocked
    log.debug(`[staging] LinkedIn to ${contact.name}`)
    return this.prod.sendLinkedInMessage(contact, message)
  }
}
