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

  // Ready
  log.debug('StealthEngine ready', stealthEngine.getProfile().name)
}

init().catch((err) => log.error('Content script init failed', err))
