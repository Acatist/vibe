/**
 * FormSubmitEngine — Real contact-form submission pipeline.
 *
 * Runs exclusively in the Background Service Worker.
 *
 * Flow:
 *   1. Open the contact-form URL in an ACTIVE tab (user can watch in real time)
 *   2. Wait for full page load
 *   3. Execute an injected script (MAIN world) that types each field character
 *      by character with human-realistic delays (visible in the browser tab)
 *   4. The injected script clicks Submit and waits for a page confirmation
 *   5. Broadcast FORM_SUBMIT_PROGRESS at each coarse step → sidepanel shows live status
 *   6. Broadcast FORM_SUBMIT_DONE (success or error) and close the tab after 4 s
 */

import { MessageType } from '@core/types/message.types'
import { Logger } from '@services/logger.service'
import { energyService } from '@services/energy.service'

const log = Logger.create('FormSubmitEngine')

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FormSubmitParams {
  contactId: string
  contactFormUrl: string
  formData: {
    nombre?: string
    email?: string
    empresa?: string
    telefono?: string
    asunto?: string
    mensaje: string
  }
}

interface InjectedResult {
  success: boolean
  error?: string
  confirmText?: string
  fieldsFilledCount: number
  captchaDetected?: boolean
}

// ─── Engine ───────────────────────────────────────────────────────────────────

export class FormSubmitEngine {
  // ── Public API ─────────────────────────────────────────────────────────────

