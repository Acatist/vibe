/**
 * ScrapingOrchestrator — Multi-engine contact scraping.
 *
 * Architecture
 * ────────────
 * 1. Opens (or reuses) ONE visible Chrome tab.
 * 2. Rotates across Google, DuckDuckGo, Bing and Yahoo search pages.
 * 3. Visits each URL to extract contact information (emails, org name, etc.)
 *    and probes subpages (/contact, /about, /team) if needed.
 * 4. Streams progress + individual contacts back to the side panel via
 *    chrome.runtime.sendMessage so the user sees real-time updates.
 * 5. Respects pause / resume / cancel commands from the side panel.
 * 6. Deducts 1 energy unit per URL visited (10 scrapes = 1% of max 1000).
 * 7. Persists visited domains + emails in chrome.storage.local so the same
 *    page/contact is NEVER scraped or saved twice across any session.
 * 8. Humanization via SessionEngine: dynamically scales inter-page delays by
 *    fatigue, injects proabilistic micro-breaks, adds cooldowns between query
 *    variant switches, and simulates human SERP reading (scroll + hover).
 *
 * Multi-engine notes
 * ──────────────────
 * - Google, DuckDuckGo, Bing and Yahoo are queried in round-robin order.
 * - Each engine has its own result page extractor (injected script).
 * - If one engine blocks (CAPTCHA), it is skipped and the loop continues.
 * - Delays auto-scale from ~1.5 s (fresh) to ~3.5 s (fatigued) per page.
 */

import { MessageType } from '@core/types/message.types'
import type { SearchCriteriaFamily } from '@core/types/ai.types'
import { energyService } from '@services/energy.service'
import { Logger } from '@services/logger.service'
import { SessionEngine } from '@engine/stealth/session.engine'
import { stealthService } from '@services/stealth.service'
import { ContactPageProber, type ProbeResult } from './contact-page.prober'
import {
  scoreHeuristic,
  scoreWithAI,
  getAcceptanceThreshold,
  type CandidateData,
  type CandidateScore,
} from './scraping.scorer'

const log = Logger.create('ScrapingOrchestrator')

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ScrapingMode = 'fast' | 'precise'
type FinishReason =
  | 'target-reached'
  | 'energy-exhausted'
  | 'queries-exhausted'
  | 'stalled'
  | 'max-pages'

export interface ScrapingStartParams {
  invId: string
  query: string
  targetCount: number
  affinityCategory: string
  affinitySubcategory: string
  country: string
  language: string
  contactType: string
  scrapingMode: ScrapingMode
  consistency: number // 1-10, controls acceptance threshold
}

interface GoogleResult {
  url: string
  title: string
  description: string
}

interface PageContact {
  emails: string[]
  orgName: string
  description: string
  keywords: string[]
  domain: string
  contactPage: string
}

export type ScrapingStatus = 'idle' | 'running' | 'paused' | 'cancelled' | 'complete' | 'error'

// ─────────────────────────────────────────────────────────────────────────────
// Search engines
// ─────────────────────────────────────────────────────────────────────────────

type SearchEngine = 'google' | 'duckduckgo' | 'bing' | 'yahoo'

interface EngineState {
  page: number // current results page (0-based)
  blocked: boolean // CAPTCHA detected — skip this engine
  exhausted: boolean // returned 0 results last time
}

// ─────────────────────────────────────────────────────────────────────────────
// URL normalisation & persistent dedup
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY_DOMAINS = 'vibe:scraped-domains'
const STORAGE_KEY_EMAILS = 'vibe:scraped-emails'

/** Strips www., trailing slashes, hash fragments, and common tracking params. */
function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw)
    u.hostname = u.hostname.replace(/^www\./, '')
    u.hash = ''
    // Remove common tracking params
    for (const p of [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_content',
      'utm_term',
      'ref',
      'fbclid',
      'gclid',
    ]) {
      u.searchParams.delete(p)
    }
    // Remove trailing slash for consistency
    let href = u.href
    if (href.endsWith('/')) href = href.slice(0, -1)
    return href
  } catch {
    return raw
  }
}

/** Extract just the registrable domain (e.g. example.com from sub.example.com/path). */
function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return ''
  }
}

/** Domains that are aggregators, social media, or search engines — never scrape. */
const BLOCKED_DOMAINS = new Set([
  'facebook.com',
  'twitter.com',
  'x.com',
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
  'tiktok.com',
  'google.com',
  'google.co',
  'bing.com',
  'duckduckgo.com',
  'yahoo.com',
  'youtube.com',
  'translate.google.com',
  'maps.google.com',
  'web.archive.org',
  'archive.org',
])

function isBlockedDomain(url: string): boolean {
  const domain = extractDomain(url)
  return (
    BLOCKED_DOMAINS.has(domain) || Array.from(BLOCKED_DOMAINS).some((b) => domain.endsWith('.' + b))
  )
}

/**
 * Persistent dedup store backed by chrome.storage.local.
 * Tracks domains and emails across all scraping sessions so the same
 * page/contact is never scraped or saved twice.
 */
class ScrapingHistory {
  private domains = new Set<string>()
  private emails = new Set<string>()
  private loaded = false

  async load(): Promise<void> {
    if (this.loaded) return
    try {
      const result = await chrome.storage.local.get([STORAGE_KEY_DOMAINS, STORAGE_KEY_EMAILS])
      const d = result[STORAGE_KEY_DOMAINS]
      const e = result[STORAGE_KEY_EMAILS]
      if (Array.isArray(d)) d.forEach((v: string) => this.domains.add(v))
      if (Array.isArray(e)) e.forEach((v: string) => this.emails.add(v))
      this.loaded = true
      log.info(`History loaded: ${this.domains.size} domains, ${this.emails.size} emails`)
    } catch (err) {
      log.warn('Failed to load scraping history:', (err as Error).message)
      this.loaded = true
    }
  }

  hasDomain(url: string): boolean {
    return this.domains.has(normalizeUrl(url))
  }

  hasEmail(email: string): boolean {
    return this.emails.has(email.toLowerCase().trim())
  }

