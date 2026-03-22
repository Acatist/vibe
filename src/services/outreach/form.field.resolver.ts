/**
 * form.field.resolver.ts
 *
 * Pre-send safety layer for form submissions.
 * Used in the UI / Service Worker to:
 *   - Classify fields as safe / review / blocked before submitting
 *   - Build the full typed formData payload from all data sources
 *
 * NOTE: The actual in-page field-filling heuristics live inside the injected
 * function `_injectedFillFormAndSubmit` in form.submit.engine.ts.  That code
 * is self-contained (no imports) and cannot call this module directly.
 */

import type { FormFieldInfo, FormFallbackProfile } from '@core/types/contact.types'

// ─── Types ─────────────────────────────────────────────────────────────────────

export type FieldRisk = 'safe' | 'review' | 'blocked'

export interface FormRiskAssessment {
  risk: FieldRisk
  /** Fields that must NOT be auto-filled (sensitive PII / credentials) */
  blockedFields: FormFieldInfo[]
  /** Fields that warrant manual review before sending */
  reviewFields: FormFieldInfo[]
}

// ─── Field catalogs ────────────────────────────────────────────────────────────

/**
 * BLOCKED — should never be auto-filled:
 *   national IDs, tax IDs, passport, payment/banking data, file uploads,
 *   passwords, date of birth, gender.
 */
const BLOCKED_PATTERNS: RegExp[] = [
  /\b(dni|nif|cif|nie|passport|pasaporte|tax.?id|taxid|vat.?num|fiscal|id.?numb|national.?id|identificaci[oó]n.?nac)\b/i,
  /\b(tarjeta|card.?num|iban|bic|swift|cuenta.?banc|billing|payment|pago|credit.?card|credito|debito|cvv|cvc|pin\b)\b/i,
  /\b(resume|cv\b|curriculum|adjunto|attachment|upload|file.?upload|archivo.?adjunto)\b/i,
  /\b(password|contrase[ñn]a|\bpass\b|login|user.?name|username|usuario)\b/i,
  /\b(birth.?date|fecha.?nac|nacimiento|date.?of.?birth|\bdob\b|edad\b|age\b)\b/i,
  /\b(g[eé]nero|gender|sexo)\b/i,
]

/**
 * REVIEW — can usually be skipped or left for the user to decide:
 *   budget/price questions, CAPTCHA, newsletter opt-ins.
 */
const REVIEW_PATTERNS: RegExp[] = [
  /\b(presupuesto|budget|precio|price|importe|amount|coste|cost)\b/i,
  /\b(captcha|recaptcha|hcaptcha|turnstile|antispam)\b/i,
  /\b(newsletter|marketing|publicidad|suscri[bp]\w+|subscribe|promo\w*|ofertas|noticias)\b/i,
]

// ─── Risk assessment ────────────────────────────────────────────────────────────

/**
 * Classify a list of form fields detected during scraping.
 * Returns an assessment with overall risk level + which fields are blocked/review.
 */
export function assessFormRisk(fields: FormFieldInfo[]): FormRiskAssessment {
  const blockedFields: FormFieldInfo[] = []
  const reviewFields: FormFieldInfo[] = []

  for (const field of fields) {
    const sig = `${field.name} ${field.label ?? ''}`.toLowerCase()
    if (BLOCKED_PATTERNS.some((p) => p.test(sig))) {
      blockedFields.push(field)
    } else if (REVIEW_PATTERNS.some((p) => p.test(sig))) {
      reviewFields.push(field)
    }
  }

  const risk: FieldRisk =
    blockedFields.length > 0 ? 'blocked' : reviewFields.length > 0 ? 'review' : 'safe'

  return { risk, blockedFields, reviewFields }
}

// ─── FormData builder ───────────────────────────────────────────────────────────

interface FormDataSources {
  /** AI-generated subject line */
  aiSubject?: string
  /** AI-generated message body (required) */
  aiMessage: string
  /** Sender company name (from Business Profile) */
  companyName: string
  /** Sender email (from Business Profile) */
  email: string
  /** Sender phone (from Business Profile) */
  phone: string
  /** Sender website (from Business Profile) */
  website?: string
  /** Extended fallback data for extra form fields */
  fallback: FormFallbackProfile
}

