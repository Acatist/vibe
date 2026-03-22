// ─────────────────────────────────────────────
// Campaign Engine Types
// ─────────────────────────────────────────────

import type { AffinityResult } from './affinity.types'
import type { OutreachResult } from '@services/outreach/outreach.interface'
import type { ScrapedContact } from '@services/scraping/scraping.interface'

export type CampaignStep = 'discover' | 'evaluate' | 'generate' | 'outreach' | 'report'

export interface CampaignProgress {
  step: CampaignStep
  /** Total steps in the pipeline */
  totalSteps: number
  /** 0-based index of current step */
  currentStep: number
  /** Human-readable label */
  label: string
}

export interface ContactOutreachResult {
  contactId: string
  contactName: string
  affinity: AffinityResult
  outreach: OutreachResult
}

export interface EnergyUsage {
  pagesVisited: number
  aiRequests: number
  automationActions: number
  totalConsumed: number
}

export interface CampaignExecutionResult {
  campaignId: string
  contacts: ScrapedContact[]
  highAffinityCount: number
  outreachResults: ContactOutreachResult[]
  energyUsage: EnergyUsage
  durationMs: number
  simulated: boolean
  /** True when the engine paused for manual review (awaiting-review) */
  awaitingReview?: boolean
}
