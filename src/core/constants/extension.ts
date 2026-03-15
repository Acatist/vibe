// Storage keys used across all services
export const STORAGE_KEYS = {
  ENERGY_STATE: 'sef:energy_state',
  SESSION_STATE: 'sef:session_state',
  SETTINGS: 'sef:settings',
  THEME: 'sef:theme',
  LOGS: 'sef:logs',
  MODULE_PREFIX: 'sef:module:',
} as const

// Alarm names for background service worker
export const ALARM_NAMES = {
  ENERGY_REFILL: 'sef:alarm:energy_refill',
  SESSION_CLEANUP: 'sef:alarm:session_cleanup',
  HEARTBEAT: 'sef:alarm:heartbeat',
} as const

// Extension context identifiers
export const CONTEXT_IDS = {
  BACKGROUND: 'background',
  CONTENT: 'content',
  POPUP: 'popup',
  OPTIONS: 'options',
  SIDEPANEL: 'sidepanel',
} as const

// SEF version
export const SEF_VERSION = '1.0.0'
