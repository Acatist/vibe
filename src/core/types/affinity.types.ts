// ─────────────────────────────────────────────
// Affinity Scoring Types
// ─────────────────────────────────────────────

export type AffinityClassification = 'low' | 'medium' | 'high'

export interface AffinityResult {
  /** Affinity score 0–100 */
  score: number
  /** Broad category */
  classification: AffinityClassification
  /** Short explanation of the score */
  reasoning: string
}

export interface AffinityInput {
  /** Contact name / organization */
  contactName: string
  /** Contact specialization / description */
  contactSpecialization: string
  /** Contact topics / keywords */
  contactTopics: string[]
  /** Campaign objective description */
  campaignDescription: string
  /** Target affinity category */
  targetCategory: string
  /** Target affinity subcategory */
  targetSubcategory: string
  /** Contact method available (form, email, both, none) — used for scoring boost */
  contactMethod?: 'form' | 'email' | 'both' | 'none'
  /** Website domain — used to check DomainMemory for history bonus */
  contactDomain?: string
}