  addDomain(url: string): void {
    this.domains.add(normalizeUrl(url))
  }

  addEmail(email: string): void {
    this.emails.add(email.toLowerCase().trim())
  }

  /** Persist to chrome.storage.local. Called periodically and at end of session. */
  async save(): Promise<void> {
    try {
      await chrome.storage.local.set({
        [STORAGE_KEY_DOMAINS]: Array.from(this.domains),
        [STORAGE_KEY_EMAILS]: Array.from(this.emails),
      })
    } catch (err) {
      log.warn('Failed to persist scraping history:', (err as Error).message)
    }
  }
}

const history = new ScrapingHistory()

interface ScrapingSession extends ScrapingStartParams {
  tabId: number
  status: ScrapingStatus
  urlQueue: string[] // URLs discovered from search engines, not yet scraped
  visitedUrls: Set<string> // all normalized URLs ever attempted (session + global dedup)
  seenEmails: Set<string> // all emails seen in this session (session dedup)
  contactsFound: number
  pagesScanned: number
  discardedCount: number // candidates rejected by scoring
  energyConsumed: number
  startTime: number
  acceptThreshold: number // minimum score to accept a candidate
  /** Multi-engine state */
  engines: Record<SearchEngine, EngineState>
  engineOrder: SearchEngine[]
  currentEngineIdx: number
  /** Parallel query variants to maximise URL diversity */
  queryVariants: string[]
  currentVariantIdx: number
  /** AI-generated search criteria families (new system) */
  searchCriteriaFamilies: SearchCriteriaFamily[]
  /** AI-seeded target URLs (precise mode only) */
  seedUrls: string[]
  /** Counter for periodic history flush */
  _saveCounter: number
  /** Domains checked in this session */
  domainsChecked: number
  /** Contact forms found in this session */
  formsFound: number
  /** Current domain being probed */
  currentDomain: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — injected functions (must be self-contained, no closures)
// ─────────────────────────────────────────────────────────────────────────────

/** Runs inside the Google search results tab. Returns up to 10 result URLs. */
function _extractGoogleResults(): GoogleResult[] {
  const results: GoogleResult[] = []

  // Various selectors across Google's A/B changes
  const containers = document.querySelectorAll(
    '#search .g, #rso .g, #rso > div > div, div[data-sokoban-container] .g',
  )

  containers.forEach((el) => {
    // Skip "People also ask", ads, and similar widgets
    if (el.querySelector('[data-hveid][data-ved]') && el.classList.contains('g')) {
      // might be a result
    }
    const anchor = el.querySelector<HTMLAnchorElement>(
      'a[href][data-ved], h3 a, .yuRUbf a, a[ping]',
    )
    const h3 = el.querySelector('h3')
    const desc = el.querySelector('.VwiC3b, .s3v9rd, [data-snf] span, .IsZvec span, .yXK7lf')

    const href = anchor?.href ?? ''
    if (
      href.startsWith('http') &&
      !href.includes('google.com') &&
      !href.includes('google.co') &&
      !href.includes('youtube.com') &&
      !href.includes('translate.google')
    ) {
      results.push({
        url: href,
        title: h3?.textContent?.trim() ?? '',
        description: desc?.textContent?.trim() ?? '',
      })
    }
  })

  return results
}

/** Runs inside a DuckDuckGo HTML search results page. */
function _extractDuckDuckGoResults(): GoogleResult[] {
  const results: GoogleResult[] = []
  // DDG organic results
  const containers = document.querySelectorAll(
    '.result, .nrn-react-div article, [data-testid="result"]',
  )
  containers.forEach((el) => {
    const anchor = el.querySelector<HTMLAnchorElement>(
      'a.result__a, a[data-testid="result-title-a"], h2 a',
    )
    const desc = el.querySelector(
      '.result__snippet, [data-result="snippet"], .E2eLOJr8HctVnDOTM8fs',
    )
    const href = anchor?.href ?? ''
    if (href.startsWith('http') && !href.includes('duckduckgo.com') && !href.includes('duck.co')) {
      results.push({
        url: href,
        title: anchor?.textContent?.trim() ?? '',
        description: desc?.textContent?.trim() ?? '',
      })
    }
  })
  return results
}

/** Runs inside a Bing search results page. */
function _extractBingResults(): GoogleResult[] {
  const results: GoogleResult[] = []
  const containers = document.querySelectorAll('#b_results > li.b_algo, .b_algo')
  containers.forEach((el) => {
    const anchor = el.querySelector<HTMLAnchorElement>('h2 a, a.tilk')
    const desc = el.querySelector('.b_caption p, .b_paractl')
    const href = anchor?.href ?? ''
    if (href.startsWith('http') && !href.includes('bing.com') && !href.includes('microsoft.com')) {
      results.push({
        url: href,
        title: anchor?.textContent?.trim() ?? '',
        description: desc?.textContent?.trim() ?? '',
      })
    }
  })
  return results
}

/** Runs inside a Yahoo search results page. */
function _extractYahooResults(): GoogleResult[] {
  const results: GoogleResult[] = []
  const containers = document.querySelectorAll('#web .dd.algo, .compTitle, .algo-sr')
  containers.forEach((el) => {
    const anchor = el.querySelector<HTMLAnchorElement>('h3 a, a.ac-algo')
    const desc = el.querySelector('.compText p, .fz-ms')
    const href = anchor?.href ?? ''
    if (href.startsWith('http') && !href.includes('yahoo.com') && !href.includes('search.yahoo')) {
      results.push({
        url: href,
        title: anchor?.textContent?.trim() ?? '',
        description: desc?.textContent?.trim() ?? '',
      })
    }
  })
  return results
}

/**
 * Injected: scrolls the SERP down to simulate a human scanning results.
 * Synchronous — timing/dwell is handled by the orchestrator's _delay().
 */
function _humanScrollSerp(): void {
  const docHeight = document.body?.scrollHeight ?? 0
  const viewHeight = window.innerHeight
  if (docHeight <= viewHeight) return
  // Scroll to a random position between 30% and 70% of the page
  const randFactor = 0.3 + Math.random() * 0.4
  window.scrollTo({ top: Math.floor(docHeight * randFactor), behavior: 'instant' })
}

/**
 * Injected: dispatches hover/mouseenter events on a few visible SERP result
 * links — simulates a user mousing over results before clicking.
 */
function _humanHoverSerpResults(): void {
  const candidates: Element[] = Array.from(
    document.querySelectorAll(
      'h3 a, .yuRUbf a, a.result__a, [data-testid="result-title-a"], #b_results h2 a, #web h3 a',
    ),
  ).filter((el) => (el as HTMLElement).offsetParent !== null)
  if (candidates.length === 0) return
  const count = Math.min(2 + Math.floor(Math.random() * 2), candidates.length)
  const indices = new Set<number>()
  while (indices.size < count) indices.add(Math.floor(Math.random() * candidates.length))
  indices.forEach((i) => {
    candidates[i].dispatchEvent(new MouseEvent('mouseover', { bubbles: true, cancelable: true }))
    candidates[i].dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, cancelable: true }))
  })
}

