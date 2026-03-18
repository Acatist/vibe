export type CampaignStatus = 'draft' | 'queued' | 'running' | 'paused' | 'completed' | 'failed'

export type OutreachChannel = 'email' | 'contactForm' | 'professionalMessaging'

export interface OutreachMessage {
  contactId: string
  emailSubject: string
  emailBody: string
  contactFormMessage: string
  followUpMessage: string
  channel: OutreachChannel
  status: 'pending' | 'sent' | 'failed'
  sentAt: number | null
  error: string | null
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
}
