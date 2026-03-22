export type CampaignStatus = 'draft' | 'queued' | 'running' | 'paused' | 'awaiting-review' | 'completed' | 'failed'

export type OutreachChannel = 'email' | 'contactForm' | 'professionalMessaging'

/** Granular status for each outreach attempt */
export type OutreachStatus =
  | 'pending'
  | 'mailto-opened'
  | 'form-submitted'
  | 'linkedin-queued'
  | 'sent'
  | 'failed'

export interface OutreachMessage {
  contactId: string
  emailSubject: string
  emailBody: string
  contactFormMessage: string
  followUpMessage: string
  channel: OutreachChannel
  status: OutreachStatus
  sentAt: number | null
  error: string | null
  /** Pre-mapped values for each form field, keyed by field name */
  formSubmissionData?: Record<string, string>
}

export interface Campaign {
  id: string
  name: string
  investigationId: string
  prompt: string
  status: CampaignStatus
  contactIds: string[]
  messages: OutreachMessage[]
  createdAt: number
  startedAt: number | null
  completedAt: number | null
  /** When true, the engine pauses after generating messages for manual review */
  requiresApproval?: boolean
}
