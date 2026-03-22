// ─────────────────────────────────────────────
// Contact Page Prober
// Discovers contact pages with forms on a given domain
// ─────────────────────────────────────────────

import type { FormFieldInfo, DomainMeta, ContactMethod } from '@core/types/contact.types'
import { Logger } from '../logger.service'

const log = Logger.create('ContactPageProber')

// ── Result types ─────────────────────────────────────────────────────────────

export interface ProbeResult {
  /** URL of the page containing a contact form (null = not found) */
  contactPageUrl: string | null
  /** Whether a usable contact form was detected */
  hasForm: boolean
  /** Detected form fields (empty if no form) */
  formFields: FormFieldInfo[]
  /** Email addresses found during probing (auxiliary) */
  emails: string[]
  /** How the contact can be reached */
  contactMethod: ContactMethod
  /** Whether a CAPTCHA was detected on the form page */
  hasCaptcha: boolean
  /** Domain metadata extracted from the homepage */
  domainMeta: DomainMeta
  /** Total navigations consumed by the probe */
  navigationsUsed: number
}

// ── Contact-related keywords (multi-language) ────────────────────────────────

const CONTACT_LINK_KEYWORDS = [
  // Spanish
  'contacto', 'contacta', 'contáctanos', 'escríbenos', 'formulario',
  'habla con nosotros', 'envíanos un mensaje',
  // English
  'contact', 'contact us', 'get in touch', 'reach out', 'write to us',
  'send a message', 'inquiry', 'enquiry',
  // German
  'kontakt', 'kontaktieren',
  // French
  'nous contacter', 'contactez',
  // Portuguese
  'contato', 'fale conosco',
]

const CONTACT_PATH_GUESSES = [
  '/contact', '/contacto', '/contact-us', '/contacta', '/contactanos',
  '/get-in-touch', '/kontakt', '/contato', '/nous-contacter',
  '/about', '/about-us', '/sobre-nosotros',
]

/** Selectors for form elements that indicate a contact form */
// const FORM_INPUT_SELECTOR = 'input:not([type="hidden"]):not([type="search"]):not([type="password"]), textarea, select'

/** Max navigations per domain to avoid excessive resource use */
const DEFAULT_MAX_NAVIGATIONS = 6

// ── Prober class ─────────────────────────────────────────────────────────────

export class ContactPageProber {
  private tabId: number
  private maxNavigations: number
  private navigationsUsed = 0

  constructor(tabId: number, maxNavigations = DEFAULT_MAX_NAVIGATIONS) {
    this.tabId = tabId
    this.maxNavigations = maxNavigations
  }

