import type { ExtensionConfig } from '@core/types/extension.types'

/**
 * Main extension configuration.
 * Modify this file to change extension-wide defaults.
 * Do NOT modify core framework files.
 */
export const extensionConfig: ExtensionConfig = {
  name: 'SEF — Stealth Extension Framework',
  version: '1.0.0',
  debug: false,
  defaultProfile: 'normal-user',
  defaultTheme: 'twitter',
  defaultThemeMode: 'dark',
  logLevel: 'info',
}
