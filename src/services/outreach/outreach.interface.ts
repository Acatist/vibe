import type { Contact } from '@core/types/contact.types'

// ─────────────────────────────────────────────
// Outreach Service — Strategy Interface
// ─────────────────────────────────────────────

export interface OutreachResult {
  success: boolean
  /** Whether the action was simulated (no real side-effect) */
  simulated: boolean
  error?: string
}

/**
 * OutreachService defines the contract for all outreach implementations.
 *
 * Each runtime environment provides its own implementation:
 *   - SimulationOutreachService  → logs, no real actions
 *   - StagingOutreachService     → rate-limited real actions
 *   - ProductionOutreachService  → full real actions
 *
 * Consumers never check runtime mode — the factory resolves the right impl.
 */
export interface OutreachService {
  /** Send an email to a contact */
  sendEmail(contact: Contact, subject: string, body: string): Promise<OutreachResult>

  /** Fill and submit a web contact form */
  submitForm(url: string, formData: Record<string, string>): Promise<OutreachResult>

  /** Send a LinkedIn / professional messaging message */
  sendLinkedInMessage(contact: Contact, message: string): Promise<OutreachResult>
}
