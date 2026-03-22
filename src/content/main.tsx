/**
 * SEF Content Script
 *
 * Minimal entry point for the content script context.
 * Initializes the StealthEngine and SessionService for in-page automation.
 *
 * Extend this file with your module-specific automation logic,
 * or import automation actions directly from @automation/*.
 */
import { stealthEngine } from '@engine/stealth/StealthEngine'
import { sessionService } from '@services/session.service'
import { messageService } from '@services/message.service'
import { MessageType } from '@core/types/message.types'
import { Logger } from '@services/logger.service'
import { activateScanner, deactivateScanner } from './views/ScannerOverlay'

const log = Logger.create('ContentScript')

async function init() {
  log.info('SEF content script initialized')

  // Initialize session tracking
  await sessionService.init()

  // Listen for profile changes from background
  messageService.on(MessageType.STEALTH_SET_PROFILE, ({ profile }) => {
    stealthEngine.configure(profile)
    log.info(`Profile updated: ${profile}`)
  })

  // Listen for scanner overlay messages from the orchestrator
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === MessageType.SCANNER_ACTIVATE && msg.payload) {
      const { domain, domainsChecked, totalDomains } = msg.payload
      activateScanner(domain, domainsChecked, totalDomains)
    } else if (msg.type === MessageType.SCANNER_DEACTIVATE) {
      deactivateScanner()
    }
  })

  // Ready
  log.debug('StealthEngine ready', stealthEngine.getProfile().name)
}

init().catch((err) => log.error('Content script init failed', err))
