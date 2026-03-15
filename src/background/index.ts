import { MessageType } from '@core/types/message.types'
import { ALARM_NAMES } from '@core/constants/extension'
import { messageService } from '@services/message.service'
import { energyService } from '@services/energy.service'
import { sessionService } from '@services/session.service'
import { stealthService } from '@services/stealth.service'
import { Logger } from '@services/logger.service'
import { extensionConfig } from '@config/extension.config'

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
    energyService.consume(action as Parameters<typeof energyService.consume>[0], amount),
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

  // Settings handlers
  messageService.on(MessageType.STEALTH_SET_PROFILE, ({ profile }) =>
    stealthService.setProfile(profile),
  )

  messageService.on(MessageType.STEALTH_GET_CONFIG, () => stealthService.getBehaviorProfile())

  // Ping
  messageService.on(MessageType.PING, () => ({
    type: MessageType.PONG,
    payload: { timestamp: Date.now() },
  }))

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

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === 'install') {
    log.info('Extension installed — seeding defaults')
    await init()
    // Open options page on first install
    await chrome.tabs.create({ url: chrome.runtime.getURL('src/options/index.html') })
  } else if (reason === 'update') {
    log.info('Extension updated')
    await init()
  }
})

chrome.runtime.onStartup.addListener(async () => {
  log.info('Browser startup')
  await init()
})

// ─────────────────────────────────────────────
// Side Panel Support
// ─────────────────────────────────────────────

chrome.sidePanel?.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {})

// ─────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────

async function broadcastEnergyUpdate() {
  const state = energyService.getState()
  await messageService.broadcast(MessageType.ENERGY_UPDATED, state)
}

// Boot on SW activation
init().catch((err) => log.error('Background init failed', err))
