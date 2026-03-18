import type {
  ScrapingService,
  ScrapedContact,
  DetectedForm,
  PageMetadata,
} from './scraping.interface'
import { Logger } from '@services/logger.service'
import { energyService } from '@services/energy.service'

const log = Logger.create('Scraping:Production')

// ── Helpers ───────────────────────────────────────────────────────────────────

function cleanPageTitle(title: string): string {
  return title
    .replace(/\s*[-|–—·]\s*.{0,60}$/, '')
    .trim()
    .substring(0, 80)
}

function inferRegionFromUrl(url: string, lang: string): string {
  try {
    const hostname = new URL(url.startsWith('http') ? url : `https://${url}`).hostname
    const parts = hostname.split('.')
    const tld = parts[parts.length - 1]?.toLowerCase() ?? ''
    const sld = parts[parts.length - 2]?.toLowerCase() ?? ''
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
      jp: 'Japan',
      cn: 'China',
      pl: 'Poland',
      ru: 'Russia',
      se: 'Sweden',
      no: 'Norway',
    }
    if (sld === 'co' && tld === 'uk') return 'United Kingdom'
    if (TLD_MAP[tld]) return TLD_MAP[tld]
    const LANG_MAP: Record<string, string> = {
      es: 'Spain',
      fr: 'France',
      de: 'Germany',
      it: 'Italy',
      pt: 'Portugal',
    }
    return LANG_MAP[lang?.substring(0, 2) ?? ''] ?? 'International'
  } catch {
    return 'International'
  }
}

// ── Service ───────────────────────────────────────────────────────────────────

