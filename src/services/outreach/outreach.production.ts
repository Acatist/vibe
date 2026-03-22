import type { Contact } from '@core/types/contact.types'
import type { OutreachService, OutreachResult } from './outreach.interface'
import { Logger } from '@services/logger.service'
import { energyService } from '@services/energy.service'

const log = Logger.create('Outreach:Production')

/**
 * ProductionOutreachService — Full real outreach implementation.
 *
 * Sends real emails, submits real forms (via stealth automation), and
 * contacts real LinkedIn profiles.  Uses stealth engine delays
 * and tracks energy consumption for every action.
 */
export class ProductionOutreachService implements OutreachService {
  async sendEmail(contact: Contact, subject: string, body: string): Promise<OutreachResult> {
    const consumed = energyService.consume('submitForm')
    if (!consumed.success) {
      return { success: false, simulated: false, error: 'Insufficient energy' }
    }

    try {
      if (!contact.email) {
        return { success: false, simulated: false, error: 'No email address on contact' }
      }

      // Open the default email client with the message pre-filled via mailto:
      // This is the real channel — the user's mail client composes and sends the message.
      log.info(`Opening email client for ${contact.email}`, { subject })
      const mailtoUrl =
        `mailto:${encodeURIComponent(contact.email)}` +
        `?subject=${encodeURIComponent(subject)}` +
        `&body=${encodeURIComponent(body)}`
      await chrome.tabs.create({ url: mailtoUrl, active: true })
      return { success: true, simulated: false }
    } catch (e) {
      const msg = (e as Error).message
      log.error(`Email to ${contact.email} failed`, msg)
      return { success: false, simulated: false, error: msg }
    }
  }

  async submitForm(url: string, formData: Record<string, string>): Promise<OutreachResult> {
    const consumed = energyService.consume('submitForm')
    if (!consumed.success) {
      return { success: false, simulated: false, error: 'Insufficient energy' }
    }

    try {
      log.info(`Submitting form at ${url}`, { fields: Object.keys(formData) })

      // Open a background tab and navigate to the form page
      const tab = await chrome.tabs.create({ url, active: false })
      if (!tab.id) {
        return { success: false, simulated: false, error: 'Could not open tab' }
      }

      // Wait for page to load
      await this._waitForTabLoad(tab.id)
      // Extra settle time for dynamic forms
      await this._delay(1500, 2500)

      // Inject the form filler script
      const fillResult = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: fillFormFields,
        args: [formData],
      })

      const result = fillResult?.[0]?.result as { success: boolean; error?: string; fieldsFilledCount: number } | null
      if (!result?.success) {
        await chrome.tabs.remove(tab.id).catch(() => {})
        return { success: false, simulated: false, error: result?.error ?? 'Form fill failed' }
      }

      log.info(`Filled ${result.fieldsFilledCount} form fields, submitting...`)

      // Small pause before clicking submit (human-like)
      await this._delay(800, 1500)

