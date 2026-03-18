export type AIProviderType = 'openai' | 'grok' | 'google'

export interface AIConfig {
  provider: AIProviderType
  apiKey: string
  model?: string
}

export interface AIResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export interface AIAnalysisResult {
  problemAnalysis: string
  strategy: string
  targetAudiences: string[]
  suggestedSources: string[]
  expectedContactTypes: string[]
}

export interface AIMessageResult {
  emailSubject: string
  emailBody: string
  contactFormMessage: string
  followUpMessage: string
}

export interface ScrapeTarget {
  url: string
  domain: string
  rationale: string
  type: 'directory' | 'portal' | 'association' | 'media' | 'ngo' | 'company' | 'blog' | 'other'
  estimatedContacts: number
}

export interface TargetDiscoveryResult {
  targets: ScrapeTarget[]
}