/** Detects whether the current page is a CAPTCHA or consent gate (works across engines). */
function _isBlockedPage(): boolean {
  const text = (document.title + ' ' + (document.body?.innerText ?? '')).toLowerCase()
  return (
    document.querySelector('form#captcha-form') !== null ||
    document.querySelector('#recaptcha') !== null ||
    document.querySelector('div.g-recaptcha') !== null ||
    document.querySelector('.cf-challenge-running') !== null ||
    text.includes('unusual traffic') ||
    text.includes('captcha') ||
    text.includes("i'm not a robot") ||
    text.includes("verify you're human") ||
    text.includes('please verify') ||
    text.includes('access denied') ||
    // Google consent page (EU)
    text.includes('before you continue') ||
    document.querySelector('button[jsname="tggaKe"]') !== null
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Orchestrator
// ─────────────────────────────────────────────────────────────────────────────

class ScrapingOrchestrator {
  private session: ScrapingSession | null = null
  /** Monotonically-increasing counter — each _run() call captures its own id.
   *  Used to abort stale loops after pause+resume. */
  private _runId = 0

  // ── Humanization (SessionEngine) ────────────────────────────────────────
  /** Per-session engine instance — configured in start() with the active stealth profile. */
  private _sessionEngine = new SessionEngine()
  /** Timestamp when the current scraping session started (for fatigue calc). */
  private _sessionStartTime = 0
  /** Timestamp of the last micro-break — used to gate shouldTakeBreak(). */
  private _lastBreakAt = 0

  // ── Public API ─────────────────────────────────────────────────────────────

  async start(params: ScrapingStartParams): Promise<void> {
    if (this.session?.status === 'running') {
      log.warn('Scraping already running — ignoring start')
      return
    }

    log.info(`Starting scraping for inv:${params.invId}, target:${params.targetCount}`)

    // Load persistent history of already-scraped domains + emails
    await history.load()

    // Configure SessionEngine with the active stealth profile so inter-page
    // delays and micro-breaks match the user's configured browsing rhythm.
    this._sessionEngine.configure(stealthService.getBehaviorProfile())
    this._sessionStartTime = Date.now()
    this._lastBreakAt = Date.now()
    log.info(`Humanization active — profile: ${stealthService.getProfile()}`)

    const tab = await chrome.tabs.create({
      url: 'about:blank',
      active: false, // keep the user's current view, scrape in a background tab
    })

    if (!tab.id) {
      log.error('Failed to create scraping tab')
      this._broadcastError(params.invId, 'Could not open scraping tab')
      return
    }

    // Build query variants — first try AI criteria, fall back to heuristic builder
    let queryVariants: string[] = []
    let searchCriteriaFamilies: SearchCriteriaFamily[] = []

    try {
      const { getAIProvider } = await import('@services/ai.service')
      const provider = getAIProvider()
      const brief: import('@/providers/ai/ai.provider').CampaignBrief = {
        contactType: params.contactType as import('@/providers/ai/ai.provider').ContactType,
        affinityCategory: params.affinityCategory,
        affinitySubcategory: params.affinitySubcategory,
        country: params.country,
        language: params.language,
        consistency: params.consistency,
        description: params.query,
        reportLanguage: params.language,
      }
      const criteriaResult = await provider.generateSearchCriteria(brief)
      if (criteriaResult.success && criteriaResult.data?.families?.length) {
        searchCriteriaFamilies = criteriaResult.data.families
          .sort((a, b) => a.priority - b.priority)
        // Flatten families (by priority) into variant list
        queryVariants = searchCriteriaFamilies.flatMap((f) => f.queries)
        log.info(`AI generated ${searchCriteriaFamilies.length} criteria families (${queryVariants.length} queries)`)
      }
    } catch (err) {
      log.warn('AI criteria generation failed, falling back to heuristic:', (err as Error).message)
    }

    // Fallback to heuristic query builder
    if (queryVariants.length === 0) {
      queryVariants = this._buildQueryVariants(params)
    }

    const acceptThreshold = getAcceptanceThreshold(params.consistency, params.scrapingMode)

    log.info(
      `Mode: ${params.scrapingMode}, consistency: ${params.consistency}, threshold: ${acceptThreshold}`,
    )
    log.info(`Query variants: ${queryVariants.length}, engines: google, duckduckgo, bing, yahoo`)

    const defaultEngine = (): EngineState => ({ page: 0, blocked: false, exhausted: false })

    this.session = {
      ...params,
      tabId: tab.id,
      status: 'running',
      urlQueue: [],
      visitedUrls: new Set(),
      seenEmails: new Set(),
      contactsFound: 0,
      pagesScanned: 0,
      discardedCount: 0,
      energyConsumed: 0,
      startTime: Date.now(),
      acceptThreshold,
      engines: {
        google: defaultEngine(),
        duckduckgo: defaultEngine(),
        bing: defaultEngine(),
        yahoo: defaultEngine(),
      },
      engineOrder: ['google', 'duckduckgo', 'bing', 'yahoo'],
      currentEngineIdx: 0,
      queryVariants,
      currentVariantIdx: 0,
      searchCriteriaFamilies,
      seedUrls: [],
      _saveCounter: 0,
      domainsChecked: 0,
      formsFound: 0,
      currentDomain: '',
    }

    // Immediately notify the sidepanel that scraping has started.
    this._broadcastProgress()

    // Listen for tab closure — cancel session if user closes the tab
    const onTabRemoved = (tabId: number) => {
      if (this.session?.tabId === tabId && (this.session.status === 'running' || this.session.status === 'paused')) {
        log.info('Scraping tab closed by user — cancelling session')
        this.session.status = 'cancelled'
        this._broadcastProgress()
        chrome.tabs.onRemoved.removeListener(onTabRemoved)
      }
    }
    chrome.tabs.onRemoved.addListener(onTabRemoved)

    this._run().catch((e) => {
      log.error('Scraping run loop crashed', e)
      if (this.session) {
        this.session.status = 'error'
        this._broadcastError(this.session.invId, (e as Error).message)
      }
    })
  }

  pause(): void {
    if (this.session?.status === 'running') {
      this.session.status = 'paused'
      log.info('Scraping paused')
      this._broadcastProgress()
      // The _run() polling loop (500 ms ticks) keeps the service worker alive
      // while paused — no extra keepalive needed.
    }
  }

  resume(): void {
    if (this.session?.status === 'paused') {
      this.session.status = 'running'
      // Treat the pause duration as a break so we don't trigger a micro-break
      // immediately on the first resumed iteration.
      this._lastBreakAt = Date.now()
      log.info('Scraping resumed')
      this._broadcastProgress() // immediately tell the UI we're running again
      // No need to call _run() again — the 500 ms polling loop inside _run()
      // is still alive and will pick up the status change on its next tick.
    } else {
      // The service worker was restarted while the UI thought scraping was
      // paused.  Broadcast a reset so the sidepanel returns to idle.
      log.warn('Resume: no paused session found — resetting UI state')
      this._broadcastOrphanReset()
    }
  }

  cancel(): void {
    if (this.session && this.session.status !== 'cancelled') {
      this.session.status = 'cancelled'
      log.info('Scraping cancelled')
      this._broadcastProgress()
      this._closeTab()
    } else if (!this.session) {
      // SW was restarted while the UI had an active scraping session.
      log.warn('Cancel: no active session — resetting UI state')
      this._broadcastOrphanReset()
    }
  }

  getStatus(): ScrapingStatus {
    return this.session?.status ?? 'idle'
  }

  /**
   * DEV/TEST — Probe a single domain and broadcast DEV_TEST_RESULT.
   * Opens a tab, runs ContactPageProber, then broadcasts the result.
   * Does NOT interfere with any active scraping session.
   */
  async probeOneDomain(domain: string): Promise<void> {
    log.info(`[DevTest] Probing domain: ${domain}`)

    let tabId: number | undefined

    try {
      // Open a visible tab so the developer can watch the probe
      const tab = await chrome.tabs.create({
        url: `https://${domain}`,
        active: true,
      })

      if (!tab.id) {
        this._broadcastDevTestResult(domain, undefined, 'Could not open tab')
        return
      }

      tabId = tab.id

      // Wait for initial page load
      await new Promise<void>((resolve) => {
        let settled = false
        const onUpdated = (id: number, changeInfo: { status?: string }) => {
          if (id === tabId && changeInfo.status === 'complete') {
            if (!settled) {
              settled = true
              chrome.tabs.onUpdated.removeListener(onUpdated)
              resolve()
            }
          }
        }
        chrome.tabs.onUpdated.addListener(onUpdated)
        setTimeout(() => {
          if (!settled) {
            settled = true
            chrome.tabs.onUpdated.removeListener(onUpdated)
            resolve()
          }
        }, 15_000)
      })

      const prober = new ContactPageProber(tabId, 6)
      const result = await prober.probe(domain)

      log.info(`[DevTest] Done: ${domain}`, {
        hasForm: result.hasForm,
        emails: result.emails,
        contactMethod: result.contactMethod,
        navigationsUsed: result.navigationsUsed,
      })

      this._broadcastDevTestResult(domain, result)
    } catch (e) {
      const msg = (e as Error).message
      log.error(`[DevTest] Probe failed for ${domain}`, msg)
      this._broadcastDevTestResult(domain, undefined, msg)
    }
    // Tab stays open intentionally so the dev can inspect the result
  }

  private _broadcastDevTestResult(domain: string, result?: ProbeResult, error?: string): void {
    chrome.runtime
      .sendMessage({
        type: MessageType.DEV_TEST_RESULT,
        payload: { domain, result, error },
      })
      .catch(() => {})
  }

  // ── Core run loop ──────────────────────────────────────────────────────────

  /** Tracks the last time pagesScanned advanced — used by the watchdog. */
  private _lastProgressAt = 0

  private async _run(): Promise<void> {
    const myRunId = ++this._runId
    const s = this.session
    if (!s) return

    this._lastProgressAt = Date.now()

    // ── Watchdog: detects stalls (no progress for 45 s) ──────────────────────
    const WATCHDOG_INTERVAL = 10_000
    const STALL_TIMEOUT = 45_000
    let consecutiveErrors = 0
    const MAX_CONSECUTIVE_ERRORS = 8

    const watchdog = setInterval(() => {
      if (this._runId !== myRunId || !this.session || this.session.status !== 'running') {
        clearInterval(watchdog)
        return
      }
      if (Date.now() - this._lastProgressAt > STALL_TIMEOUT) {
        log.error('Watchdog: stall detected — forcing completion')
        clearInterval(watchdog)
        this._finishRun(myRunId, 'stalled')
      }
    }, WATCHDOG_INTERVAL)

    let finishReason: FinishReason = 'queries-exhausted'

    try {
      // ── Precise mode: AI seeding phase ─────────────────────────────────────
      if (s.scrapingMode === 'precise' && s.seedUrls.length === 0 && s.pagesScanned === 0) {
        log.info('Precise mode — requesting AI seed targets')
        this._broadcastProgress('', 'seeding')
        const seeds = await this._fetchAISeedTargets()
        if (this._runId !== myRunId) return
        if (seeds.length > 0) {
          s.seedUrls = seeds
          this._enqueueUrls(seeds)
          log.info(`AI seeded ${seeds.length} target URLs`)
        }
      }

      const maxPagesScanned = Math.min(s.targetCount * 5, 500)

      while (
        (s.status === 'running' || s.status === 'paused') &&
        s.contactsFound < s.targetCount &&
        s.pagesScanned < maxPagesScanned &&
        consecutiveErrors < MAX_CONSECUTIVE_ERRORS
      ) {
        if (this._runId !== myRunId) return

        // If paused, keep the SW alive by polling every 500 ms.
        // The loop resumes naturally when resume() sets status → 'running'.
        if (s.status === 'paused') {
          await new Promise<void>((resolve) => setTimeout(resolve, 500))
          continue
        }

        try {
          // Refill URL queue from search engines (round-robin)
          if (s.urlQueue.length === 0) {
            const filled = await this._fetchNextSearchPage()
            if (this._runId !== myRunId) return
            // If status changed mid-search (pause/cancel), go back to top so
            // the pause handler or while condition exit correctly.
            if (s.status !== 'running') continue
            if (!filled) {
              // Try next query variant with all engines reset
              if (s.currentVariantIdx + 1 < s.queryVariants.length) {
                s.currentVariantIdx++
                this._resetEngines()
                log.debug(`Switching to query variant ${s.currentVariantIdx}`)
                // Human inter-variant cooldown: a brief pause before changing
                // the search query prevents predictable rapid engine switching.
                await this._delay(3000, 7000)
                continue
              }
              log.info('All search engines & query variants exhausted')
              finishReason = 'queries-exhausted'
              break
            }
            continue
          }

          // Take next URL from queue
          const url = s.urlQueue.shift()!
          const normUrl = normalizeUrl(url)

          // ── Triple dedup: session Set + global history + blocked domains ────
          if (s.visitedUrls.has(normUrl) || history.hasDomain(normUrl) || isBlockedDomain(url)) {
            continue
          }
          s.visitedUrls.add(normUrl)
          history.addDomain(normUrl)

          // Check energy
          if (!this._consumeEnergy()) {
            log.warn('Energy exhausted — stopping scraping')
            finishReason = 'energy-exhausted'
            break
          }

          // Navigate to the page
          await this._navigateTo(url)
          if (this._runId !== myRunId) return
          // If paused mid-navigation: continue → while condition keeps us alive.
          // If cancelled: continue → while condition exits the loop.
          if (s.status !== 'running') continue

          s.pagesScanned++
          this._lastProgressAt = Date.now()

          // ── Domain-level contact page probing (form-first) ──────────────
          const domain = extractDomain(url)
          s.currentDomain = domain
          s.domainsChecked++
          this._broadcastProgress(url, 'probing')

          // Activate scanner overlay on the tab
          this._broadcastScanner(domain, s.domainsChecked, s.targetCount)

          const prober = new ContactPageProber(s.tabId, 6)
          const probeResult = await prober.probe(domain)
          if (this._runId !== myRunId) return

          // Deactivate scanner
          this._deactivateScanner()

          // Track navigations used by the prober
          s.pagesScanned += probeResult.navigationsUsed

          if (probeResult.hasForm) s.formsFound++

          // Mark emails as seen
          for (const e of probeResult.emails) {
            if (!s.seenEmails.has(e.toLowerCase()) && !history.hasEmail(e)) {
              s.seenEmails.add(e.toLowerCase())
              history.addEmail(e)
            }
          }

          // Build page data for scoring
          const pageData: PageContact = {
            emails: probeResult.emails,
            orgName: probeResult.domainMeta.title || domain,
            description: probeResult.domainMeta.description,
            keywords: [],
            domain,
            contactPage: probeResult.contactPageUrl || url,
          }

          // Form-first: only accept domains that have a real contact form.
          // Email-only contacts are skipped — outreach is via form submission, not email.
          if (probeResult.hasForm) {
            const res = await this._evaluateAndAccept(url, pageData, myRunId, probeResult)
            if (res === 'stale') return
          } else {
            log.debug(`Skipped ${domain} — no contact form found (emails found: ${probeResult.emails.length})`)
          }

          this._broadcastProgress(url)

          consecutiveErrors = 0

          // Fatigue-scaled inter-page delay.
          // getFatigueMultiplier returns 1.0 (fresh) → ~0.65 (fatigued).
          // Lower multiplier → longer delay, simulating a tired human slowing down.
          const _activeMs = Date.now() - this._sessionStartTime
          const _fatigue = this._sessionEngine.getFatigueMultiplier(_activeMs)
          const _delayMin = Math.round(1500 + (1.0 - _fatigue) * 1500) // 1500–3000 ms
          const _delayMax = Math.round(2500 + (1.0 - _fatigue) * 2500) // 2500–5000 ms
          await this._delay(_delayMin, _delayMax)

          // Probabilistic micro-break: pause once per microBreakInterval minutes
          // to mimic a human glancing away, reading a snippet, adjusting chair, etc.
          const _timeSinceBreak = Date.now() - this._lastBreakAt
          if (this._sessionEngine.shouldTakeBreak(_timeSinceBreak)) {
            const _bp = stealthService.getBehaviorProfile()
            const [_bMin, _bMax] = _bp.microBreakDuration
            const _breakMs = _bMin + Math.random() * (_bMax - _bMin)
            log.debug(`Human micro-break: ${(_breakMs / 1000).toFixed(1)}s`)
            this._lastBreakAt = Date.now()
            await this._delay(_breakMs, _breakMs + 500)
          }

          // Periodic history flush (every 10 pages)
          s._saveCounter++
          if (s._saveCounter % 10 === 0) {
            history.save().catch(() => {})
          }
        } catch (iterErr) {
          consecutiveErrors++
          log.warn(
            `Iteration error (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}):`,
            (iterErr as Error).message,
          )
          await this._delay(2000, 4000)
        }
      }

      if (s.contactsFound >= s.targetCount) finishReason = 'target-reached'
      else if (s.pagesScanned >= maxPagesScanned) finishReason = 'max-pages'
      else if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) finishReason = 'stalled'
    } finally {
      clearInterval(watchdog)
      // Always persist history at the end of a run
      await history.save()
    }

    this._finishRun(myRunId, finishReason)
  }

  /** Wraps up a run: sets status, broadcasts completion, closes tab. */
  private _finishRun(myRunId: number, finishReason: FinishReason): void {
    if (this._runId !== myRunId) return
    const s = this.session
    if (!s) return

    if (s.status === 'running') {
      s.status = 'complete'
    }
    this._broadcastProgress()

    if (s.status === 'complete') {
      this._broadcastComplete(finishReason)
      setTimeout(() => this._closeTab(), 3000)
    }
  }

  /**
   * Evaluate a candidate page and accept/discard it based on scoring.
   * Marks emails as seen so they cannot be stored twice.
   */
  private async _evaluateAndAccept(
    url: string,
    data: PageContact,
    myRunId: number,
    probeResult?: ProbeResult,
  ): Promise<'accepted' | 'discarded' | 'stale'> {
    const s = this.session!

    const candidate: CandidateData = {
      orgName: data.orgName,
      domain: data.domain,
      description: data.description,
      keywords: data.keywords,
      emails: data.emails,
      contactPage: data.contactPage,
      url,
      hasForm: probeResult?.hasForm,
      formFieldCount: probeResult?.formFields?.length,
      hasCaptcha: probeResult?.hasCaptcha,
      contactMethod: probeResult?.contactMethod,
    }

    let scoreResult: CandidateScore
    if (s.scrapingMode === 'precise') {
      scoreResult = await scoreWithAI(candidate, s)
    } else {
      scoreResult = scoreHeuristic(candidate, s)
    }

    if (this._runId !== myRunId) return 'stale'

    // Mark ALL emails from this page as seen (regardless of accept/discard)
    for (const e of data.emails) {
      s.seenEmails.add(e.toLowerCase())
      history.addEmail(e)
    }

    if (scoreResult.score >= s.acceptThreshold) {
      const contact = this._buildContact(url, data, s, scoreResult, probeResult)
      s.contactsFound++
      this._broadcastContact(contact)
      this._broadcastProgress(url)
      return 'accepted'
    } else {
      s.discardedCount++
      const contact = this._buildContact(url, data, s, scoreResult, probeResult)
      this._broadcastContact({ ...contact, discarded: true })
      log.debug(`Discarded ${candidate.domain} (score ${scoreResult.score} < ${s.acceptThreshold})`)
      return 'discarded'
    }
  }

  // ── AI seed targets (precise mode) ─────────────────────────────────────────

  private async _fetchAISeedTargets(): Promise<string[]> {
    const s = this.session
    if (!s) return []

    try {
      const { getAIProvider } = await import('@services/ai.service')
      const provider = getAIProvider()

      const brief: import('@/providers/ai/ai.provider').CampaignBrief = {
        contactType: s.contactType as import('@/providers/ai/ai.provider').ContactType,
        affinityCategory: s.affinityCategory,
        affinitySubcategory: s.affinitySubcategory,
        country: s.country,
        language: s.language,
        consistency: s.consistency,
        description: s.query,
        reportLanguage: s.language,
      }

      const result = await provider.generateSearchTargets(brief)
      if (!result.success || !result.data?.targets?.length) return []

      return result.data.targets
        .map((t) => t.url)
        .filter((u) => u.startsWith('http') && !isBlockedDomain(u) && !history.hasDomain(u))
        .slice(0, 20)
    } catch (err) {
      log.warn('AI seed target generation failed:', (err as Error).message)
      return []
    }
  }

  // ── Multi-engine search ────────────────────────────────────────────────────

  /** Add URLs to the queue, filtering out already-visited and blocked ones. */
  private _enqueueUrls(urls: string[]): number {
    const s = this.session!
    let added = 0
    for (const raw of urls) {
      const norm = normalizeUrl(raw)
      if (!s.visitedUrls.has(norm) && !history.hasDomain(norm) && !isBlockedDomain(raw)) {
        s.urlQueue.push(raw)
        added++
      }
    }
    return added
  }

  /** Reset all engines for the next query variant. */
  private _resetEngines(): void {
    const s = this.session!
    for (const eng of s.engineOrder) {
      s.engines[eng] = { page: 0, blocked: false, exhausted: false }
    }
    s.currentEngineIdx = 0
  }

  /**
   * Try to fill the URL queue from the next available search engine.
   * Round-robins through engines. Returns false only when ALL engines
   * are blocked or exhausted for the current query variant.
   */
  private async _fetchNextSearchPage(): Promise<boolean> {
    const s = this.session!
    const totalEngines = s.engineOrder.length

    for (let attempt = 0; attempt < totalEngines; attempt++) {
      const engName = s.engineOrder[s.currentEngineIdx]
      const eng = s.engines[engName]

      // Advance to next engine for the following call
      s.currentEngineIdx = (s.currentEngineIdx + 1) % totalEngines

      if (eng.blocked || eng.exhausted) continue

      const query = s.queryVariants[s.currentVariantIdx]
      const page = eng.page

      const { url: searchUrl, extractor } = this._buildSearchUrl(engName, query, page)

      log.debug(`[${engName}] page ${page} — variant ${s.currentVariantIdx}`)

      await this._navigateTo(searchUrl)
      if (s.status !== 'running') return false
      await this._delay(800, 1500)
      if (s.status !== 'running') return false

      // Check for CAPTCHA / block
      const isBlocked = await this._runInTab<boolean>(_isBlockedPage)
      if (isBlocked) {
        log.warn(`[${engName}] CAPTCHA/block detected — marking engine as blocked`)
        eng.blocked = true
        continue
      }

      // Human SERP reading: scroll down and hover over a few result links
      // before extracting URLs — reduces the "bot reads instantly" signal.
      await this._runInTab(_humanScrollSerp)
      await this._delay(700, 1400)
      if (s.status !== 'running') return false
      await this._runInTab(_humanHoverSerpResults)
      await this._delay(300, 600)
      if (s.status !== 'running') return false

      const results = await this._runInTab<GoogleResult[]>(extractor)
      if (!results || results.length === 0) {
        log.debug(`[${engName}] No results — marking exhausted`)
        eng.exhausted = true
        continue
      }

      const newUrls = results.map((r) => r.url).filter(Boolean)
      const added = this._enqueueUrls(newUrls)
      eng.page++

      log.debug(`[${engName}] +${added} URLs (queue: ${s.urlQueue.length})`)

      await this._delay(1000, 2000)
      return true
    }

    // All engines blocked or exhausted for this variant
    return false
  }

  /** Build the search URL and pick the right extractor for each engine. */
  private _buildSearchUrl(
    engine: SearchEngine,
    query: string,
    page: number,
  ): { url: string; extractor: () => GoogleResult[] } {
    const q = encodeURIComponent(query)
    switch (engine) {
      case 'google': {
        const start = page * 10
        return {
          url: `https://www.google.com/search?q=${q}&start=${start}&num=10&hl=en`,
          extractor: _extractGoogleResults,
        }
      }
      case 'duckduckgo':
        // DDG HTML-only mode (no JS required)
        return {
          url:
            page === 0
              ? `https://html.duckduckgo.com/html/?q=${q}`
              : `https://html.duckduckgo.com/html/?q=${q}&s=${page * 30}`,
          extractor: _extractDuckDuckGoResults,
        }
      case 'bing': {
        const first = page * 10 + 1
        return {
          url: `https://www.bing.com/search?q=${q}&first=${first}`,
          extractor: _extractBingResults,
        }
      }
      case 'yahoo':
        return {
          url: `https://search.yahoo.com/search?p=${q}&b=${page * 10 + 1}`,
          extractor: _extractYahooResults,
        }
    }
  }

  // ── Contact extraction ─────────────────────────────────────────────────────

  private _buildContact(url: string, data: PageContact, s: ScrapingSession, score: CandidateScore, probeResult?: ProbeResult) {
    // Infer region from URL TLD
    let region = 'International'
    try {
      const hostname = new URL(url).hostname
      const tld = hostname.split('.').pop()?.toLowerCase() ?? ''
      const TLD_MAP: Record<string, string> = {
        es: 'Spain',
        fr: 'France',
        de: 'Germany',
        it: 'Italy',
        uk: 'United Kingdom',
        nl: 'Netherlands',
        pt: 'Portugal',
        br: 'Brazil',
        mx: 'Mexico',
        ar: 'Argentina',
        cl: 'Chile',
        au: 'Australia',
        ca: 'Canada',
        pl: 'Poland',
        se: 'Sweden',
      }
      region = TLD_MAP[tld] ?? s.country ?? 'International'
    } catch {
      /* keep default */
    }

    const primaryEmail = data.emails[0] ?? ''

    return {
      name: data.orgName || data.domain,
      email: primaryEmail,
      role: '',
      organization: data.orgName || data.domain,
      website: data.domain ? `https://${data.domain}` : url,
      contactPage: probeResult?.contactPageUrl || data.contactPage || url,
      specialization: data.description.slice(0, 200),
      topics: data.keywords.length
        ? data.keywords
        : [s.affinityCategory, s.affinitySubcategory].filter(Boolean),
      region,
      discoveryScore: score.score,
      classification: score.classification,
      matchSignals: score.matchSignals,
      // Form-centric fields
      contactFormUrl: probeResult?.contactPageUrl ?? null,
      formFields: probeResult?.formFields ?? [],
      contactMethod: probeResult?.contactMethod ?? (primaryEmail ? 'email' : 'none'),
      domainMeta: probeResult?.domainMeta ?? { title: data.orgName, description: data.description },
      hasCaptcha: probeResult?.hasCaptcha ?? false,
    }
  }

  // ── Chrome tab helpers ─────────────────────────────────────────────────────

  private async _navigateTo(url: string): Promise<void> {
    const s = this.session
    if (!s) return

    return new Promise((resolve) => {
      let settled = false
      const onUpdated = (tabId: number, changeInfo: { status?: string }) => {
        if (tabId === s.tabId && changeInfo.status === 'complete') {
          if (!settled) {
            settled = true
            chrome.tabs.onUpdated.removeListener(onUpdated)
            resolve()
          }
        }
      }
      chrome.tabs.onUpdated.addListener(onUpdated)

      chrome.tabs.update(s.tabId, { url }, () => {
        // Safety timeout: resolve after 15 s and clean up listener
        setTimeout(() => {
          if (!settled) {
            settled = true
            chrome.tabs.onUpdated.removeListener(onUpdated)
            resolve()
          }
        }, 15_000)
      })
    })
  }

  /** Run a self-contained function in the active scraping tab. Retries once on failure. */
  private async _runInTab<T>(fn: () => T): Promise<T | null> {
    const s = this.session
    if (!s) return null
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: s.tabId },
          func: fn,
        })
        return (results?.[0]?.result as T) ?? null
      } catch (e) {
        log.warn(`executeScript failed (attempt ${attempt + 1})`, (e as Error).message)
        if (attempt === 0) await this._delay(500, 1000)
      }
    }
    return null
  }

  private _closeTab(): void {
    if (this.session?.tabId) {
      chrome.tabs.remove(this.session.tabId).catch(() => {})
      this.session = null
    }
  }

  // ── Energy ─────────────────────────────────────────────────────────────────

  private _consumeEnergy(): boolean {
    const result = energyService.consume('scrapeUrl')
    if (this.session) this.session.energyConsumed += result.consumed
    return result.success
  }

  // ── Query construction ─────────────────────────────────────────────────────

  private _buildQueryVariants(p: ScrapingStartParams): string[] {
    const base = [p.affinitySubcategory, p.affinityCategory, p.country].filter(Boolean).join(' ')
    const baseNoCty = [p.affinitySubcategory, p.affinityCategory].filter(Boolean).join(' ')

    const typeSuffix =
      p.contactType === 'corporate'
        ? 'company organization'
        : p.contactType === 'individual'
          ? 'professional consultant freelance'
          : 'ngo association foundation institution'

    const typeLabel =
      p.contactType === 'corporate'
        ? 'companies'
        : p.contactType === 'individual'
          ? 'professionals'
          : 'organizations'

    // Generate diverse query patterns to maximise URL coverage across engines
    const variants = [
      // Direct contact queries
      `${base} ${typeSuffix} email contact`,
      `${base} ${typeSuffix} contact us`,
      `${base} "contact" "email" ${p.country}`,

      // Directory / list queries
      `${baseNoCty} ${typeLabel} directory ${p.country}`,
      `list of ${baseNoCty} ${typeLabel} ${p.country}`,
      `top ${baseNoCty} ${typeLabel} ${p.country}`,

      // User's raw description — often the most targeted
      `${p.query} ${p.country} email`,
      `${p.query} contact ${typeSuffix}`,

      // Niche-specific patterns
      `${p.affinitySubcategory} ${p.country} association members`,
      `${p.affinitySubcategory} ${p.country} network`,

      // Alternative phrasing
      `"${p.affinitySubcategory}" ${p.country} contact email`,
      `${base} site:.${p.country === 'Spain' ? 'es' : p.country === 'France' ? 'fr' : p.country === 'Germany' ? 'de' : 'org'}`,
    ]

    // Deduplicate and remove empties
    const seen = new Set<string>()
    return variants
      .map((v) => v.replace(/\s+/g, ' ').trim())
      .filter((v) => {
        if (!v || seen.has(v)) return false
        seen.add(v)
        return true
      })
  }

  // ── Messaging ──────────────────────────────────────────────────────────────

  /**
   * Broadcast a terminal (non-running/non-paused) status to force the sidepanel
   * to reset to idle.  Called when resume() or cancel() is received but the
   * in-memory session is gone (e.g. the service worker was restarted while
   * scraping was paused).
   */
  private _broadcastOrphanReset(): void {
    chrome.runtime
      .sendMessage({
        type: MessageType.SCRAPING_PROGRESS,
        payload: {
          invId: '',
          phase: 'contacts',
          currentUrl: '',
          currentDomain: '',
          urlsFound: 0,
          contactsFound: 0,
          discardedCount: 0,
          targetCount: 0,
          pagesScanned: 0,
          domainsChecked: 0,
          formsFound: 0,
          energyLeft: energyService.getState().current,
          status: 'cancelled',
        },
      })
      .catch(() => {})
  }

  private _broadcastProgress(currentUrl = '', phaseOverride?: string): void {
    const s = this.session
    if (!s) return

    const phase = phaseOverride ?? (s.urlQueue.length > 0 ? 'contacts' : 'google')

    chrome.runtime
      .sendMessage({
        type: MessageType.SCRAPING_PROGRESS,
        payload: {
          invId: s.invId,
          phase,
          currentUrl,
          currentDomain: s.currentDomain,
          urlsFound: s.visitedUrls.size,
          contactsFound: s.contactsFound,
          discardedCount: s.discardedCount,
          targetCount: s.targetCount,
          pagesScanned: s.pagesScanned,
          domainsChecked: s.domainsChecked,
          formsFound: s.formsFound,
          energyLeft: energyService.getState().current,
          status: s.status,
        },
      })
      .catch(() => {
        /* side panel might be closed */
      })
  }

  private _broadcastContact(contact: {
    name: string
    email: string
    role: string
    organization: string
    website: string
    contactPage: string
    specialization: string
    topics: string[]
    region: string
    discoveryScore: number
    classification: 'high' | 'medium' | 'low'
    matchSignals: string[]
    discarded?: boolean
    contactFormUrl?: string | null
    formFields?: Array<{ name: string; type: string; label?: string; required?: boolean }>
    contactMethod?: 'form' | 'email' | 'both' | 'none'
    domainMeta?: { title: string; description: string; favicon?: string; language?: string }
    hasCaptcha?: boolean
  }): void {
    const s = this.session
    if (!s) return
    chrome.runtime
      .sendMessage({
        type: MessageType.SCRAPING_CONTACT,
        payload: { invId: s.invId, contact },
      })
      .catch(() => {})
  }

  private _broadcastComplete(finishReason?: FinishReason): void {
    const s = this.session
    if (!s) return
    chrome.runtime
      .sendMessage({
        type: MessageType.SCRAPING_COMPLETE,
        payload: {
          invId: s.invId,
          totalContacts: s.contactsFound,
          totalDiscarded: s.discardedCount,
          totalPagesScanned: s.pagesScanned,
          energyConsumed: s.energyConsumed,
          durationMs: Date.now() - s.startTime,
          finishReason,
        },
      })
      .catch(() => {})
  }

  private _broadcastError(invId: string, error: string): void {
    chrome.runtime
      .sendMessage({
        type: MessageType.SCRAPING_ERROR,
        payload: { invId, error },
      })
      .catch(() => {})
  }

  // ── Scanner overlay ─────────────────────────────────────────────────────

  private _broadcastScanner(domain: string, domainsChecked: number, totalDomains: number): void {
    const s = this.session
    if (!s) return
    chrome.tabs
      .sendMessage(s.tabId, {
        type: MessageType.SCANNER_ACTIVATE,
        payload: { domain, domainsChecked, totalDomains },
      })
      .catch(() => {})
  }

  private _deactivateScanner(): void {
    const s = this.session
    if (!s) return
    chrome.tabs
      .sendMessage(s.tabId, {
        type: MessageType.SCANNER_DEACTIVATE,
        payload: undefined,
      })
      .catch(() => {})
  }

  // ── Delay ──────────────────────────────────────────────────────────────────

  private _delay(minMs: number, maxMs: number): Promise<void> {
    const ms = minMs + Math.random() * (maxMs - minMs)
    return new Promise((r) => setTimeout(r, ms))
  }
}

// Singleton
export const scrapingOrchestrator = new ScrapingOrchestrator()
