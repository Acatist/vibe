// ─────────────────────────────────────────────
// Message Bus Types
// ─────────────────────────────────────────────

import type { EnergyState, ActionCostKey } from './energy.types'
import type { SessionState } from './stealth.types'
import type { ThemeId, ThemeMode, ProfileName, LogLevel } from './extension.types'

export enum MessageType {
  // Energy
  ENERGY_GET = 'ENERGY_GET',
  ENERGY_CONSUME = 'ENERGY_CONSUME',
  ENERGY_REFILL = 'ENERGY_REFILL',
  ENERGY_RESET = 'ENERGY_RESET',
  ENERGY_SET_INFINITE = 'ENERGY_SET_INFINITE',
  ENERGY_UPDATED = 'ENERGY_UPDATED',

  // Session
  SESSION_START = 'SESSION_START',
  SESSION_END = 'SESSION_END',
  SESSION_GET = 'SESSION_GET',
  SESSION_UPDATED = 'SESSION_UPDATED',
  SESSION_IDLE = 'SESSION_IDLE',
  SESSION_RESUME = 'SESSION_RESUME',

  // Theme
  THEME_GET = 'THEME_GET',
  THEME_SET = 'THEME_SET',
  THEME_UPDATED = 'THEME_UPDATED',

  // Settings
  SETTINGS_GET = 'SETTINGS_GET',
  SETTINGS_SET = 'SETTINGS_SET',
  SETTINGS_UPDATED = 'SETTINGS_UPDATED',

  // Stealth
  STEALTH_SET_PROFILE = 'STEALTH_SET_PROFILE',
  STEALTH_GET_CONFIG = 'STEALTH_GET_CONFIG',

  // Automation
  AUTOMATION_START = 'AUTOMATION_START',
  AUTOMATION_STOP = 'AUTOMATION_STOP',
  AUTOMATION_STATUS = 'AUTOMATION_STATUS',
  AUTOMATION_LOG = 'AUTOMATION_LOG',

  // General
  PING = 'PING',
  PONG = 'PONG',
  ERROR = 'ERROR',

  // Real Scraping
  SCRAPING_START = 'SCRAPING_START',
  SCRAPING_PAUSE = 'SCRAPING_PAUSE',
  SCRAPING_RESUME = 'SCRAPING_RESUME',
  SCRAPING_CANCEL = 'SCRAPING_CANCEL',
  SCRAPING_PROGRESS = 'SCRAPING_PROGRESS',
  SCRAPING_CONTACT = 'SCRAPING_CONTACT',
  SCRAPING_COMPLETE = 'SCRAPING_COMPLETE',
  SCRAPING_ERROR = 'SCRAPING_ERROR',

  // Scanner overlay (content script)
  SCANNER_ACTIVATE = 'SCANNER_ACTIVATE',
  SCANNER_DEACTIVATE = 'SCANNER_DEACTIVATE',

  // Dev/Test — single-domain probe (provisional)
  DEV_TEST_PROBE = 'DEV_TEST_PROBE',
  DEV_TEST_RESULT = 'DEV_TEST_RESULT',

  // Form submission pipeline (sidepanel → background → tab → sidepanel)
  FORM_SUBMIT_START = 'FORM_SUBMIT_START',
  FORM_SUBMIT_PROGRESS = 'FORM_SUBMIT_PROGRESS',
  FORM_SUBMIT_DONE = 'FORM_SUBMIT_DONE',
}

export interface MessagePayloadMap {
  [MessageType.ENERGY_GET]: void
  [MessageType.ENERGY_CONSUME]: { action: ActionCostKey; amount: number }
  [MessageType.ENERGY_REFILL]: { amount?: number }
  [MessageType.ENERGY_RESET]: void
  [MessageType.ENERGY_SET_INFINITE]: { infinite: boolean }
  [MessageType.ENERGY_UPDATED]: EnergyState

  [MessageType.SESSION_START]: void
  [MessageType.SESSION_END]: void
  [MessageType.SESSION_GET]: void
  [MessageType.SESSION_UPDATED]: SessionState
  [MessageType.SESSION_IDLE]: { idleMs: number }
  [MessageType.SESSION_RESUME]: void

  [MessageType.THEME_GET]: void
  [MessageType.THEME_SET]: { themeId: ThemeId; mode: ThemeMode }
  [MessageType.THEME_UPDATED]: { themeId: ThemeId; mode: ThemeMode }

  [MessageType.SETTINGS_GET]: void
  [MessageType.SETTINGS_SET]: Partial<ExtensionSettings>
  [MessageType.SETTINGS_UPDATED]: ExtensionSettings

  [MessageType.STEALTH_SET_PROFILE]: { profile: ProfileName }
  [MessageType.STEALTH_GET_CONFIG]: void

