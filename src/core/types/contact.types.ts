export type ContactCategory =
  | 'journalist'
  | 'investigative-reporter'
  | 'ngo'
  | 'legal-advocate'
  | 'researcher'
  | 'activist'

/** How a contact can be reached — form-first approach */
export type ContactMethod = 'form' | 'email' | 'both' | 'none'

/** A single field detected in a contact form */
export interface FormFieldInfo {
  name: string
  type: string
  label?: string
  required?: boolean
}

/** Metadata extracted from the domain's homepage */
export interface DomainMeta {
  title: string
  description: string
  favicon?: string
  language?: string
}

export interface Contact {
  id: string
  name: string
  role: string
  organization: string
  email: string
  website: string
  contactPage: string
  specialization: string
  topics: string[]
  region: string
  recentArticles: string[]
  category: ContactCategory
  relevanceScore: number
  investigationId: string
  /** true when the contact was below the acceptance threshold */
  discarded?: boolean

  // ── Form-centric fields ──────────────────────────────────────────────────
  /** URL of the page containing the contact form (if found) */
  contactFormUrl?: string | null
  /** Fields detected in the contact form */
  formFields?: FormFieldInfo[]
  /** Preferred contact method based on what was discovered */
  contactMethod?: ContactMethod
  /** Homepage metadata for display and AI personalisation */
  domainMeta?: DomainMeta
  /** Whether an AI message has already been generated for this contact */
  messageGenerated?: boolean
  /** Whether the user has manually edited the generated message */
  messageEdited?: boolean
  /** Whether a CAPTCHA was detected on the contact form page */
  hasCaptcha?: boolean
}
