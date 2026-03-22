import type { Contact } from '@core/types/contact.types'
import type { DomainMemoryRecord } from '@store/domain.memory.store'

/**
 * ChannelRouter — Determines the best outreach channel for a contact.
 *
 * Priority: form (no CAPTCHA) > form (CAPTCHA but proven) > email > none.
 * Uses DomainMemory to make smarter decisions for previously contacted domains.
 */
export function getBestChannel(
  contact: Contact,
  domainMemory: DomainMemoryRecord | null,
): 'form' | 'email' | 'none' {
  const hasForm = !!contact.contactFormUrl
  const hasCaptcha = contact.hasCaptcha === true
  const hasEmail = !!contact.email

  // Priority 1: Form without CAPTCHA — ideal channel
  if (hasForm && !hasCaptcha) {
    return 'form'
  }

  // Priority 2: Form with CAPTCHA but domain has proven success
  if (hasForm && hasCaptcha && domainMemory && domainMemory.formSubmissions > 0) {
    return 'form'
  }

  // Priority 3: Email fallback
  if (hasEmail) {
    return 'email'
  }

  // Priority 4: Form with CAPTCHA and no history — still try form as last resort
  if (hasForm) {
    return 'form'
  }

  return 'none'
}
