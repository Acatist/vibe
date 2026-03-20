/**
 * Scraping Scorer — Heuristic and AI-based candidate evaluation.
 *
 * Provides two scoring strategies:
 *   1. `scoreHeuristic()` — Fast keyword/signal-based scoring (no API calls)
 *   2. `scoreWithAI()` — AI-powered affinity evaluation via provider.evaluate()
 *
 * Both return a normalized CandidateScore with score, classification, signals,
 * and reasoning so the orchestrator can decide whether to accept or discard.
 */

import type { ScrapingStartParams } from './scraping.orchestrator'
import { getAIProvider } from '@services/ai.service'
import { Logger } from '@services/logger.service'

const log = Logger.create('ScrapingScorer')

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface CandidateData {
  orgName: string
  domain: string
  description: string
  keywords: string[]
  emails: string[]
  contactPage: string
  url: string
}

export interface CandidateScore {
  score: number // 0–100
  classification: 'high' | 'medium' | 'low'
  matchSignals: string[]
  reasoning: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Domains that are aggregators / SEO farms — low signal value */
const SPAM_DOMAINS = new Set([
  'facebook.com',
  'twitter.com',
  'linkedin.com',
  'instagram.com',
  'pinterest.com',
  'reddit.com',
  'wikipedia.org',
  'yelp.com',
  'yellowpages.com',
  'glassdoor.com',
  'indeed.com',
  'craigslist.org',
  'amazon.com',
  'ebay.com',
  'aliexpress.com',
])

/** Generic emails that don't indicate a real contact */
const GENERIC_EMAIL_PREFIXES = new Set([
  'info',
  'admin',
  'webmaster',
  'postmaster',
  'noreply',
  'no-reply',
  'support',
  'sales',
  'hello',
  'contact',
])

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function classify(score: number): 'high' | 'medium' | 'low' {
  if (score >= 70) return 'high'
  if (score >= 40) return 'medium'
  return 'low'
}

function normalizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 2)
}

function hasOverlap(words: string[], targets: Set<string>): string[] {
  return words.filter((w) => targets.has(w))
}

// ─────────────────────────────────────────────────────────────────────────────
// Heuristic Scorer (Mode: Fast)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Score a scraped page candidate using keyword overlap and structural signals.
 * No API calls — runs entirely in-process.
 */
