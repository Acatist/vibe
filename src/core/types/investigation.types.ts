import type { AIAnalysisResult, ScrapeTarget } from './ai.types'

export type InvestigationStatus =
  | 'idle'
  | 'analyzing'
  | 'planned'
  | 'executing'
  | 'enriching'
  | 'complete'
  | 'error'
export type ScrapeStatus = 'idle' | 'running' | 'done' | 'error'

export interface InvestigationPlan extends AIAnalysisResult {
  approved: boolean
}

export interface Investigation {
  id: string
  prompt: string
  consistency: number
  status: InvestigationStatus
  plan: InvestigationPlan | null
  contactIds: string[]
  createdAt: number
  completedAt: number | null
  error: string | null
  // Scraping pipeline
  targetUrls: ScrapeTarget[]
  scrapeStatus: ScrapeStatus
  scrapeProgress: { current: number; total: number }
}
