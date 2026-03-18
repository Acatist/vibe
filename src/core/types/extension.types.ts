// ─────────────────────────────────────────────
// Extension Core Types
// ─────────────────────────────────────────────

export type ExtensionContext = 'background' | 'content' | 'popup' | 'options' | 'sidepanel'

export type ThemeId =
  | 'twitter'
  | 'perpetuity'
  | 'cosmic-night'
  | 'violet-bloom'
  | 'mocha-mousse'
  | 'elegant-luxury'

export type ThemeMode = 'light' | 'dark'

export interface ThemeConfig {
  id: ThemeId
  name: string
  description: string
  mode: ThemeMode
}

export interface ExtensionConfig {
  name: string
  version: string
  debug: boolean
  defaultProfile: ProfileName
  defaultTheme: ThemeId
  defaultThemeMode: ThemeMode
  logLevel: LogLevel
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent'

export type ProfileName = 'slow-user' | 'normal-user' | 'power-user'