export function scoreHeuristic(
  candidate: CandidateData,
  params: ScrapingStartParams,
): CandidateScore {
  let score = 0
  const signals: string[] = []

  // Build target keyword set from campaign brief
  const targetWords = new Set(
    normalizeWords(`${params.affinityCategory} ${params.affinitySubcategory} ${params.query}`),
  )

  // 1. Domain / org name contains subcategory terms (+30 max)
  const nameWords = normalizeWords(`${candidate.orgName} ${candidate.domain}`)
  const nameMatches = hasOverlap(nameWords, targetWords)
  if (nameMatches.length > 0) {
    const pts = Math.min(nameMatches.length * 15, 30)
    score += pts
    signals.push(`name:${nameMatches.slice(0, 3).join(',')}`)
  }

  // 2. Meta description has campaign keywords (+20 max)
  const descWords = normalizeWords(candidate.description)
  const descMatches = hasOverlap(descWords, targetWords)
  if (descMatches.length >= 2) {
    const pts = Math.min(descMatches.length * 7, 20)
    score += pts
    signals.push(`desc:${descMatches.slice(0, 3).join(',')}`)
  }

  // 3. Meta keywords overlap (+15 max)
  const kwMatches = hasOverlap(
    candidate.keywords.map((k) => k.toLowerCase()),
    targetWords,
  )
  if (kwMatches.length > 0) {
    const pts = Math.min(kwMatches.length * 8, 15)
    score += pts
    signals.push(`kw:${kwMatches.slice(0, 3).join(',')}`)
  }

  // 4. Country / TLD match (+10)
  const countryLower = params.country.toLowerCase()
  try {
    const tld = new URL(candidate.url).hostname.split('.').pop()?.toLowerCase() ?? ''
    const TLD_COUNTRY: Record<string, string> = {
      es: 'spain',
      fr: 'france',
      de: 'germany',
      it: 'italy',
      uk: 'united kingdom',
      nl: 'netherlands',
      pt: 'portugal',
      br: 'brazil',
      mx: 'mexico',
      ar: 'argentina',
      cl: 'chile',
      au: 'australia',
      ca: 'canada',
      pl: 'poland',
      se: 'sweden',
    }
    if (TLD_COUNTRY[tld]?.includes(countryLower) || countryLower.includes(tld)) {
      score += 10
      signals.push(`tld:${tld}`)
    }
  } catch {
    /* ignore */
  }

  // 5. Contact type match (+10)
  const allText = `${candidate.orgName} ${candidate.description}`.toLowerCase()
  if (
    params.contactType === 'corporate' &&
    /\b(company|corp|ltd|inc|gmbh|s\.?l\.?|s\.?a\.?)\b/.test(allText)
  ) {
    score += 10
    signals.push('type:corporate')
  } else if (
    params.contactType === 'institutional' &&
    /\b(ngo|fundaci|association|institute|government|ministry|council)\b/.test(allText)
  ) {
    score += 10
    signals.push('type:institutional')
  } else if (
    params.contactType === 'individual' &&
    /\b(freelance|consultant|professional|expert)\b/.test(allText)
  ) {
    score += 10
    signals.push('type:individual')
  }

  // 6. Has contact page (+10)
  if (candidate.contactPage) {
    score += 10
    signals.push('has:contactPage')
  }

  // 7. Email quality (+5 for non-generic, -5 for generic)
  if (candidate.emails.length > 0) {
    const prefix = candidate.emails[0].split('@')[0].toLowerCase()
    if (GENERIC_EMAIL_PREFIXES.has(prefix)) {
      score -= 5
      signals.push('email:generic')
    } else {
      score += 5
      signals.push('email:specific')
    }
  }

  // 8. Spam domain penalty (-20)
  if (SPAM_DOMAINS.has(candidate.domain.toLowerCase())) {
    score -= 20
    signals.push('spam:domain')
  }

  // Clamp
  score = Math.max(0, Math.min(100, score))

  return {
    score,
    classification: classify(score),
    matchSignals: signals,
    reasoning:
      signals.length > 0 ? `Heuristic: ${signals.join(', ')}` : 'No matching signals found',
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AI Scorer (Mode: Precise)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Score a candidate using the AI provider for semantic affinity evaluation.
 * Falls back to heuristic if AI fails.
 */
export async function scoreWithAI(
  candidate: CandidateData,
  params: ScrapingStartParams,
): Promise<CandidateScore> {
  // Always compute heuristic as baseline / fallback
  const heuristic = scoreHeuristic(candidate, params)

  try {
    const provider = getAIProvider()
    const prompt = `Rate the affinity (0-100) of this website as a source for finding "${params.contactType}" contacts related to "${params.affinityCategory} > ${params.affinitySubcategory}" in "${params.country}".

Website: ${candidate.orgName} (${candidate.domain})
Description: ${candidate.description}
Keywords: ${candidate.keywords.join(', ')}
Has email: ${candidate.emails.length > 0 ? 'yes' : 'no'}

Campaign objective: ${params.query}

Respond ONLY with JSON: {"score": <0-100>, "reasoning": "<one sentence>"}`

    const result = await provider.evaluate(prompt)

    if (result.success && result.data) {
      try {
        const parsed = JSON.parse(result.data.match(/\{[\s\S]*\}/)?.[0] ?? result.data)
        if (typeof parsed.score === 'number') {
          const aiScore = Math.max(0, Math.min(100, parsed.score))
          // Blend: 70% AI + 30% heuristic for stability
          const blended = Math.round(aiScore * 0.7 + heuristic.score * 0.3)
          return {
            score: blended,
            classification: classify(blended),
            matchSignals: [...heuristic.matchSignals, 'ai:evaluated'],
            reasoning: parsed.reasoning ?? '',
          }
        }
      } catch {
        // JSON parse failed — try extracting bare number
        const match = result.data.match(/\b(\d{1,3})\b/)
        if (match) {
          const aiScore = Math.max(0, Math.min(100, parseInt(match[1], 10)))
          const blended = Math.round(aiScore * 0.7 + heuristic.score * 0.3)
          return {
            score: blended,
            classification: classify(blended),
            matchSignals: [...heuristic.matchSignals, 'ai:partial'],
            reasoning: result.data.slice(0, 200),
          }
        }
      }
    }

    log.warn('AI scoring returned no usable result, using heuristic')
  } catch (e) {
    log.warn('AI scoring failed, using heuristic', (e as Error).message)
  }

  return heuristic
}

// ─────────────────────────────────────────────────────────────────────────────
// Acceptance threshold
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determine the minimum score for a candidate to be accepted.
 * Based on consistency (1=broad, 10=strict) and mode.
 */
export function getAcceptanceThreshold(consistency: number, mode: 'fast' | 'precise'): number {
  // Base thresholds per mode
  const base = mode === 'precise' ? 50 : 35

  // Consistency scales: low consistency → lower bar, high → higher bar
  // consistency 1 → -15, consistency 5 → 0, consistency 10 → +25
  const offset = Math.round((consistency - 5) * 5)

  return Math.max(10, Math.min(90, base + offset))
}