  [MessageType.AUTOMATION_START]: { moduleId: string; config?: Record<string, unknown> }
  [MessageType.AUTOMATION_STOP]: { moduleId: string }
  [MessageType.AUTOMATION_STATUS]: { moduleId: string; status: string }
  [MessageType.AUTOMATION_LOG]: { moduleId: string; level: string; message: string }

  [MessageType.PING]: void
  [MessageType.PONG]: { timestamp: number }
  [MessageType.ERROR]: { code: string; message: string }

  // ── Scraping ──────────────────────────────────────────────────────────────
  [MessageType.SCRAPING_START]: {
    invId: string
    query: string // search query string
    targetCount: number // desired number of contacts (10–1000)
    affinityCategory: string
    affinitySubcategory: string
    country: string
    language: string
    contactType: string
    scrapingMode: 'fast' | 'precise'
    consistency: number // 1-10
  }
  [MessageType.SCRAPING_PAUSE]: { invId: string }
  [MessageType.SCRAPING_RESUME]: { invId: string }
  [MessageType.SCRAPING_CANCEL]: { invId: string }
  [MessageType.SCRAPING_PROGRESS]: {
    invId: string
    phase: 'criteria' | 'seeding' | 'google' | 'probing' | 'contacts'
    currentUrl: string
    currentDomain: string
    urlsFound: number
    contactsFound: number
    discardedCount: number
    targetCount: number
    pagesScanned: number
    domainsChecked: number
    formsFound: number
    energyLeft: number
    status: 'running' | 'paused' | 'cancelled' | 'complete' | 'error'
  }
  [MessageType.SCRAPING_CONTACT]: {
    invId: string
    contact: {
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
      /** true when the contact didn't meet the acceptance threshold */
      discarded?: boolean
      // Form-centric fields
      contactFormUrl?: string | null
      formFields?: Array<{ name: string; type: string; label?: string; required?: boolean }>
      contactMethod?: 'form' | 'email' | 'both' | 'none'
      domainMeta?: { title: string; description: string; favicon?: string; language?: string }
      hasCaptcha?: boolean
    }
  }
  [MessageType.SCRAPING_COMPLETE]: {
    invId: string
    totalContacts: number
    totalDiscarded: number
    totalPagesScanned: number
    energyConsumed: number
    durationMs: number
    /** If scraping ended early due to a stall / tab crash / exhaustion */
    finishReason?:
      | 'target-reached'
      | 'energy-exhausted'
      | 'queries-exhausted'
      | 'stalled'
      | 'max-pages'
  }
  [MessageType.SCRAPING_ERROR]: {
    invId: string
    error: string
  }

  // ── Scanner overlay ────────────────────────────────────────────────────
  [MessageType.SCANNER_ACTIVATE]: {
    domain: string
    domainsChecked: number
    totalDomains: number
  }
  [MessageType.SCANNER_DEACTIVATE]: void

  // ── Dev/Test ───────────────────────────────────────────────────────────
  [MessageType.DEV_TEST_PROBE]: { domain: string }
  [MessageType.DEV_TEST_RESULT]: {
    domain: string
    error?: string
    result?: {
      hasForm: boolean
      emails: string[]
      contactMethod: string
      contactPageUrl: string | null
      hasCaptcha: boolean
      domainMeta: { title: string; description: string; favicon?: string; language?: string }
      formFields: Array<{ name: string; type: string; label?: string; required?: boolean }>
      navigationsUsed: number
    }
  }

  // ── Form submission ────────────────────────────────────────────────────
  [MessageType.FORM_SUBMIT_START]: {
    contactId: string
    contactFormUrl: string
    /** Fields to fill in the form */
    formData: {
      nombre?: string
      email?: string
      empresa?: string
      telefono?: string
      asunto?: string
      mensaje: string
    }
  }
  [MessageType.FORM_SUBMIT_PROGRESS]: {
    contactId: string
    step: string   // Human-readable description of the current step
    pct: number    // 0-100
  }
  [MessageType.FORM_SUBMIT_DONE]: {
    contactId: string
    success: boolean
    confirmText?: string  // Success message detected on the page
    error?: string
  }
}

export interface ExtensionSettings {
  profile: ProfileName
  debugMode: boolean
  logLevel: LogLevel
  infiniteEnergy: boolean
  stealthEnabled: boolean
  downloadFolder: string
  fileNamePrefix: string
  includeDate: boolean
  savedFolderPath: string
}

export interface MessageRequest<T extends MessageType = MessageType> {
  type: T
  payload: MessagePayloadMap[T]
  requestId?: string
  source?: string
}

export interface MessageResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  requestId?: string
}

export type MessageHandler<T extends MessageType = MessageType> = (
  payload: MessagePayloadMap[T],
  sender: chrome.runtime.MessageSender,
) => Promise<unknown> | unknown