export class ProductionScrapingService implements ScrapingService {
  async discoverContacts(url: string): Promise<ScrapedContact[]> {
    const consumed = energyService.consume('scrape')
    if (!consumed.success) {
      log.warn(`Insufficient energy to scrape ${url}`)
      return []
    }

    log.info(`Scraping contacts from ${url}`)
    const contacts: ScrapedContact[] = []

    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VibeReach/1.0)' },
      })
      if (!response.ok) {
        log.warn(`HTTP ${response.status} for ${url}`)
        return []
      }
      const html = await response.text()
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, 'text/html')

      // ── Page metadata for contact enrichment ────────────────────────────────
      const htmlLang = doc.querySelector('html')?.getAttribute('lang') ?? ''
      const ogSiteName =
        doc.querySelector('meta[property="og:site_name"]')?.getAttribute('content')?.trim() ?? ''
      const pageTitle = doc.querySelector('title')?.textContent?.trim() ?? ''
      const metaDesc =
        doc.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() ?? ''
      const metaKeywords =
        doc.querySelector('meta[name="keywords"]')?.getAttribute('content')?.trim() ?? ''
      let domain: string
      try {
        domain = new URL(url.startsWith('http') ? url : `https://${url}`).hostname
      } catch {
        domain = url
      }
      const orgName = ogSiteName || cleanPageTitle(pageTitle) || domain.replace('www.', '')
      const topics = metaKeywords
        .split(',')
        .map((k) => k.trim())
        .filter((k) => k.length > 1)
        .slice(0, 6)
      const specialization = metaDesc.length > 120 ? metaDesc.substring(0, 120) + '…' : metaDesc
      const region = inferRegionFromUrl(url, htmlLang)

      const seenEmails = new Set<string>()

      // ── 1. Extract mailto: links ─────────────────────────────────────────────
      const mailLinks = doc.querySelectorAll<HTMLAnchorElement>('a[href^="mailto:"]')
      for (const link of mailLinks) {
        const email = link.href.replace('mailto:', '').split('?')[0].trim().toLowerCase()
        if (email && email.includes('@') && !seenEmails.has(email)) {
          seenEmails.add(email)
          const linkText = link.textContent?.trim() ?? ''
          contacts.push({
            name: linkText && !linkText.includes('@') ? linkText : '',
            email,
            role: '',
            organization: orgName,
            website: domain,
            contactPage: url,
            specialization,
            topics,
            region,
          })
        }
      }

      // ── 2. Extract emails from visible text via regex ────────────────────────
      const textContent = doc.body?.textContent ?? ''
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
      const textEmails = textContent.match(emailRegex) ?? []
      for (const email of textEmails) {
        const normalized = email.toLowerCase()
        if (!seenEmails.has(normalized) && normalized.includes('.')) {
          seenEmails.add(normalized)
          contacts.push({
            name: '',
            email: normalized,
            role: '',
            organization: orgName,
            website: domain,
            contactPage: url,
            specialization,
            topics,
            region,
          })
        }
      }

      // ── 3. If no emails found, follow contact-page links ─────────────────────
      if (contacts.length === 0) {
        const contactLinks = Array.from(doc.querySelectorAll<HTMLAnchorElement>('a[href]'))
          .filter((a) =>
            /contact|contacto|kontakt|reach|about|equipo|team/i.test(a.getAttribute('href') ?? ''),
          )
          .slice(0, 2)
        for (const link of contactLinks) {
          try {
            const subUrl = new URL(link.getAttribute('href') ?? '', url).href
            if (subUrl !== url && subUrl.startsWith('http')) {
              const sub = await fetch(subUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } })
              if (sub.ok) {
                const subDoc = parser.parseFromString(await sub.text(), 'text/html')
                const subEmails = (subDoc.body?.textContent ?? '').match(emailRegex) ?? []
                for (const email of subEmails) {
                  const normalized = email.toLowerCase()
                  if (!seenEmails.has(normalized)) {
                    seenEmails.add(normalized)
                    contacts.push({
                      name: '',
                      email: normalized,
                      role: '',
                      organization: orgName,
                      website: domain,
                      contactPage: subUrl,
                      specialization,
                      topics,
                      region,
                    })
                  }
                }
              }
            }
          } catch {
            /* ignore sub-page errors */
          }
        }
      }

      log.info(`Discovered ${contacts.length} contacts from ${url}`)
    } catch (e) {
      log.error(`Failed to scrape ${url}`, (e as Error).message)
    }

    return contacts
  }

  async detectForms(url: string): Promise<DetectedForm[]> {
    const consumed = energyService.consume('scrape')
    if (!consumed.success) return []

    log.info(`Detecting forms at ${url}`)
    const forms: DetectedForm[] = []

    try {
      const response = await fetch(url)
      const html = await response.text()
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, 'text/html')

      const formElements = doc.querySelectorAll('form')
      for (const form of formElements) {
        const fields = Array.from(form.querySelectorAll('input, textarea, select')).map((el) => {
          const input = el as HTMLInputElement
          return {
            name: input.name || input.id || '',
            type: input.type || el.tagName.toLowerCase(),
            label: input.getAttribute('aria-label') || input.placeholder || input.name || '',
            required: input.required,
          }
        })

        forms.push({
          url,
          action: form.action || url,
          method: (form.method || 'POST').toUpperCase(),
          fields,
        })
      }

      log.info(`Detected ${forms.length} forms at ${url}`)
    } catch (e) {
      log.error(`Failed to detect forms at ${url}`, (e as Error).message)
    }

    return forms
  }

  async extractMetadata(url: string): Promise<PageMetadata> {
    log.info(`Extracting metadata from ${url}`)

    try {
      const response = await fetch(url)
      const html = await response.text()
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, 'text/html')

      const title = doc.querySelector('title')?.textContent ?? ''
      const description =
        doc.querySelector('meta[name="description"]')?.getAttribute('content') ?? ''
      const language = doc.querySelector('html')?.getAttribute('lang') ?? ''
      const keywordsMeta = doc.querySelector('meta[name="keywords"]')?.getAttribute('content') ?? ''
      const domain = new URL(url.startsWith('http') ? url : `https://${url}`).hostname

      return {
        title,
        description,
        language,
        domain,
        keywords: keywordsMeta
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean),
      }
    } catch (e) {
      log.error(`Failed to extract metadata from ${url}`, (e as Error).message)
      const domain = new URL(url.startsWith('http') ? url : `https://${url}`).hostname
      return { title: '', description: '', language: '', domain, keywords: [] }
    }
  }
}