/**
 * Merge all data sources into the full typed formData object expected by
 * FORM_SUBMIT_START / FormSubmitParams.
 *
 * Keys mirror the Spanish field names used by the injected resolveValue() function.
 */
export function buildFormData(opts: FormDataSources): {
  nombre?: string
  apellido?: string
  email?: string
  empresa?: string
  telefono?: string
  asunto?: string
  mensaje: string
  cargo?: string
  departamento?: string
  website?: string
  pais?: string
  region?: string
  ciudad?: string
  industria?: string
  tamanoEmpresa?: string
  fuenteReferencia?: string
  motivoConsulta?: string
  idioma?: string
} {
  function val(v: string | undefined): string | undefined {
    return v?.trim() || undefined
  }

  return {
    // Core AI content
    asunto:       val(opts.aiSubject),
    mensaje:      opts.aiMessage.trim(),
    // Business identity
    nombre:       val(opts.companyName),
    apellido:     val(opts.companyName),   // B2B: last name = company name
    email:        val(opts.email),
    empresa:      val(opts.companyName),
    telefono:     val(opts.phone),
    website:      val(opts.website),
    // Extended fallback profile
    cargo:           val(opts.fallback.cargo),
    departamento:    val(opts.fallback.departamento),
    pais:            val(opts.fallback.pais),
    region:          val(opts.fallback.region),
    ciudad:          val(opts.fallback.ciudad),
    industria:       val(opts.fallback.industria),
    tamanoEmpresa:   val(opts.fallback.tamanoEmpresa),
    fuenteReferencia: val(opts.fallback.fuenteReferencia),
    motivoConsulta:  val(opts.fallback.motivoConsulta),
    idioma:          val(opts.fallback.idioma),
  }
}

// ─── Field catalog (reference / documentation) ────────────────────────────────

/**
 * Human-readable catalog of all field categories the resolver handles.
 * Useful for building UI documentation or onboarding tooltips.
 */
export const FORM_FIELD_CATALOG = {
  safe: [
    { key: 'nombre',          label: 'Nombre',              example: 'Acme Corp S.L.' },
    { key: 'apellido',        label: 'Apellido',            example: 'Acme Corp S.L.' },
    { key: 'email',           label: 'Email',               example: 'hola@empresa.com' },
    { key: 'empresa',         label: 'Empresa',             example: 'Acme Corp S.L.' },
    { key: 'telefono',        label: 'Teléfono',            example: '+34 600 000 000' },
    { key: 'asunto',          label: 'Asunto',              example: 'AI-generated' },
    { key: 'mensaje',         label: 'Mensaje',             example: 'AI-generated' },
    { key: 'cargo',           label: 'Cargo / Puesto',      example: 'Business Development' },
    { key: 'departamento',    label: 'Departamento',        example: 'general' },
    { key: 'website',         label: 'Sitio web',           example: 'www.empresa.com' },
    { key: 'pais',            label: 'País',                example: 'España' },
    { key: 'region',          label: 'Región / Provincia',  example: 'Madrid' },
    { key: 'ciudad',          label: 'Ciudad',              example: 'Madrid' },
    { key: 'industria',       label: 'Industria / Sector',  example: 'Tecnología' },
    { key: 'tamanoEmpresa',   label: 'Tamaño empresa',      example: '1-10' },
    { key: 'fuenteReferencia',label: 'Fuente referencia',   example: 'Búsqueda web' },
    { key: 'motivoConsulta',  label: 'Motivo de consulta',  example: 'Consulta comercial' },
    { key: 'idioma',          label: 'Idioma',              example: 'es' },
  ],
  blocked: [
    'DNI / NIF / CIF / NIE / Passport',
    'Número de tarjeta / IBAN / datos bancarios',
    'Archivos adjuntos / CV / Resume',
    'Contraseña / credenciales de acceso',
    'Fecha de nacimiento / Edad',
    'Género / Sexo',
  ],
  review: [
    'Presupuesto / Precio estimado',
    'CAPTCHA / verificación anti-bot',
    'Newsletter / suscripción a marketing',
  ],
} as const