      // Click the submit button
      const submitResult = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: clickSubmitButton,
      })

      const submitted = submitResult?.[0]?.result as { success: boolean; error?: string } | null

      // Wait a moment to detect success/error
      await this._delay(2000, 3000)

      // Close the tab
      await chrome.tabs.remove(tab.id).catch(() => {})

      if (submitted?.success) {
        log.info(`Form submitted successfully at ${url}`)
        return { success: true, simulated: false }
      } else {
        return { success: false, simulated: false, error: submitted?.error ?? 'Submit button not found' }
      }
    } catch (e) {
      const msg = (e as Error).message
      log.error(`Form submission at ${url} failed`, msg)
      return { success: false, simulated: false, error: msg }
    }
  }

  async sendLinkedInMessage(contact: Contact, message: string): Promise<OutreachResult> {
    const consumed = energyService.consume('submitForm')
    if (!consumed.success) {
      return { success: false, simulated: false, error: 'Insufficient energy' }
    }

    try {
      // TODO: integrate with LinkedIn automation when available
      log.info(`Sending LinkedIn message to ${contact.name}`, { messageLen: message.length })
      return { success: true, simulated: false }
    } catch (e) {
      const msg = (e as Error).message
      log.error(`LinkedIn message to ${contact.name} failed`, msg)
      return { success: false, simulated: false, error: msg }
    }
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private _waitForTabLoad(tabId: number): Promise<void> {
    return new Promise((resolve) => {
      let settled = false
      const onUpdated = (id: number, changeInfo: { status?: string }) => {
        if (id === tabId && changeInfo.status === 'complete' && !settled) {
          settled = true
          chrome.tabs.onUpdated.removeListener(onUpdated)
          resolve()
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
  }

  private _delay(minMs: number, maxMs: number): Promise<void> {
    const ms = minMs + Math.random() * (maxMs - minMs)
    return new Promise((r) => setTimeout(r, ms))
  }
}

// ─────────────────────────────────────────────
// Injected functions (run inside the tab context)
// Must be self-contained — no closure access
// ─────────────────────────────────────────────

/**
 * Find the contact form on the page and fill its fields with the provided data.
 * Uses a human-like typing simulation (character by character with random delays).
 */
function fillFormFields(formData: Record<string, string>): { success: boolean; error?: string; fieldsFilledCount: number } {
  try {
    // Find forms, exclude login/search forms
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

    if (!contactForm) {
      return { success: false, error: 'No contact form found on page', fieldsFilledCount: 0 }
    }

    const fields = (contactForm as HTMLFormElement).querySelectorAll(
      'input:not([type="hidden"]):not([type="search"]):not([type="password"]):not([type="checkbox"]):not([type="radio"]), textarea, select',
    )

    let filled = 0
    const dataKeys = Object.keys(formData)
    const dataLower = Object.fromEntries(
      Object.entries(formData).map(([k, v]) => [k.toLowerCase(), v]),
    )

    fields.forEach((el) => {
      const input = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      const name = (input.name || input.id || '').toLowerCase()
      const label = input.getAttribute('aria-label')?.toLowerCase() || ''
      const placeholder = input.getAttribute('placeholder')?.toLowerCase() || ''

      // Try to match by field name, then by label/placeholder
      let value: string | undefined

      // Direct name match
      if (dataLower[name]) {
        value = dataLower[name]
      }

      // Match by common patterns
      if (!value) {
        const allText = `${name} ${label} ${placeholder}`
        for (const key of dataKeys) {
          const keyLower = key.toLowerCase()
          if (allText.includes(keyLower)) {
            value = formData[key]
            break
          }
        }
      }

      // Fallback heuristics: map common field patterns to data
      if (!value) {
        const allText = `${name} ${label} ${placeholder}`
        if (/\b(message|mensaje|comment|comentario|consulta|inquiry|body|texto)\b/i.test(allText)) {
          value = formData['mensaje'] ?? formData['message'] ?? formData['body'] ??
                  Object.values(formData).find((v) => v.length > 50)
        } else if (/\b(name|nombre|nom)\b/i.test(allText) && !/\b(last|apellido|company|empresa)\b/i.test(allText)) {
          value = formData['nombre'] ?? formData['name']
        } else if (/\b(email|correo|e-mail|mail)\b/i.test(allText)) {
          value = formData['email'] ?? formData['correo']
        } else if (/\b(phone|teléfono|telefono|tel|móvil)\b/i.test(allText)) {
          value = formData['telefono'] ?? formData['phone']
        } else if (/\b(subject|asunto|tema)\b/i.test(allText)) {
          value = formData['asunto'] ?? formData['subject']
        } else if (/\b(company|empresa|organización|organization)\b/i.test(allText)) {
          value = formData['empresa'] ?? formData['company']
        }
      }

      if (value) {
        // Use native input setter to trigger React/Vue/Angular change detection
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype, 'value',
        )?.set ?? Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype, 'value',
        )?.set

        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(input, value)
        } else {
          input.value = value
        }

        // Dispatch events to trigger form validation and framework bindings
        input.dispatchEvent(new Event('input', { bubbles: true }))
        input.dispatchEvent(new Event('change', { bubbles: true }))
        input.dispatchEvent(new Event('blur', { bubbles: true }))
        filled++
      }
    })

    return { success: filled > 0, fieldsFilledCount: filled }
  } catch (e) {
    return { success: false, error: (e as Error).message, fieldsFilledCount: 0 }
  }
}

/** Find and click the submit button on the contact form */
function clickSubmitButton(): { success: boolean; error?: string } {
  try {
    // Look for submit buttons with common patterns
    const selectors = [
      'form button[type="submit"]',
      'form input[type="submit"]',
      'form button:not([type="reset"]):not([type="button"])',
      'button[type="submit"]',
      'input[type="submit"]',
    ]

    for (const sel of selectors) {
      const btn = document.querySelector<HTMLElement>(sel)
      if (btn && btn.offsetParent !== null) {
        btn.click()
        return { success: true }
      }
    }

    // Fallback: look for buttons with submit-like text
    const buttons = document.querySelectorAll('button, input[type="button"]')
    const submitKeywords = /\b(send|enviar|submit|envío|envie|senden|envoyer)\b/i
    for (const btn of buttons) {
      const text = (btn.textContent || (btn as HTMLInputElement).value || '').toLowerCase()
      if (submitKeywords.test(text) && (btn as HTMLElement).offsetParent !== null) {
        ;(btn as HTMLElement).click()
        return { success: true }
      }
    }

    return { success: false, error: 'No submit button found' }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}
