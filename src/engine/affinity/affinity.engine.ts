import type {
  AffinityInput,
  AffinityResult,
  AffinityClassification,
} from '@core/types/affinity.types'
import { getAIProvider } from '@services/ai.service'
import { Logger } from '@services/logger.service'

const log = Logger.create('AffinityEngine')

function classify(score: number): AffinityClassification {
  if (score >= 70) return 'high'
  if (score >= 40) return 'medium'
  return 'low'
}

/**
 * Heuristic fallback: keyword overlap scoring.
 * Used when the AI provider is unavailable or fails.
 */
function heuristicScore(input: AffinityInput): AffinityResult {
  const campaignWords = new Set(
    [
      ...input.campaignDescription.toLowerCase().split(/\W+/),
      ...input.targetCategory.toLowerCase().split(/\W+/),
      ...input.targetSubcategory.toLowerCase().split(/\W+/),
    ].filter((w) => w.length > 2),
  )

  const contactWords = [
    ...input.contactSpecialization.toLowerCase().split(/\W+/),
    ...input.contactTopics.map((t) => t.toLowerCase()),
    ...input.contactName.toLowerCase().split(/\W+/),
  ].filter((w) => w.length > 2)

  const matches = contactWords.filter((w) => campaignWords.has(w))
  const maxPossible = Math.max(contactWords.length, 1)
  const raw = Math.round((matches.length / maxPossible) * 100)
  const score = Math.min(raw, 100)

  return {
    score,
    classification: classify(score),
    reasoning:
      matches.length > 0
        ? `Keyword overlap: ${matches.slice(0, 5).join(', ')} (heuristic)`
        : 'No keyword overlap detected (heuristic)',
  }
}

/**
 * Parse a numeric score from AI free-text response.
 */
function parseAIScore(text: string): number | null {
  const match = text.match(/\b(\d{1,3})\b/)
  if (!match) return null
  const n = parseInt(match[1], 10)
  return n >= 0 && n <= 100 ? n : null
}

/**
 * Score a single contact's affinity against campaign goals using AI.
 * Falls back to heuristic keyword-overlap scoring if AI is unavailable.
 */
export async function scoreAffinity(input: AffinityInput): Promise<AffinityResult> {
  try {
    const provider = getAIProvider()
    const prompt = `Rate the affinity (0-100) between this contact and campaign.

Contact: ${input.contactName}
Specialization: ${input.contactSpecialization}
Topics: ${input.contactTopics.join(', ')}

Campaign: ${input.campaignDescription}
Target category: ${input.targetCategory} > ${input.targetSubcategory}

Respond ONLY with a JSON object: {"score": <number 0-100>, "reasoning": "<one sentence>"}`

    const result = await provider.evaluate(prompt)

    if (result.success && result.data) {
      const text = result.data
      try {
        const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? text)
        if (typeof parsed.score === 'number') {
          const score = Math.max(0, Math.min(100, parsed.score))
          return { score, classification: classify(score), reasoning: parsed.reasoning ?? '' }
        }
      } catch {
        // Try extracting a number from freeform text
        const score = parseAIScore(text)
        if (score !== null) {
          return { score, classification: classify(score), reasoning: text.slice(0, 200) }
        }
      }
    }

    log.warn('AI affinity scoring returned no usable result, falling back to heuristic')
  } catch (e) {
    log.warn('AI affinity scoring failed, using heuristic', (e as Error).message)
  }

  return heuristicScore(input)
}

/**
 * Score multiple contacts in batch.
 */
export async function scoreAffinityBatch(inputs: AffinityInput[]): Promise<AffinityResult[]> {
  const results: AffinityResult[] = []
  for (const input of inputs) {
    results.push(await scoreAffinity(input))
  }
  return results
}