  /** Probe a domain for contact pages with forms. Runs the full strategy chain. */
  async probe(domain: string): Promise<ProbeResult> {
    this.navigationsUsed = 0
    const allEmails: string[] = []
    let domainMeta: DomainMeta = { title: '', description: '' }

    // Step 1: Extract homepage metadata + scan footer/header/body for contact links
    const homepage = await this._runInTab(extractHomepageData)
    if (homepage) {
      domainMeta = homepage.meta
      allEmails.push(...homepage.emails)

      // Check if homepage itself has a form
      if (homepage.hasForm) {
        const formData = await this._runInTab(extractFormData)
        return this._buildResult(
          homepage.currentUrl,
          formData?.fields ?? [],
          formData?.hasCaptcha ?? false,
          allEmails,
          domainMeta,
        )
      }

      // Check contact links found in footer/header/nav/body
      for (const link of homepage.contactLinks) {
        if (this.navigationsUsed >= this.maxNavigations) break
        const formResult = await this._navigateAndCheckForm(link)
        if (formResult) {
          allEmails.push(...formResult.emails)
          return this._buildResult(
            link,
            formResult.fields,
            formResult.hasCaptcha,
            allEmails,
            domainMeta,
          )
        }
      }
    }

    // Step 2: Try sitemap.xml
    if (this.navigationsUsed < this.maxNavigations) {
      const sitemapUrl = `https://${domain}/sitemap.xml`
      const sitemapLinks = await this._fetchSitemapContactLinks(sitemapUrl)
      for (const link of sitemapLinks) {
        if (this.navigationsUsed >= this.maxNavigations) break
        const formResult = await this._navigateAndCheckForm(link)
        if (formResult) {
          allEmails.push(...formResult.emails)
          return this._buildResult(
            link,
            formResult.fields,
            formResult.hasCaptcha,
            allEmails,
            domainMeta,
          )
        }
      }
    }

    // Step 3: Guessed routes
    for (const path of CONTACT_PATH_GUESSES) {
      if (this.navigationsUsed >= this.maxNavigations) break
      const url = `https://${domain}${path}`
      const formResult = await this._navigateAndCheckForm(url)
      if (formResult) {
        allEmails.push(...formResult.emails)
        return this._buildResult(
          url,
          formResult.fields,
          formResult.hasCaptcha,
          allEmails,
          domainMeta,
        )
      }
    }

    // No form found — return what we have
    const method: ContactMethod = allEmails.length > 0 ? 'email' : 'none'
    return {
      contactPageUrl: null,
      hasForm: false,
      formFields: [],
      emails: [...new Set(allEmails)],
      contactMethod: method,
      hasCaptcha: false,
      domainMeta,
      navigationsUsed: this.navigationsUsed,
    }
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private _buildResult(
    contactPageUrl: string,
    formFields: FormFieldInfo[],
    hasCaptcha: boolean,
    emails: string[],
    domainMeta: DomainMeta,
  ): ProbeResult {
    const hasEmail = emails.length > 0
    const contactMethod: ContactMethod = hasEmail ? 'both' : 'form'
    return {
      contactPageUrl,
      hasForm: true,
      formFields,
      emails: [...new Set(emails)],
      contactMethod,
      hasCaptcha,
      domainMeta,
      navigationsUsed: this.navigationsUsed,
    }
  }

  /** Navigate to a URL and check if it contains a contact form */
  private async _navigateAndCheckForm(
    url: string,
  ): Promise<{ fields: FormFieldInfo[]; hasCaptcha: boolean; emails: string[] } | null> {
    try {
      await this._navigateTo(url)
      this.navigationsUsed++

      const result = await this._runInTab(extractContactPageData)
      if (!result) return null

      if (result.hasContactForm) {
        return {
          fields: result.fields,
          hasCaptcha: result.hasCaptcha,
          emails: result.emails,
        }
      }

      return null
    } catch (e) {
      log.warn(`Failed to check ${url}:`, e)
      return null
    }
  }

  /** Fetch and parse sitemap.xml for contact-related URLs */
  private async _fetchSitemapContactLinks(sitemapUrl: string): Promise<string[]> {
    try {
      const res = await fetch(sitemapUrl, { signal: AbortSignal.timeout(5_000) })
      if (!res.ok) return []
      const text = await res.text()
      // Extract <loc> entries
      const urls: string[] = []
      const locRegex = /<loc>(.*?)<\/loc>/gi
      let match: RegExpExecArray | null
      while ((match = locRegex.exec(text)) !== null) {
        const loc = match[1]
        const lower = loc.toLowerCase()
        if (CONTACT_LINK_KEYWORDS.some((kw) => lower.includes(kw))) {
          urls.push(loc)
        }
      }
      return urls.slice(0, 3) // max 3 sitemap links to check
    } catch {
      return []
    }
  }

  /** Navigate the scraping tab to a URL and wait for load */
  private async _navigateTo(url: string): Promise<void> {
    return new Promise((resolve) => {
      let settled = false
      const onUpdated = (tabId: number, changeInfo: { status?: string }) => {
        if (tabId === this.tabId && changeInfo.status === 'complete') {
          if (!settled) {
            settled = true
            chrome.tabs.onUpdated.removeListener(onUpdated)
            resolve()
          }
        }
      }
      chrome.tabs.onUpdated.addListener(onUpdated)
      chrome.tabs.update(this.tabId, { url })
      // Safety timeout — resolve after 15s even if page hangs
      setTimeout(() => {
        if (!settled) {
          settled = true
          chrome.tabs.onUpdated.removeListener(onUpdated)
          resolve()
        }
      }, 15_000)
    })
  }

  /** Execute a function inside the scraping tab with retry */
  private async _runInTab<T>(fn: () => T): Promise<T | null> {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: this.tabId },
          func: fn,
        })
        return (results?.[0]?.result as T) ?? null
      } catch {
        if (attempt === 0) await new Promise((r) => setTimeout(r, 500))
      }
    }
    return null
  }
}