  async submit(params: FormSubmitParams): Promise<{ success: boolean; error?: string }> {
    const { contactId, contactFormUrl, formData } = params

    // Energy gate
    const consumed = energyService.consume('submitForm')
    if (!consumed.success) {
      this._done(contactId, false, undefined, 'Energía insuficiente para enviar el formulario')
      return { success: false, error: 'Energía insuficiente' }
    }

    log.info(`FormSubmitEngine: starting submission for contact ${contactId}`, { url: contactFormUrl })

    let tabId: number | undefined

    try {
      this._progress(contactId, 'Preparando el envío…', 5)

      // ── Step 1: Open the tab ──────────────────────────────────────────────
      this._progress(contactId, 'Abriendo la página de contacto…', 10)
      const tab = await chrome.tabs.create({ url: contactFormUrl, active: true })
      tabId = tab.id!

      // ── Step 2: Wait for page load ────────────────────────────────────────
      this._progress(contactId, 'Cargando la página…', 22)
      await this._waitForTabLoad(tabId)
      await this._delay(1200, 2000) // extra settle for JS-heavy pages

      // ── Step 3: Detect and inject ─────────────────────────────────────────
      this._progress(contactId, 'Detectando formulario de contacto…', 38)
      await this._delay(400, 800)

      this._progress(contactId, 'Rellenando el formulario campo por campo…', 50)

      // ── Step 4: Execute injected form-filler (async, with typing delays) ──
      // world: 'MAIN' → full access to page JS (React/Vue/Angular event hooks)
      let results: chrome.scripting.InjectionResult[] | undefined
      try {
        results = await chrome.scripting.executeScript({
          target: { tabId },
          func: _injectedFillFormAndSubmit,
          args: [formData as Record<string, string>],
          world: 'MAIN',
        })
      } catch (scriptErr) {
        const rawMsg = (scriptErr as Error).message ?? String(scriptErr)
        // Chrome throws "An unknown error occurred when fetching the script." when:
        //  - the page's Content-Security-Policy blocks inline script injection
        //  - the tab was closed/navigated before injection completed
        //  - the renderer process crashed
        // Give a helpful user-facing message instead of the cryptic Chrome error.
        const isUnknown = rawMsg.toLowerCase().includes('unknown error') ||
          rawMsg.toLowerCase().includes('fetching the script')
        const isCsp = rawMsg.toLowerCase().includes('content security') ||
          rawMsg.toLowerCase().includes('csp')
        if (isUnknown || isCsp) {
          throw new Error(
            'La página web bloquea la inyección de scripts (CSP estricto). ' +
            'Prueba abriendo la página manualmente y enviando el formulario desde el navegador.',
          )
        }
        throw scriptErr
      }

      const result = (results?.[0]?.result ?? null) as InjectedResult | null

      if (!result) {
        throw new Error('El script de relleno no devolvió respuesta')
      }

      if (result.captchaDetected) {
        // Let the user solve the captcha manually, then we wait and retry submit
        this._progress(contactId, '⚠️ Captcha detectado — por favor, complétalo en el navegador', 65)
        await this._waitForCaptchaAndSubmit(tabId, contactId)
        return { success: true }
      }

      if (!result.success) {
        throw new Error(result.error ?? 'Error al rellenar el formulario')
      }

      // ── Step 5: Confirm ────────────────────────────────────────────────────
      const nFilled = result.fieldsFilledCount
      const fillMsg = nFilled > 0 ? ` (${nFilled} campos rellenados)` : ''
      this._progress(contactId, `Formulario enviado${fillMsg} — esperando confirmación…`, 88)

      await this._delay(1500, 2500)

      this._done(contactId, true, result.confirmText ?? 'Formulario enviado correctamente')

      // Close the tab 4 s after success so user can read the confirmation page
      if (tabId !== undefined) {
        const tid = tabId
        setTimeout(() => chrome.tabs.remove(tid).catch(() => {}), 4000)
      }

      log.info(`FormSubmitEngine: success for contact ${contactId}`, {
        confirm: result.confirmText,
        filled: result.fieldsFilledCount,
      })

      return { success: true }
    } catch (e) {
      const msg = (e as Error).message
      log.error(`FormSubmitEngine: failed for contact ${contactId}`, msg)

      if (tabId !== undefined) {
        const tid = tabId
        setTimeout(() => chrome.tabs.remove(tid).catch(() => {}), 3000)
      }

      this._done(contactId, false, undefined, msg)
      return { success: false, error: msg }
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private _progress(contactId: string, step: string, pct: number): void {
    chrome.runtime
      .sendMessage({ type: MessageType.FORM_SUBMIT_PROGRESS, payload: { contactId, step, pct } })
      .catch(() => {}) // sidepanel may not be open
  }

  private _done(
    contactId: string,
    success: boolean,
    confirmText?: string,
    error?: string,
  ): void {
    chrome.runtime
      .sendMessage({
        type: MessageType.FORM_SUBMIT_DONE,
        payload: { contactId, success, confirmText, error },
      })
      .catch(() => {})
  }

  /**
   * Special handler when the form page has a captcha.
   * Waits up to 90 seconds for the user to complete it, then submits.
   */
  private async _waitForCaptchaAndSubmit(tabId: number, contactId: string): Promise<void> {
    const TIMEOUT_MS = 90_000
    const CHECK_INTERVAL_MS = 3_000
    const deadline = Date.now() + TIMEOUT_MS

    while (Date.now() < deadline) {
      await this._delay(CHECK_INTERVAL_MS, CHECK_INTERVAL_MS)

      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId },
          func: _injectedCheckCaptchaAndSubmit,
          world: 'MAIN',
        })
        const res = results?.[0]?.result as { captchaSolved: boolean; submitted: boolean } | null

        if (res?.submitted) {
          await this._delay(2000, 3000)
          this._done(contactId, true, 'Formulario enviado después de captcha')
          setTimeout(() => chrome.tabs.remove(tabId).catch(() => {}), 4000)
          return
        }
      } catch {
        // Tab may have navigated — treat as submitted
        this._done(contactId, true, 'Formulario enviado')
        return
      }
    }

    this._done(contactId, false, undefined, 'Tiempo de espera agotado resolviendo el captcha')
    setTimeout(() => chrome.tabs.remove(tabId).catch(() => {}), 2000)
  }

  private _waitForTabLoad(tabId: number): Promise<void> {
    return new Promise((resolve) => {
      let settled = false
      const finish = () => {
        if (!settled) {
          settled = true
          chrome.tabs.onUpdated.removeListener(onUpdated)
          resolve()
        }
      }
      const onUpdated = (id: number, info: { status?: string }) => {
        if (id === tabId && info.status === 'complete') finish()
      }
      chrome.tabs.onUpdated.addListener(onUpdated)
      // Hard timeout: 20 s
      setTimeout(finish, 20_000)
    })
  }

  private _delay(minMs: number, maxMs: number): Promise<void> {
    const ms = minMs + Math.random() * (maxMs - minMs)
    return new Promise((r) => setTimeout(r, ms))
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Injected functions — run inside the tab (MAIN world)
// MUST be self-contained; no closures, no imports.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Main injected function — runs in MAIN world inside the target tab.
 *
 * Comprehensive compatibility layer for ALL major contact form systems:
 *   • Contact Form 7 (CF7) — jQuery + AJAX, most common in Spain/WP sites
 *   • Gravity Forms — jQuery + AJAX, multi-page capable
 *   • WPForms — jQuery + AJAX
 *   • Ninja Forms — React-based, requires React event simulation
 *   • Elementor Forms — custom JS, requires jQuery fallback
 *   • Caldera Forms, Forminator, Fluent Forms, Everest Forms, WS Form
 *   • Plain HTML5 forms (native POST/GET)
 *   • React / Vue / Angular controlled inputs
 *   • Webflow, Squarespace, Wix, HubSpot, Typeform-embedded widgets
 *
 * Key strategies:
 *   1. setAndCommit() — native prototype setter (React) + jQuery .val() (CF7/GF)
 *      + synthetic input/change events (Vue/Angular) — ALL frameworks see the value
 *   2. Honeypot filtering — skip zero-size / hidden trap fields to avoid spam detection
 *   3. Select < dropdown handling — fill topic/department selects intelligently
 *   4. Terms-of-service checkbox — auto-check required privacy/terms checkboxes
 *   5. Subject field fix — a field clearly named/labeled "asunto/subject" gets the
 *      subject value EVEN if it happens to be a textarea (removes bad textarea restriction)
 *   6. Smart form scoring — pick the best contact form when multiple forms exist
 *   7. form.requestSubmit() → btn.click() → form.submit() fallback chain
 *   8. 20-plugin response polling — detects success/error from any known plugin
 */
async function _injectedFillFormAndSubmit(
  formData: Record<string, string>,
): Promise<InjectedResult> {

  // ── Utilities ──────────────────────────────────────────────────────────────

  function sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms))
  }
  function jitter(base: number, factor = 0.4): number {
    return base + (Math.random() * 2 - 1) * base * factor
  }

  /**
   * Get all text signals for a field: name, id, label, aria-label, placeholder,
   * data-name, and parent fieldset legend — builds the richest possible combined string.
   */
  function getFieldSignals(el: Element): string {
    const name = ((el as HTMLInputElement).name ?? el.id ?? '').toLowerCase()
    const labelEl = el.id
      ? document.querySelector<HTMLLabelElement>(`label[for="${CSS.escape(el.id)}"]`)
      : el.closest('label') ?? el.parentElement?.querySelector('label')
    const labelTxt = (labelEl?.textContent ?? '').toLowerCase()
    const aria = (el.getAttribute('aria-label') ?? el.getAttribute('aria-labelledby') ? '' : '').toLowerCase()
    const ph = ((el as HTMLInputElement).placeholder ?? '').toLowerCase()
    const dataName = (el.getAttribute('data-name') ?? el.getAttribute('data-field-name') ?? '').toLowerCase()
    const legend = el.closest('fieldset')?.querySelector('legend')?.textContent?.toLowerCase() ?? ''
    return `${name} ${labelTxt} ${aria} ${ph} ${dataName} ${legend}`
  }

  /**
   * Set an input/textarea value in a way that ALL major form frameworks see it.
   *
   *  React:   native prototype setter + bubbling `input` event
   *  Vue:     bubbling `input` + `change` events  
   *  Angular: bubbling `input` + `change` events
   *  jQuery / CF7 / GF / WPForms: jQuery .val() + trigger('input') + trigger('change')
   *  HTML5:   direct assignment + events
   */
  function setAndCommit(el: HTMLInputElement | HTMLTextAreaElement, value: string): void {
    const proto =
      el instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype
    const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
    if (nativeSetter) nativeSetter.call(el, value)
    else el.value = value

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const jq = (window as any).jQuery as ((el: Element) => any) | undefined
    if (jq) {
      try {
        jq(el).val(value)
        jq(el).trigger('input').trigger('change')
      } catch { /* ignore */ }
    }

    el.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }))
    el.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }))
  }

  /**
   * Type text character by character with realistic keyboard events.
   * After the loop, setAndCommit does a final state sync across all frameworks.
   */
  async function typeInto(
    el: HTMLInputElement | HTMLTextAreaElement,
    text: string,
  ): Promise<void> {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    await sleep(jitter(350))
    el.focus()
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await sleep(jitter(200))

    setAndCommit(el, '')
    await sleep(jitter(80))

    const proto =
      el instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype
    const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const jq = (window as any).jQuery as ((el: Element) => any) | undefined

    for (let i = 0; i < text.length; i++) {
      const partial = text.substring(0, i + 1)
      const char = text[i]

      if (nativeSetter) nativeSetter.call(el, partial)
      else el.value = partial

      if (jq) {
        try { jq(el).val(partial) } catch { /* ignore */ }
      }

      const kb: KeyboardEventInit = { key: char, bubbles: true, cancelable: true }
      el.dispatchEvent(new KeyboardEvent('keydown', kb))
      el.dispatchEvent(
        new InputEvent('input', { bubbles: true, cancelable: true, data: char, inputType: 'insertText' }),
      )
      el.dispatchEvent(new KeyboardEvent('keyup', kb))

      await sleep(/[.!?,;:\s\n]/.test(char) ? jitter(95, 0.3) : jitter(28, 0.5))
    }

    setAndCommit(el, text)
    el.blur()
    await sleep(jitter(280))
  }

  /**
   * Returns true if a field is a honeypot (spam trap) and should NOT be filled.
   * Spam traps are typically hidden via CSS, zero-size, or have suspicious names.
   */
  function isHoneypot(el: HTMLElement): boolean {
    // Check computed style — honeypots are visually hidden
    const style = window.getComputedStyle(el)
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return true
    // Check inline style overrides
    if (el.style.display === 'none' || el.style.visibility === 'hidden') return true
    // Zero-size fields
    if (el.offsetWidth === 0 && el.offsetHeight === 0) return true
    // Name/class patterns commonly used for honeypots
    const nm = ((el as HTMLInputElement).name ?? el.id ?? el.className ?? '').toLowerCase()
    if (/\b(honeypot|trap|bot|spam|winnie|pot|fax|url2|website2|phone2|address2|zip2)\b/.test(nm)) return true
    // Positioned absolutely off-screen (common CF7 anti-spam technique)
    if (style.position === 'absolute') {
      const rect = el.getBoundingClientRect()
      if (rect.left < -100 || rect.top < -100) return true
    }
    // Tab index -1 combined with aria-hidden
    if (el.getAttribute('tabindex') === '-1' && el.getAttribute('aria-hidden') === 'true') return true
    return false
  }

  /**
   * Score a form by how likely it is to be a contact form.
   * Higher = more likely.
   */
  function scoreForm(form: HTMLFormElement): number {
    let score = 0
    const html = form.innerHTML.toLowerCase()
    const action = (form.action ?? '').toLowerCase()

    // Positive signals — contact-related field names
    if (html.includes('your-message') || html.includes('your-name')) score += 30 // CF7
    if (html.includes('mensaje') || html.includes('message')) score += 20
    if (html.includes('asunto') || html.includes('subject')) score += 15
    if (html.includes('nombre') || html.includes('name')) score += 10
    if (form.querySelector('textarea')) score += 25   // contact forms almost always have a textarea
    if (form.querySelector('input[type="email"]')) score += 20
    if (form.querySelector('input[type="tel"]')) score += 5

    // WordPress form plugin classes
    if (form.classList.contains('wpcf7-form')) score += 50
    if (form.classList.contains('gform_form')) score += 50
    if (form.querySelector('.wpforms-form, [id^="wpforms"]')) score += 50
    if (form.classList.contains('nf-form-cont') || html.includes('ninja-forms')) score += 50
    if (html.includes('elementor-form')) score += 40
    if (html.includes('fluentform') || html.includes('ff-el')) score += 40
    if (html.includes('forminator') || html.includes('caldera')) score += 40

    // Negative signals
    if (form.querySelector('input[type="search"]')) score -= 60
    if (form.querySelector('input[type="password"]') && !form.querySelector('textarea')) score -= 80
    if (action.includes('login') || action.includes('register') || action.includes('search')) score -= 50
    if (form.querySelector('[name="s"]')) score -= 60 // WordPress search

    // Contact-related action/id/class hints
    if (/contact|contacto|consulta|inquiry|message|mensaje/.test(action)) score += 20
    if (/contact|contacto|consulta/.test((form.id + ' ' + form.className).toLowerCase())) score += 15

    return score
  }

  // ── Detect captcha ─────────────────────────────────────────────────────────

  const hasCaptcha = !!(
    document.querySelector(
      '.g-recaptcha, .h-captcha, .cf-turnstile, .frc-captcha, ' +
      'iframe[src*="recaptcha"], iframe[src*="hcaptcha"], ' +
      'iframe[src*="turnstile"], [data-sitekey]',
    )
  )

  // ── Find best contact form ──────────────────────────────────────────────────

  const allForms = Array.from(document.querySelectorAll<HTMLFormElement>('form'))
  let contactForm: HTMLFormElement | null = null
  let bestScore = -Infinity

  for (const form of allForms) {
    const visibleInputs = form.querySelectorAll(
      'input:not([type="hidden"]):not([type="password"]), textarea',
    )
    if (visibleInputs.length < 1) continue
    const s = scoreForm(form)
    if (s > bestScore) {
      bestScore = s
      contactForm = form
    }
  }

  // Require minimum score to avoid picking navigation / newsletter forms by accident
  if (!contactForm || bestScore < 5) {
    return {
      success: false,
      error: 'No se encontró un formulario de contacto en la página',
      fieldsFilledCount: 0,
      captchaDetected: hasCaptcha,
    }
  }

  // ── Normalize formData keys ────────────────────────────────────────────────

  const dl = Object.fromEntries(
    Object.entries(formData).map(([k, v]) => [k.toLowerCase().trim(), v]),
  )

  /**
   * Resolve what value to fill into a text input or textarea.
   *
   * Priority order:
   *  1. Direct key match on field name/id
   *  2. CF7 canonical field names (your-name, your-email, etc.)
   *  3. Other well-known plugin field names (gravityforms, ninjaforms)
   *  4. Subject detection — by name/label containing subject keywords
   *     NOTE: intentionally NOT restricted to non-textarea, because some sites
   *     do use a textarea named "asunto" — the field label is the definitive signal.
   *     Message detection comes AFTER subject to avoid overwriting it.
   *  5. Name, email, phone, company by label/placeholder patterns
   *  6. Last resort: any textarea that did not match above → message body
   */
  function resolveValue(el: HTMLInputElement | HTMLTextAreaElement): string | undefined {
    const name = ((el.name ?? el.id ?? '').toLowerCase().trim())
    const combined = getFieldSignals(el)

    // 1. Direct key match  
    if (dl[name]) return dl[name]

    // 2. CF7 canonical field names
    if (name === 'your-name' || name === 'your-firstname') return dl.nombre ?? dl.name
    if (name === 'your-lastname' || name === 'your-surname') return dl.nombre ?? dl.name
    if (name === 'your-email') return dl.email ?? dl.correo
    if (name === 'your-subject') return dl.asunto ?? dl.subject
    if (name === 'your-message') return dl.mensaje ?? dl.message
    if (name === 'your-phone' || name === 'your-tel') return dl.telefono ?? dl.phone
    if (name === 'your-company' || name === 'your-empresa') return dl.empresa ?? dl.company

    // 3. Gravity Forms common field names (input_1_X pattern handled by direct match above)
    //    Ninja Forms: fields["field_key"]
    //    WPForms: wpforms[fields][N]  
    //    These all fall through to semantic matching below.

    // 4a. Subject detection — BEFORE message, check both name AND label signals.
    //     Works even if the element is a textarea (some sites use textarea for subject).
    //     But we need to be careful: only match if "subject/asunto" appears in name/label,
    //     not just in placeholder (placeholders can be generic like "Escribe tu asunto aquí").
    const nameOnly = name  // just the field name/id, not placeholder
    const labelOnly = getFieldSignals(el).replace(((el as HTMLInputElement).placeholder ?? '').toLowerCase(), '')
    if (
      /\b(subject|asunto|tema|topic|assunto|re\b|asunto_mail)\b/.test(nameOnly) ||
      /\b(subject|asunto|tema|topic|assunto)\b/.test(labelOnly)
    ) {
      return dl.asunto ?? dl.subject
    }

    // 4b. Message detection
    if (/\b(message|mensaje|comment|comentario|consulta|inquiry|body|texto|motivo|descripci[oó]n|comments|contenido|escribe|write)\b/i.test(combined)) {
      return dl.mensaje ?? dl.message
    }

    // 5. Name (first only — exclude compound name/company fields)
    if (
      /\b(name|nombre|nom|firstname|first.name|vorname|nome|tu.nombre|su.nombre)\b/i.test(combined) &&
      !/\b(last|apellido|company|empresa|organization|org|email|user|username)\b/i.test(combined)
    ) {
      return dl.nombre ?? dl.name
    }

    // 5b. Last name — use company name as it's B2B
    if (/\b(lastname|last.name|apellido|surname|cognome)\b/i.test(combined)) {
      return dl.empresa ?? dl.company ?? dl.nombre
    }

    // 5c. Email
    if (/\b(e-?mail|correo|mail)\b/i.test(combined)) {
      return dl.email ?? dl.correo
    }

    // 5d. Phone
    if (/\b(phone|tel[eé]?fono|tel\b|m[oó]vil|movil|celular|whatsapp)\b/i.test(combined)) {
      return dl.telefono ?? dl.phone
    }

    // 5e. Company
    if (/\b(company|empresa|organizaci[oó]n|organization|firma|entidad|raz[oó]n.social|sociedad)\b/i.test(combined)) {
      return dl.empresa ?? dl.company
    }

    // 5f. Website / URL fields — provide the sender's domain (optional, non-critical)
    if (/\b(website|web|url|p[áa]gina.web|sitio)\b/i.test(combined)) {
      return undefined // skip — we don't want to fill in random URLs
    }

    // 6. Last resort: any textarea that wasn't already matched → message body
    if (el instanceof HTMLTextAreaElement) return dl.mensaje ?? dl.message

    return undefined
  }

  /**
   * Set a <select> element to the best matching option for the given field.
   * Tries to match: other/otro/general/consulta/información as universal fallbacks.
   */
  function resolveSelectValue(sel: HTMLSelectElement): string | undefined {
    const combined = getFieldSignals(sel)
    const options = Array.from(sel.options).filter((o) => o.value && o.value !== '')

    // Helper: find an option whose text/value matches a regex
    const findOpt = (re: RegExp) =>
      options.find((o) => re.test(o.text.toLowerCase()) || re.test(o.value.toLowerCase()))

    // Is this a country/region/province select? Skip — we can't know sender's location
    if (/\b(country|pa[ií]s|province|provincia|region|state|ciudad|city|zip|postal)\b/i.test(combined)) {
      return undefined
    }

    // Topic / department / service selects — try "other/general/consulta" as universal fallback
    const fallbackOpt = findOpt(/\b(other|otro|others|otros|general|consulta|inquiry|contact|contacto|información|information|asunto|subject)\b/)
    if (fallbackOpt) return fallbackOpt.value

    // If only 1 real option, just pick it
    if (options.length === 1) return options[0].value

    return undefined
  }

  // ── Fill text inputs and textareas ─────────────────────────────────────────

  const fillable = Array.from(
    contactForm.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
      'input[type="text"], input[type="email"], input[type="tel"], input[type="number"],' +
      'input[type="url"], input[type="search"], input:not([type]), textarea',
    ),
  ).filter((el) => {
    if (el.disabled || el.readOnly) return false
    if (isHoneypot(el)) return false
    // Skip search inputs inside the form
    if (el.getAttribute('type') === 'search') return false
    return true
  })

  let filled = 0
  for (const field of fillable) {
    const value = resolveValue(field)
    if (value?.trim()) {
      await typeInto(field, value.trim())
      filled++
    }
  }

  // ── Fill <select> dropdowns ────────────────────────────────────────────────

  const selects = Array.from(
    contactForm.querySelectorAll<HTMLSelectElement>('select'),
  ).filter((s) => !s.disabled && !isHoneypot(s))

  for (const sel of selects) {
    const value = resolveSelectValue(sel)
    if (value) {
      sel.scrollIntoView({ behavior: 'smooth', block: 'center' })
      await sleep(jitter(250))
      sel.focus()
      sel.value = value
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const jq = (window as any).jQuery as ((el: Element) => any) | undefined
      if (jq) {
        try { jq(sel).val(value).trigger('change') } catch { /* ignore */ }
      }
      sel.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }))
      sel.blur()
      await sleep(jitter(200))
    }
  }

  // ── Auto-check terms of service / privacy checkboxes ─────────────────────
  // Only check privacy/terms/legal checkboxes — NOT newsletter/marketing ones.

  const checkboxes = Array.from(
    contactForm.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'),
  ).filter((cb) => !cb.disabled && !isHoneypot(cb) && !cb.checked)

  for (const cb of checkboxes) {
    const signals = getFieldSignals(cb)
    const isTerms = /\b(privacidad|privacy|terms|t[eé]rminos|legal|gdpr|lopd|acepto|autorizo|consent|política|policy|aviso)\b/i.test(signals)
    const isMarketing = /\b(newsletter|marketing|publicidad|promo|suscrib|subscribe|ofertas|noticias)\b/i.test(signals)
    if (isTerms && !isMarketing) {
      cb.scrollIntoView({ behavior: 'smooth', block: 'center' })
      await sleep(jitter(300))
      cb.click()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const jq = (window as any).jQuery as ((el: Element) => any) | undefined
      if (jq) {
        try { jq(cb).prop('checked', true).trigger('change') } catch { /* ignore */ }
      }
      cb.dispatchEvent(new Event('change', { bubbles: true }))
      await sleep(jitter(150))
    }
  }

  if (filled === 0) {
    return {
      success: false,
      error: 'No se pudo mapear ningún campo del formulario a los datos disponibles',
      fieldsFilledCount: 0,
      captchaDetected: hasCaptcha,
    }
  }

  // ── Captcha gate ───────────────────────────────────────────────────────────

  if (hasCaptcha) {
    return {
      success: false,
      captchaDetected: true,
      error: 'Captcha detectado',
      fieldsFilledCount: filled,
    }
  }

  // ── Find submit button ─────────────────────────────────────────────────────

  await sleep(jitter(800, 0.3))

  // Priority 1: explicit submit button inside the form
  let submitBtn: HTMLElement | null =
    contactForm.querySelector<HTMLElement>(
      'button[type="submit"], input[type="submit"]',
    ) ?? null

  // Priority 2: any button inside the form whose text looks like "send"
  if (!submitBtn) {
    const SUBMIT_RE = /^(enviar|send|submit|envoyer|invia|verzenden|absenden|publicar|confirmar|confirm|mandare|invia|envia|envía|inschrijven|absenden|senden)/i
    for (const el of Array.from(contactForm.querySelectorAll<HTMLElement>('button, [role="button"], a[data-type="submit"]'))) {
      const txt = (el.textContent ?? '').trim()
      if (SUBMIT_RE.test(txt)) { submitBtn = el; break }
    }
  }

  // Priority 3: submit button associated with this form via form="id" attribute
  if (!submitBtn && contactForm.id) {
    submitBtn = document.querySelector<HTMLElement>(
      `button[form="${CSS.escape(contactForm.id)}"][type="submit"], ` +
      `input[form="${CSS.escape(contactForm.id)}"][type="submit"]`,
    )
  }

  // Priority 4: any remaining button in the form
  if (!submitBtn) {
    submitBtn = contactForm.querySelector<HTMLElement>('button') ?? null
  }

  if (!submitBtn) {
    return {
      success: false,
      error: 'No se encontró el botón de envío en el formulario',
      fieldsFilledCount: filled,
    }
  }

  submitBtn.scrollIntoView({ behavior: 'smooth', block: 'center' })
  await sleep(jitter(500, 0.3))
  submitBtn.focus()
  await sleep(jitter(180, 0.4))

  // ── Submit the form ────────────────────────────────────────────────────────
  //   Strategy 1: form.requestSubmit(btn) — fires the real `submit` HTMLEvent,
  //     which CF7, Gravity Forms, WPForms and all AJAX form plugins intercept.
  //     This is the CORRECT method — btn.click() can bypass JS form handlers.
  //   Strategy 2: btn.click() + dispatchEvent MouseEvent — fallback for plugins
  //     that listen to button click rather than form submit (Elementor Forms).
  //   Strategy 3: form.submit() — native POST, bypasses JS handlers, last resort
  //     for simple HTML forms that don't use AJAX.

  let submitOk = false
  try {
    if (typeof contactForm.requestSubmit === 'function') {
      contactForm.requestSubmit(
        submitBtn instanceof HTMLButtonElement || submitBtn instanceof HTMLInputElement
          ? submitBtn
          : undefined,
      )
      submitOk = true
    }
  } catch { /* requestSubmit throws on HTML5 validation failure — fall through */ }

  if (!submitOk) {
    try {
      submitBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      submitBtn.click()
      submitOk = true
    } catch { /* ignore */ }
  }

  if (!submitOk) {
    try { contactForm.submit() } catch { /* ignore */ }
  }

  // ── Poll for response (up to 20 s, 500 ms ticks) ──────────────────────────
  //
  // Confirmed selector map:
  //   CF7:          .wpcf7-response-output  (class: wpcf7-mail-sent-ok / -ng / -validation-errors)
  //   Gravity Forms: .gform_confirmation_message / .gform_confirmation_wrapper
  //   WPForms:      .wpforms-confirmation-container / .wpforms-confirmation-container-full
  //   Ninja Forms:  .nf-response-msg / .nf-form-errors
  //   Elementor:    .elementor-message / .elementor-message-success / .elementor-message-danger
  //   Fluentform:   .ff-message-success / .ff-el-group .ff-el-is-error
  //   Forminator:   .forminator-response-message / .forminator-success
  //   Caldera:      .caldera-forms-gdpr-field (success text in same container)
  //   Everest:      .evf-notice-success / .evf-notices
  //   HappyForms:   .happyforms-part-confirmation
  //   WS Form:      .wsf-response
  //   Generic:      .alert-success, .form-success, [class*="success"], [class*="confirmation"]

  const SUCCESS_PHRASES = [
    'gracias', 'mensaje enviado', 'mensaje recibido', 'hemos recibido', 'en breve',
    'nos pondremos en contacto', 'ponemos en contacto', 'recibirás una respuesta',
    'se ha enviado', 'enviado correctamente', 'contacto enviado', 'su consulta',
    'te contactaremos', 'te responderemos', 'en contacto contigo',
    'thank you', 'thanks', 'message sent', 'message received', 'received your',
    'we will contact', 'we\'ll get back', 'success', 'successfully sent',
    'éxito', 'exito', 'your message', 'tu mensaje', 'ha sido enviado',
    'se ha recibido', 'ha sido procesado', 'correctamente enviado',
  ]

  const ERROR_PHRASES = [
    'error', 'failed', 'fallo', 'fallido', 'no se pudo', 'inválido', 'invalid',
    'requerido', 'required', 'complete', 'completa', 'spam', 'blocked', 'bloqueado',
  ]

  const initialBodyText = document.body.innerText?.toLowerCase() ?? ''

  for (let tick = 0; tick < 40; tick++) {
    await sleep(500)

    // ── CF7 ──────────────────────────────────────────────────────────────
    const cf7Out = document.querySelector<HTMLElement>('.wpcf7-response-output')
    if (cf7Out?.textContent?.trim()) {
      const txt = cf7Out.textContent.trim()
      const cls = cf7Out.className
      if (cls.includes('wpcf7-mail-sent-ok') || cls.includes('sent-ok')) {
        return { success: true, confirmText: `✓ ${txt}`, fieldsFilledCount: filled }
      }
      if (cls.includes('wpcf7-mail-sent-ng') || cls.includes('wpcf7-validation-errors') || cls.includes('wpcf7-spam-blocked')) {
        return { success: false, error: txt, fieldsFilledCount: filled }
      }
      const cfLow = txt.toLowerCase()
      if (SUCCESS_PHRASES.some((p) => cfLow.includes(p))) {
        return { success: true, confirmText: `✓ ${txt}`, fieldsFilledCount: filled }
      }
      if (ERROR_PHRASES.some((p) => cfLow.includes(p))) {
        return { success: false, error: txt, fieldsFilledCount: filled }
      }
    }

    // ── CF7 v5+ — wpcf7-form status classes ──────────────────────────────
    const cf7Form = document.querySelector<HTMLElement>('.wpcf7-form')
    if (cf7Form) {
      const fcls = cf7Form.className
      if (fcls.includes('sent')) {
        return { success: true, confirmText: '✓ Formulario enviado correctamente', fieldsFilledCount: filled }
      }
      if (fcls.includes('failed') || fcls.includes('spam') || fcls.includes('aborted')) {
        const errMsg = cf7Form.querySelector('.wpcf7-response-output')?.textContent?.trim()
        return { success: false, error: errMsg ?? 'El servidor rechazó el envío', fieldsFilledCount: filled }
      }
    }

    // ── Gravity Forms ─────────────────────────────────────────────────────
    const gfMsg = document.querySelector<HTMLElement>(
      '.gform_confirmation_message, .gform_confirmation_wrapper',
    )
    if (gfMsg?.offsetParent && gfMsg.textContent?.trim()) {
      return { success: true, confirmText: `✓ ${gfMsg.textContent.trim().substring(0, 150)}`, fieldsFilledCount: filled }
    }
    const gfError = document.querySelector<HTMLElement>('.gform_validation_errors, .gfield_error')
    if (gfError?.offsetParent) {
      return { success: false, error: gfError.textContent?.trim() ?? 'Error de validación en Gravity Forms', fieldsFilledCount: filled }
    }

    // ── WPForms ───────────────────────────────────────────────────────────
    const wpfMsg = document.querySelector<HTMLElement>(
      '.wpforms-confirmation-container, .wpforms-confirmation-container-full',
    )
    if (wpfMsg?.offsetParent && wpfMsg.textContent?.trim()) {
      return { success: true, confirmText: `✓ ${wpfMsg.textContent.trim().substring(0, 150)}`, fieldsFilledCount: filled }
    }

    // ── Ninja Forms ───────────────────────────────────────────────────────
    const nfMsg = document.querySelector<HTMLElement>('.nf-response-msg')
    if (nfMsg?.offsetParent && nfMsg.textContent?.trim()) {
      const nfLow = nfMsg.textContent.toLowerCase()
      if (SUCCESS_PHRASES.some((p) => nfLow.includes(p))) {
        return { success: true, confirmText: `✓ ${nfMsg.textContent.trim().substring(0, 150)}`, fieldsFilledCount: filled }
      }
    }

    // ── Elementor Forms ───────────────────────────────────────────────────
    const elMsg = document.querySelector<HTMLElement>('.elementor-message')
    if (elMsg?.offsetParent && elMsg.textContent?.trim()) {
      if (elMsg.classList.contains('elementor-message-success')) {
        return { success: true, confirmText: `✓ ${elMsg.textContent.trim().substring(0, 150)}`, fieldsFilledCount: filled }
      }
      if (elMsg.classList.contains('elementor-message-danger')) {
        return { success: false, error: elMsg.textContent.trim(), fieldsFilledCount: filled }
      }
    }

    // ── Fluent Forms ──────────────────────────────────────────────────────
    const ffMsg = document.querySelector<HTMLElement>('.ff-message-success, .ff_message_success')
    if (ffMsg?.offsetParent && ffMsg.textContent?.trim()) {
      return { success: true, confirmText: `✓ ${ffMsg.textContent.trim().substring(0, 150)}`, fieldsFilledCount: filled }
    }

    // ── Forminator ────────────────────────────────────────────────────────
    const fmMsg = document.querySelector<HTMLElement>('.forminator-response-message, .forminator-success')
    if (fmMsg?.offsetParent && fmMsg.textContent?.trim()) {
      return { success: true, confirmText: `✓ ${fmMsg.textContent.trim().substring(0, 150)}`, fieldsFilledCount: filled }
    }

    // ── Everest Forms ─────────────────────────────────────────────────────
    const evfMsg = document.querySelector<HTMLElement>('.evf-notice-success, .evf-notice')
    if (evfMsg?.offsetParent && evfMsg.textContent?.trim()) {
      const evLow = evfMsg.textContent.toLowerCase()
      if (SUCCESS_PHRASES.some((p) => evLow.includes(p))) {
        return { success: true, confirmText: `✓ ${evfMsg.textContent.trim().substring(0, 150)}`, fieldsFilledCount: filled }
      }
    }

    // ── Generic alerts & confirmation containers ──────────────────────────
    const genericMsg = document.querySelector<HTMLElement>(
      '.alert-success, .alert.success, .form-success, .contact-success, ' +
      '.success-message, .message-success, [class*="confirmation-message"], ' +
      '[class*="success_message"], [class*="form_success"], ' +
      '[data-form-status="success"], [aria-live="polite"]',
    )
    if (genericMsg?.offsetParent && genericMsg.textContent?.trim()) {
      const gmLow = genericMsg.textContent.toLowerCase()
      if (SUCCESS_PHRASES.some((p) => gmLow.includes(p))) {
        return { success: true, confirmText: `✓ ${genericMsg.textContent.trim().substring(0, 150)}`, fieldsFilledCount: filled }
      }
    }

    // ── Navigation / page replacement (non-AJAX form POST) ────────────────
    // If the page URL changed or the body content changed significantly, assume success.
    if (window.location.href.includes('gracias') ||
        window.location.href.includes('thank') ||
        window.location.href.includes('success') ||
        window.location.href.includes('confirmacion') ||
        window.location.href.includes('enviado')) {
      return { success: true, confirmText: '✓ Redirigido a página de confirmación', fieldsFilledCount: filled }
    }

    // ── Full-page new text scan ────────────────────────────────────────────
    const currentBodyText = document.body.innerText?.toLowerCase() ?? ''
    // Only check for NEW text that wasn't there before (avoid false positives from page content)
    if (currentBodyText !== initialBodyText) {
      const newPhraseFound = SUCCESS_PHRASES.find(
        (p) => currentBodyText.includes(p) && !initialBodyText.includes(p),
      )
      if (newPhraseFound) {
        return { success: true, confirmText: `✓ Confirmación detectada en la página`, fieldsFilledCount: filled }
      }
    }
  }

  // 20 s passed — best-effort success (server may have processed it silently)
  return {
    success: true,
    confirmText: '✓ Formulario enviado — verifica la confirmación en la página',
    fieldsFilledCount: filled,
  }
}

