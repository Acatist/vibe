// ─────────────────────────────────────────────
// Message Bus Types
// ─────────────────────────────────────────────

import type { EnergyState } from './energy.types'
import type { SessionState } from './stealth.types'
import type { ThemeId, ThemeMode, ProfileName } from './extension.types'

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
}

export interface MessagePayloadMap {
  [MessageType.ENERGY_GET]: void
  [MessageType.ENERGY_CONSUME]: { action: string; amount: number }
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
}

export interface ExtensionSettings {
  profile: ProfileName
  themeId: ThemeId
  themeMode: ThemeMode
  debugMode: boolean
  infiniteEnergy: boolean
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