// ─────────────────────────────────────────────
// Injected functions (run inside the tab context)
// Must be self-contained — no closure access
// ─────────────────────────────────────────────

/** Extract homepage data: metadata, contact links, emails, whether homepage has a form */
function extractHomepageData() {
  const CONTACT_KEYWORDS = [
    'contacto', 'contacta', 'contáctanos', 'escríbenos', 'formulario',
    'contact', 'contact us', 'get in touch', 'reach out', 'write to us',
    'inquiry', 'enquiry', 'kontakt', 'nous contacter', 'contactez',
    'contato', 'fale conosco',
  ]

  // Metadata
  const title = document.title || ''
  const metaDesc =
    document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content ||
    document.querySelector<HTMLMetaElement>('meta[property="og:description"]')?.content || ''
  const favicon =
    document.querySelector<HTMLLinkElement>('link[rel="icon"]')?.href ||
    document.querySelector<HTMLLinkElement>('link[rel="shortcut icon"]')?.href || ''
  const lang = document.documentElement.lang || ''

  // Emails from mailto: links and page text
  const emails: string[] = []
  document.querySelectorAll<HTMLAnchorElement>('a[href^="mailto:"]').forEach((a) => {
    const email = a.href.replace('mailto:', '').split('?')[0].trim().toLowerCase()
    if (email && email.includes('@')) emails.push(email)
  })
  const textEmails = document.body.innerText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g)
  if (textEmails) emails.push(...textEmails.map((e) => e.toLowerCase()))

  // Contact links — scan footer first, then header/nav, then full body
  const contactLinks: string[] = []
  const seen = new Set<string>()

  function scanLinks(container: Element | Document) {
    container.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((a) => {
      const href = a.href
      const text = (a.textContent || '').toLowerCase().trim()
      const hrefLower = href.toLowerCase()
      if (seen.has(href)) return
      if (
        CONTACT_KEYWORDS.some((kw) => text.includes(kw) || hrefLower.includes(kw))
      ) {
        // Only same-origin links
        try {
          if (new URL(href).hostname === window.location.hostname) {
            seen.add(href)
            contactLinks.push(href)
          }
        } catch { /* invalid URL */ }
      }
    })
  }

  // Priority order: footer → nav/header → body
  const footer = document.querySelector('footer')
  if (footer) scanLinks(footer)
  const nav = document.querySelector('nav')
  if (nav) scanLinks(nav)
  const header = document.querySelector('header')
  if (header) scanLinks(header)
  scanLinks(document)

  // Check if homepage itself has a contact form
  const forms = document.querySelectorAll('form')
  let hasForm = false
  forms.forEach((form) => {
    const inputs = form.querySelectorAll(
      'input:not([type="hidden"]):not([type="search"]):not([type="password"]), textarea, select',
    )
    if (inputs.length >= 2) {
      // Check it's not a login/search form
      const action = (form.action || '').toLowerCase()
      const isSearch = action.includes('search') || form.querySelector('input[type="search"]')
      const isLogin =
        form.querySelector('input[type="password"]') &&
        !form.querySelector('textarea')
      if (!isSearch && !isLogin) hasForm = true
    }
  })

  return {
    meta: { title, description: metaDesc, favicon, language: lang },
    emails: [...new Set(emails)],
    contactLinks: contactLinks.slice(0, 5), // max 5 contact links
    hasForm,
    currentUrl: window.location.href,
  }
}