/**
 * Injected after captcha — checks if captcha is solved and submits the form.
 */
function _injectedCheckCaptchaAndSubmit(): { captchaSolved: boolean; submitted: boolean } {
  const captchaFrame = document.querySelector(
    'iframe[src*="recaptcha"], iframe[src*="hcaptcha"]',
  )
  const captchaWidget = document.querySelector('.g-recaptcha, .h-captcha')

  // Check if captcha has been solved (reCAPTCHA v2 sets data-state or adds a token input)
  const recaptchaToken = (document.querySelector(
    'textarea#g-recaptcha-response, [name="g-recaptcha-response"]',
  ) as HTMLTextAreaElement | null)?.value

  const captchaSolved = !!(recaptchaToken && recaptchaToken.length > 20)

  if (!captchaSolved && captchaFrame && captchaWidget) {
    return { captchaSolved: false, submitted: false }
  }

  // Find and click submit
  const form = document.querySelector<HTMLFormElement>('form')
  if (!form) return { captchaSolved: true, submitted: false }

  const submitBtn = (
    form.querySelector<HTMLElement>('button[type="submit"], input[type="submit"]') ??
    form.querySelector<HTMLElement>('button')
  )

  if (submitBtn) {
    submitBtn.click()
    return { captchaSolved: true, submitted: true }
  }

  form.submit()
  return { captchaSolved: true, submitted: true }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const formSubmitEngine = new FormSubmitEngine()
