export type ContactCategory =
  | 'journalist'
  | 'investigative-reporter'
  | 'ngo'
  | 'legal-advocate'
  | 'researcher'
  | 'activist'

/** How a contact can be reached — form-first approach */
export type ContactMethod = 'form' | 'email' | 'both' | 'none'

/** A single field detected in a contact form */
export interface FormFieldInfo {
  name: string
  type: string
  label?: string
  required?: boolean
}

/** Metadata extracted from the domain's homepage */
export interface DomainMeta {
  title: string
  description: string
  favicon?: string
  language?: string
}

/**
 * Extended fallback data used to fill form fields that go beyond the basic
 * Business Profile (company name, email, phone).  Persisted per-workspace and
 * sent alongside every FORM_SUBMIT_START message so the background engine can
 * populate any extra field a contact form might present.
 */
export interface FormFallbackProfile {
  /** Job title shown in "Cargo / Position / Title" fields */
  cargo: string
  /** Department shown in topic/department dropdowns (e.g. "general") */
  departamento: string
  /** Sender country (e.g. "España") */
  pais: string
  /** Sender region or province */
  region: string
  /** Sender city */
  ciudad: string
  /** Industry / sector (e.g. "Tecnología") */
  industria: string
  /** Company size band (e.g. "1-10", "11-50") */
  tamanoEmpresa: string
  /** How the sender found the site — fills referral/source dropdowns */
  fuenteReferencia: string
  /** Default inquiry reason — fills reason/subject-type dropdowns */
  motivoConsulta: string
  /** Preferred language code */
  idioma: 'es' | 'en'
}

/** Sensible defaults for FormFallbackProfile */
export const DEFAULT_FALLBACK_PROFILE: FormFallbackProfile = {
  cargo: 'Business Development',
  departamento: 'general',
  pais: 'España',
  region: '',
  ciudad: '',
  industria: 'Tecnología',
  tamanoEmpresa: '1-10',
  fuenteReferencia: 'Búsqueda web',
  motivoConsulta: 'Consulta comercial',
  idioma: 'es',
}

export interface Contact {
  id: string
  name: string
  role: string
  organization: string
  email: string
  website: string
  contactPage: string
  specialization: string
  topics: string[]
  region: string
  recentArticles: string[]
  category: ContactCategory
  relevanceScore: number
  investigationId: string
  /** true when the contact was below the acceptance threshold */
  discarded?: boolean

  // ── Form-centric fields ──────────────────────────────────────────────────
  /** URL of the page containing the contact form (if found) */
  contactFormUrl?: string | null
  /** Fields detected in the contact form */
  formFields?: FormFieldInfo[]
  /** Preferred contact method based on what was discovered */
  contactMethod?: ContactMethod
  /** Homepage metadata for display and AI personalisation */
  domainMeta?: DomainMeta
  /** Whether an AI message has already been generated for this contact */
  messageGenerated?: boolean
  /** Whether the user has manually edited the generated message */
  messageEdited?: boolean
  /** Whether a CAPTCHA was detected on the contact form page */
  hasCaptcha?: boolean
}
