import { MessageType } from '@core/types/message.types'
import { ALARM_NAMES } from '@core/constants/extension'
import { messageService } from '@services/message.service'
import { energyService } from '@services/energy.service'
import { sessionService } from '@services/session.service'
import { stealthService } from '@services/stealth.service'
import { Logger } from '@services/logger.service'
import { extensionConfig } from '@config/extension.config'
import { scrapingOrchestrator } from '@services/scraping/scraping.orchestrator'

const log = Logger.create('Background')

// ─────────────────────────────────────────────
// Initialization
// ─────────────────────────────────────────────

async function init() {
  log.info(`SEF Background SW starting — v${extensionConfig.version}`)

  await energyService.init()
  await sessionService.init()

  registerMessageHandlers()
  setupAlarms()
  setupTabEvents()

  log.info('SEF Background SW ready')
}

// ─────────────────────────────────────────────
// Message Handlers
// ─────────────────────────────────────────────

function registerMessageHandlers() {
  // Energy handlers
  messageService.on(MessageType.ENERGY_GET, () => energyService.getState())

  messageService.on(MessageType.ENERGY_CONSUME, ({ action, amount }) =>
    energyService.consume(action, amount),
  )

  messageService.on(MessageType.ENERGY_REFILL, ({ amount }) => energyService.refill(amount))

  messageService.on(MessageType.ENERGY_RESET, () => energyService.reset())

  messageService.on(MessageType.ENERGY_SET_INFINITE, ({ infinite }) =>
    energyService.setInfinite(infinite),
  )

  // Session handlers
  messageService.on(MessageType.SESSION_GET, () => sessionService.getSessionState())

  messageService.on(MessageType.SESSION_START, () => sessionService.startSession())

  messageService.on(MessageType.SESSION_END, () => sessionService.endSession())

  messageService.on(MessageType.SESSION_IDLE, () => {
    sessionService.getSessionState()
  })

  messageService.on(MessageType.SESSION_RESUME, () => {
    sessionService.recordActivity()
  })

  // Settings handlers
  messageService.on(MessageType.STEALTH_SET_PROFILE, ({ profile }) =>
    stealthService.setProfile(profile),
  )

  messageService.on(MessageType.STEALTH_GET_CONFIG, () => stealthService.getBehaviorProfile())

  // Automation handlers (log-only until modules implemented)
  messageService.on(MessageType.AUTOMATION_START, ({ moduleId }) => {
    log.info(`Automation start requested: ${moduleId}`)
  })

  messageService.on(MessageType.AUTOMATION_STOP, ({ moduleId }) => {
    log.info(`Automation stop requested: ${moduleId}`)
  })

  messageService.on(MessageType.AUTOMATION_STATUS, ({ moduleId, status }) => {
    log.debug(`Automation status: ${moduleId} → ${status}`)
  })

  messageService.on(MessageType.AUTOMATION_LOG, ({ moduleId, level, message }) => {
    log.debug(`[${moduleId}] ${level}: ${message}`)
  })

  // Ping
  messageService.on(MessageType.PING, () => ({
    type: MessageType.PONG,
    payload: { timestamp: Date.now() },
  }))

  // Scraping
  messageService.on(MessageType.SCRAPING_START, (payload) => scrapingOrchestrator.start(payload))
  messageService.on(MessageType.SCRAPING_PAUSE, () => scrapingOrchestrator.pause())
  messageService.on(MessageType.SCRAPING_RESUME, () => scrapingOrchestrator.resume())
  messageService.on(MessageType.SCRAPING_CANCEL, () => scrapingOrchestrator.cancel())

  log.debug('Message handlers registered')
}

// ─────────────────────────────────────────────
// Alarms (Energy Refill + Session Cleanup)
// ─────────────────────────────────────────────

function setupAlarms() {
  chrome.alarms.create(ALARM_NAMES.ENERGY_REFILL, {
    periodInMinutes: 60,
  })

  chrome.alarms.create(ALARM_NAMES.SESSION_CLEANUP, {
    periodInMinutes: 5,
  })

  chrome.alarms.create(ALARM_NAMES.HEARTBEAT, {
    periodInMinutes: 0.5,
  })

  chrome.alarms.onAlarm.addListener((alarm) => {
    switch (alarm.name) {
      case ALARM_NAMES.ENERGY_REFILL:
        energyService.refill()
        broadcastEnergyUpdate()
        log.debug('Energy alarm: refill triggered')
        break

      case ALARM_NAMES.SESSION_CLEANUP:
        log.debug('Session cleanup alarm fired')
        break

      case ALARM_NAMES.HEARTBEAT:
        // Keep SW alive
        break
    }
  })

  log.debug('Alarms configured')
}

// ─────────────────────────────────────────────
// Tab Events
// ─────────────────────────────────────────────

function setupTabEvents() {
  chrome.tabs.onActivated.addListener(({ tabId }) => {
    log.debug(`Tab activated: ${tabId}`)
  })

  chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.active) {
      log.debug(`Tab loaded: ${tab.url?.substring(0, 60)}`)
    }
  })

  chrome.tabs.onRemoved.addListener((tabId) => {
    log.debug(`Tab closed: ${tabId}`)
  })
}

// ─────────────────────────────────────────────
// Extension Install / Update
// ─────────────────────────────────────────────

// Init every time the service worker starts (covers wakeup after termination).
// onInstalled / onStartup are NOT reliable for routine SW restarts in MV3.
init().catch((e) => log.error('Init failed', e))

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === 'install') {
    log.info('Extension installed — seeding defaults')
    // Open options page on first install
    await chrome.tabs.create({ url: chrome.runtime.getURL('src/options/index.html') })
  } else if (reason === 'update') {
    log.info('Extension updated')
  }
})

chrome.runtime.onStartup.addListener(() => {
  log.info('Browser startup')
})

// ─────────────────────────────────────────────
// Side Panel Support
// ─────────────────────────────────────────────

// Open side panel directly when toolbar icon is clicked (no popup dialog)
chrome.sidePanel?.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {})

chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.sidePanel.open({ tabId: tab.id }).catch(() => {})
  }
})

// ─────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────

async function broadcastEnergyUpdate() {
  const state = energyService.getState()
  await messageService.broadcast(MessageType.ENERGY_UPDATED, state)
}

// Boot on SW activation
init().catch((err) => log.error('Background init failed', err))
