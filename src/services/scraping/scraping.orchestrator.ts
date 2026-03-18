/**
 * ScrapingOrchestrator — Real Google-based contact scraping.
 *
 * Architecture
 * ────────────
 * 1. Opens (or reuses) ONE visible Chrome tab.
 * 2. Navigates through Google search pages to collect URLs.
 * 3. Visits each URL to extract contact information (emails, org name, etc.)
 * 4. Streams progress + individual contacts back to the side panel via
 *    chrome.runtime.sendMessage so the user sees real-time updates.
 * 5. Respects pause / resume / cancel commands from the side panel.
 * 6. Deducts 1 energy unit per URL visited (10 scrapes = 1% of max 1000).
 *
 * Google scraping notes
 * ─────────────────────
 * - Uses the user's real Chrome session (no API key needed).
 * - Injects extraction functions via chrome.scripting.executeScript so the
 *   user can watch every page load in the tab.
 * - Adds 1.5–3 s jitter delays between navigations to avoid bot detection.
 * - Detects CAPTCHA / consent pages and pauses automatically.
 */

import { MessageType } from '@core/types/message.types'
import { energyService } from '@services/energy.service'
import { Logger } from '@services/logger.service'

const log = Logger.create('ScrapingOrchestrator')

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ScrapingStartParams {
  invId: string
  query: string
  targetCount: number
  affinityCategory: string
  affinitySubcategory: string
  country: string
  language: string
  contactType: string
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

interface ScrapingSession extends ScrapingStartParams {
  tabId: number
  status: ScrapingStatus
  googlePage: number // current Google results page (0-based, 10 per page)
  urlQueue: string[] // URLs discovered from Google, not yet scraped
  visitedUrls: Set<string> // all URLs ever attempted (dedup)
  contactsFound: number
  pagesScanned: number
  energyConsumed: number
  startTime: number
  /** Parallel query variants to maximise URL diversity */
  queryVariants: string[]
  currentVariantIdx: number
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

/** Detects whether the current page is a CAPTCHA or consent gate. */
function _isBlockedPage(): boolean {
  const text = (document.title + ' ' + (document.body?.innerText ?? '')).toLowerCase()
  return (
    document.querySelector('form#captcha-form') !== null ||
    document.querySelector('#recaptcha') !== null ||
    document.querySelector('div.g-recaptcha') !== null ||
    text.includes('unusual traffic') ||
    text.includes('captcha') ||
    text.includes("i'm not a robot") ||
    text.includes("verify you're human") ||
    // Google consent page (EU)
    text.includes('before you continue') ||
    document.querySelector('button[jsname="tggaKe"]') !== null
  )
}

/**
 * Runs inside a contact/company page.
 * Returns extracted contact data, or null if the page yields nothing useful.
 */
function _extractPageContacts(): PageContact {
  const emails: string[] = []
  const seenEmails = new Set<string>()

  // 1. mailto: anchors
  document.querySelectorAll<HTMLAnchorElement>('a[href^="mailto:"]').forEach((a) => {
    const raw = a.href.replace('mailto:', '').split('?')[0].trim().toLowerCase()
    if (raw.includes('@') && !seenEmails.has(raw)) {
      seenEmails.add(raw)
      emails.push(raw)
    }
  })

  // 2. Regex over visible text
  const bodyText = document.body?.innerText ?? ''
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
  const textEmails = bodyText.match(emailRegex) ?? []
  textEmails.forEach((e) => {
    const norm = e.toLowerCase()
    if (!seenEmails.has(norm)) {
      seenEmails.add(norm)
      emails.push(norm)
    }
  })

  // 3. Page metadata
  const ogSiteName =
    document.querySelector<HTMLMetaElement>('meta[property="og:site_name"]')?.content?.trim() ?? ''
  const title = document.title?.trim() ?? ''
  const metaDesc =
    document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content?.trim() ?? ''
  const metaKeywords =
    document.querySelector<HTMLMetaElement>('meta[name="keywords"]')?.content?.trim() ?? ''

  let domain = ''
  try {
    domain = new URL(window.location.href).hostname.replace('www.', '')
  } catch {
    domain = ''
  }
  const cleanTitle = title.replace(/\s*[-|–—·…]\s*.{0,60}$/, '').trim()
  const orgName = ogSiteName || cleanTitle || domain

  // 4. Contact page link
  const contactHref =
    document.querySelector<HTMLAnchorElement>(
      'a[href*="contact"], a[href*="contacto"], a[href*="about"]',
    )?.href ?? ''

  const keywords = metaKeywords
    .split(',')
    .map((k) => k.trim())
    .filter((k) => k.length > 1)
    .slice(0, 8)

  return {
    emails,
    orgName,
    description: metaDesc.slice(0, 300),
    keywords,
    domain,
    contactPage: contactHref,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Orchestrator
// ─────────────────────────────────────────────────────────────────────────────

class ScrapingOrchestrator {
  private session: ScrapingSession | null = null
  /** Monotonically-increasing counter — each _run() call captures its own id.
   *  Used to abort stale loops after pause+resume. */
  private _runId = 0

  // ── Public API ─────────────────────────────────────────────────────────────

  async start(params: ScrapingStartParams): Promise<void> {
    if (this.session?.status === 'running') {
      log.warn('Scraping already running — ignoring start')
      return
    }

    log.info(`Starting scraping for inv:${params.invId}, target:${params.targetCount}`)

    const tab = await chrome.tabs.create({
      url: 'about:blank',
      active: true,
    })

    if (!tab.id) {
      log.error('Failed to create scraping tab')
      this._broadcastError(params.invId, 'Could not open scraping tab')
      return
    }

    // Build query variants from the campaign brief
    const queryVariants = this._buildQueryVariants(params)

    this.session = {
      ...params,
      tabId: tab.id,
      status: 'running',
      googlePage: 0,
      urlQueue: [],
      visitedUrls: new Set(),
      contactsFound: 0,
      pagesScanned: 0,
      energyConsumed: 0,
      startTime: Date.now(),
      queryVariants,
      currentVariantIdx: 0,
    }

    // Listen for tab closure — cancel session if user closes the tab
    const onTabRemoved = (tabId: number) => {
      if (this.session?.tabId === tabId && this.session.status === 'running') {
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
    }
  }

  resume(): void {
    if (this.session?.status === 'paused') {
      this.session.status = 'running'
      log.info('Scraping resumed')
      this._run().catch((e) => log.error('Resume loop crashed', e))
    }
  }

  cancel(): void {
    if (this.session && this.session.status !== 'cancelled') {
      this.session.status = 'cancelled'
      log.info('Scraping cancelled')
      this._broadcastProgress()
      this._closeTab()
    }
  }

  getStatus(): ScrapingStatus {
    return this.session?.status ?? 'idle'
  }

  // ── Core run loop ──────────────────────────────────────────────────────────

  private async _run(): Promise<void> {
    const myRunId = ++this._runId
    const s = this.session
    if (!s) return

    // Scan at most 5× target pages to avoid running indefinitely if hit-rate is low.
    // E.g. target=100 contacts → scan at most 500 pages (capped at 200).
    const maxPagesScanned = Math.min(s.targetCount * 5, 200)

    while (
      s.status === 'running' &&
      s.contactsFound < s.targetCount &&
      s.pagesScanned < maxPagesScanned
    ) {
      // A newer run has taken over (pause then resume) — exit silently
      if (this._runId !== myRunId) return

      // Refill URL queue if needed
      if (s.urlQueue.length === 0) {
        const hasMore = await this._fetchNextGooglePage()
        if (this._runId !== myRunId) return
        if (!hasMore) {
          // Try next query variant
          if (s.currentVariantIdx + 1 < s.queryVariants.length) {
            s.currentVariantIdx++
            s.googlePage = 0
            log.debug(
              `Switching to query variant ${s.currentVariantIdx}: ${s.queryVariants[s.currentVariantIdx]}`,
            )
            continue
          }
          // Exhausted all queries
          log.info('All Google pages exhausted')
          break
        }
        continue
      }

      // Take next URL from queue
      const url = s.urlQueue.shift()!
      if (s.visitedUrls.has(url)) continue
      s.visitedUrls.add(url)

      // Check energy
      if (!this._consumeEnergy()) {
        log.warn('Energy exhausted — stopping scraping')
        break
      }

      // Navigate to the contact page
      await this._navigateTo(url)
      if (this._runId !== myRunId) return
      if (s.status !== 'running') break // Respect pause / cancel immediately after navigation

      s.pagesScanned++
      this._broadcastProgress(url)

      // Extract contacts from page
      const contact = await this._extractContactFromPage(url)
      if (this._runId !== myRunId) return

      if (contact) {
        s.contactsFound++
        this._broadcastContact(contact)
        this._broadcastProgress(url)
      }

      // Human-like delay between page visits
      await this._delay(1500, 3000)
    }

    // Only the latest run should execute the finish-up block.
    if (this._runId !== myRunId) return

    if (s.status === 'running') {
      s.status = 'complete'
    }
    this._broadcastProgress()

    if (s.status === 'complete') {
      this._broadcastComplete()
      // Keep tab open so user can see final state; close after 3 s
      setTimeout(() => this._closeTab(), 3000)
    }
  }

  // ── Google page fetching ───────────────────────────────────────────────────

  /** Navigates to the next Google results page and fills urlQueue.
   *  Returns false when no results or blocked. */
  private async _fetchNextGooglePage(): Promise<boolean> {
    const s = this.session!
    const query = s.queryVariants[s.currentVariantIdx]
    const start = s.googlePage * 10
    const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&start=${start}&num=10&hl=en`

    log.debug(`Google page ${s.googlePage} — start=${start} — variant ${s.currentVariantIdx}`)

    await this._navigateTo(googleUrl)
    if (s.status !== 'running') return false // Respect pause triggered during navigation
    await this._delay(800, 1500)
    if (s.status !== 'running') return false

    // Check for CAPTCHA / consent gate
    const isBlocked = await this._runInTab<boolean>(_isBlockedPage)
    if (isBlocked) {
      log.warn('CAPTCHA or consent page detected — pausing scraping')
      s.status = 'paused'
      this._broadcastProgress()
      return false
    }

    const results = await this._runInTab<GoogleResult[]>(_extractGoogleResults)

    if (!results || results.length === 0) {
      log.debug('No results found on this Google page')
      return false
    }

    // Filter already seen URLs and add new ones
    const newUrls = results.filter((r) => r.url && !s.visitedUrls.has(r.url)).map((r) => r.url)

    s.urlQueue.push(...newUrls)
    s.googlePage++

    log.debug(`Found ${newUrls.length} new URLs (total queue: ${s.urlQueue.length})`)

    await this._delay(1000, 2000)
    return true
  }

  // ── Contact extraction ─────────────────────────────────────────────────────

  private async _extractContactFromPage(url: string): Promise<{
    name: string
    email: string
    role: string
    organization: string
    website: string
    contactPage: string
    specialization: string
    topics: string[]
    region: string
  } | null> {
    const s = this.session!

    const pageData = await this._runInTab<PageContact>(_extractPageContacts)

    if (!pageData || pageData.emails.length === 0) {
      // No emails — try navigating to the /contact sub-page once
      if (pageData?.contactPage && pageData.contactPage !== url) {
        try {
          await this._navigateTo(pageData.contactPage)
          await this._delay(600, 1200)
          const subData = await this._runInTab<PageContact>(_extractPageContacts)
          if (subData?.emails.length) {
            return this._buildContact(url, subData, s)
          }
        } catch {
          // sub-page failed — continue
        }
      }
      return null
    }

    return this._buildContact(url, pageData, s)
  }

  private _buildContact(url: string, data: PageContact, s: ScrapingSession) {
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

    const primaryEmail = data.emails[0]

    return {
      name: data.orgName || data.domain,
      email: primaryEmail,
      role: '',
      organization: data.orgName || data.domain,
      website: data.domain,
      contactPage: data.contactPage || url,
      specialization: data.description.slice(0, 200),
      topics: data.keywords.length
        ? data.keywords
        : [s.affinityCategory, s.affinitySubcategory].filter(Boolean),
      region,
    }
  }

  // ── Chrome tab helpers ─────────────────────────────────────────────────────

  private async _navigateTo(url: string): Promise<void> {
    const s = this.session
    if (!s) return

    return new Promise((resolve) => {
      chrome.tabs.update(s.tabId, { url }, () => {
        const onUpdated = (tabId: number, changeInfo: { status?: string }) => {
          if (tabId === s.tabId && changeInfo.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(onUpdated)
            resolve()
          }
        }
        chrome.tabs.onUpdated.addListener(onUpdated)

        // Safety timeout: resolve after 15 s regardless
        setTimeout(resolve, 15_000)
      })
    })
  }

  /** Run a self-contained function in the active scraping tab. */
  private async _runInTab<T>(fn: () => T): Promise<T | null> {
    const s = this.session
    if (!s) return null
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: s.tabId },
        func: fn,
      })
      return (results?.[0]?.result as T) ?? null
    } catch (e) {
      log.warn('executeScript failed', (e as Error).message)
      return null
    }
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

    const emailSuffixes = ['email contact', 'contact us email', '"@" contact', 'mailto email']
    const typeSuffix =
      p.contactType === 'corporate'
        ? 'company organization'
        : p.contactType === 'individual'
          ? 'professional consultant'
          : 'ngo association institution'

    return [
      `${base} ${typeSuffix} ${emailSuffixes[0]}`,
      `${base} ${typeSuffix} ${emailSuffixes[1]}`,
      `${p.query} ${p.country} ${emailSuffixes[2]}`,
      `${base} ${emailSuffixes[3]}`,
    ].filter(Boolean)
  }

  // ── Messaging ──────────────────────────────────────────────────────────────

  private _broadcastProgress(currentUrl = ''): void {
    const s = this.session
    if (!s) return

    chrome.runtime
      .sendMessage({
        type: MessageType.SCRAPING_PROGRESS,
        payload: {
          invId: s.invId,
          phase: s.urlQueue.length > 0 ? 'contacts' : 'google',
          currentUrl,
          urlsFound: s.visitedUrls.size,
          contactsFound: s.contactsFound,
          targetCount: s.targetCount,
          pagesScanned: s.pagesScanned,
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

  private _broadcastComplete(): void {
    const s = this.session
    if (!s) return
    chrome.runtime
      .sendMessage({
        type: MessageType.SCRAPING_COMPLETE,
        payload: {
          invId: s.invId,
          totalContacts: s.contactsFound,
          totalPagesScanned: s.pagesScanned,
          energyConsumed: s.energyConsumed,
          durationMs: Date.now() - s.startTime,
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

  // ── Delay ──────────────────────────────────────────────────────────────────

  private _delay(minMs: number, maxMs: number): Promise<void> {
    const ms = minMs + Math.random() * (maxMs - minMs)
    return new Promise((r) => setTimeout(r, ms))
  }
}

// Singleton
export const scrapingOrchestrator = new ScrapingOrchestrator()
