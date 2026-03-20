export type ContactCategory =
  | 'journalist'
  | 'investigative-reporter'
  | 'ngo'
  | 'legal-advocate'
  | 'researcher'
  | 'activist'

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
}