/** Extract form field data and CAPTCHA presence from the current page */
function extractFormData() {
  const fields: Array<{ name: string; type: string; label?: string; required?: boolean }> = []
  let hasCaptcha = false

  // Find the best contact form (not login, not search)
  const forms = document.querySelectorAll('form')
  let contactForm: HTMLFormElement | null = null

  forms.forEach((form) => {
    const inputs = form.querySelectorAll(
      'input:not([type="hidden"]):not([type="search"]):not([type="password"]), textarea, select',
    )
    if (inputs.length >= 2 && !contactForm) {
      const isSearch = form.querySelector('input[type="search"]')
      const isLogin = form.querySelector('input[type="password"]') && !form.querySelector('textarea')
      if (!isSearch && !isLogin) contactForm = form
    }
  })

  if (!contactForm) return { fields, hasCaptcha }

  // Extract visible fields
  ;(contactForm as HTMLFormElement).querySelectorAll(
    'input:not([type="hidden"]):not([type="search"]):not([type="password"]), textarea, select',
  ).forEach((el) => {
    const input = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    const name = input.name || input.id || ''
    const type = input.tagName === 'TEXTAREA' ? 'textarea' : input.tagName === 'SELECT' ? 'select' : (input as HTMLInputElement).type || 'text'

    // Try to find label
    let label: string | undefined
    if (input.id) {
      const labelEl = document.querySelector<HTMLLabelElement>(`label[for="${input.id}"]`)
      if (labelEl) label = labelEl.textContent?.trim()
    }
    if (!label) {
      const placeholder = input.getAttribute('placeholder')
      if (placeholder) label = placeholder
    }
    if (!label) {
      const ariaLabel = input.getAttribute('aria-label')
      if (ariaLabel) label = ariaLabel
    }

    fields.push({
      name,
      type,
      label,
      required: input.required || input.getAttribute('aria-required') === 'true',
    })
  })

  // CAPTCHA detection
  const html = document.documentElement.innerHTML
  hasCaptcha =
    !!document.querySelector('iframe[src*="recaptcha"]') ||
    !!document.querySelector('iframe[src*="hcaptcha"]') ||
    !!document.querySelector('.g-recaptcha') ||
    !!document.querySelector('.h-captcha') ||
    !!document.querySelector('[data-turnstile-sitekey]') ||
    html.includes('recaptcha') ||
    html.includes('hcaptcha') ||
    html.includes('turnstile')

  return { fields, hasCaptcha }
}

/** Extract data from a potential contact page: form presence, fields, emails */
function extractContactPageData() {
  const emails: string[] = []

  // Emails
  document.querySelectorAll<HTMLAnchorElement>('a[href^="mailto:"]').forEach((a) => {
    const email = a.href.replace('mailto:', '').split('?')[0].trim().toLowerCase()
    if (email && email.includes('@')) emails.push(email)
  })
  const textEmails = document.body.innerText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g)
  if (textEmails) emails.push(...textEmails.map((e) => e.toLowerCase()))

  // Form detection
  const forms = document.querySelectorAll('form')
  let hasContactForm = false
  const fields: Array<{ name: string; type: string; label?: string; required?: boolean }> = []
  let hasCaptcha = false
  let contactForm: HTMLFormElement | null = null

  forms.forEach((form) => {
    const inputs = form.querySelectorAll(
      'input:not([type="hidden"]):not([type="search"]):not([type="password"]), textarea, select',
    )
    if (inputs.length >= 2 && !contactForm) {
      const isSearch = form.querySelector('input[type="search"]')
      const isLogin = form.querySelector('input[type="password"]') && !form.querySelector('textarea')
      if (!isSearch && !isLogin) {
        hasContactForm = true
        contactForm = form
      }
    }
  })

  if (contactForm) {
    ;(contactForm as HTMLFormElement).querySelectorAll(
      'input:not([type="hidden"]):not([type="search"]):not([type="password"]), textarea, select',
    ).forEach((el) => {
      const input = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      const name = input.name || input.id || ''
      const type = input.tagName === 'TEXTAREA' ? 'textarea' : input.tagName === 'SELECT' ? 'select' : (input as HTMLInputElement).type || 'text'

      let label: string | undefined
      if (input.id) {
        const labelEl = document.querySelector<HTMLLabelElement>(`label[for="${input.id}"]`)
        if (labelEl) label = labelEl.textContent?.trim()
      }
      if (!label) label = input.getAttribute('placeholder') || undefined
      if (!label) label = input.getAttribute('aria-label') || undefined

      fields.push({ name, type, label, required: input.required || input.getAttribute('aria-required') === 'true' })
    })

    const html = document.documentElement.innerHTML
    hasCaptcha =
      !!document.querySelector('iframe[src*="recaptcha"]') ||
      !!document.querySelector('iframe[src*="hcaptcha"]') ||
      !!document.querySelector('.g-recaptcha') ||
      !!document.querySelector('.h-captcha') ||
      !!document.querySelector('[data-turnstile-sitekey]') ||
      html.includes('recaptcha') ||
      html.includes('hcaptcha') ||
      html.includes('turnstile')
  }

  return {
    hasContactForm,
    fields,
    hasCaptcha,
    emails: [...new Set(emails)],
  }
}
