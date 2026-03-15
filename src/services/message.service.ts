import type {
  MessageType,
  MessagePayloadMap,
  MessageRequest,
  MessageResponse,
  MessageHandler,
} from '@core/types/message.types'
import { Logger } from './logger.service'

const log = Logger.create('MessageService')

/**
 * MessageService — Type-safe inter-context message bus.
 *
 * Handles routing between background, content scripts, popup, and options.
 *
 * Usage (sender):
 *   await messageService.send(MessageType.ENERGY_GET, undefined)
 *
 * Usage (receiver):
 *   messageService.on(MessageType.ENERGY_GET, async () => energyService.getState())
 */
export class MessageService {
  private static instance: MessageService
  private readonly handlers = new Map<string, MessageHandler>()

  private constructor() {
    this.initListener()
  }

  static getInstance(): MessageService {
    if (!MessageService.instance) {
      MessageService.instance = new MessageService()
    }
    return MessageService.instance
  }

  /**
   * Send a message to the background service worker.
   */
  async send<T extends MessageType>(
    type: T,
    payload: MessagePayloadMap[T],
  ): Promise<MessageResponse> {
    const request: MessageRequest<T> = {
      type,
      payload,
      requestId: crypto.randomUUID(),
      source: 'content',
    }
    try {
      const response = await chrome.runtime.sendMessage(request)
      return response as MessageResponse
    } catch (err) {
      log.error(`Failed to send message ${type}`, err)
      return { success: false, error: String(err) }
    }
  }

  /**
   * Send a message to a specific tab's content script.
   */
  async sendToTab<T extends MessageType>(
    tabId: number,
    type: T,
    payload: MessagePayloadMap[T],
  ): Promise<MessageResponse> {
    const request: MessageRequest<T> = {
      type,
      payload,
      requestId: crypto.randomUUID(),
      source: 'background',
    }
    try {
      const response = await chrome.tabs.sendMessage(tabId, request)
      return response as MessageResponse
    } catch (err) {
      log.error(`Failed to send message ${type} to tab ${tabId}`, err)
      return { success: false, error: String(err) }
    }
  }

  /**
   * Broadcast a message to all active tabs.
   */
  async broadcast<T extends MessageType>(type: T, payload: MessagePayloadMap[T]): Promise<void> {
    try {
      const tabs = await chrome.tabs.query({})
      const sends = tabs
        .filter((tab) => tab.id !== undefined)
        .map((tab) => this.sendToTab(tab.id!, type, payload))
      await Promise.allSettled(sends)
    } catch (err) {
      log.error(`Failed to broadcast message ${type}`, err)
    }
  }

  /**
   * Register a handler for an inbound message type.
   * The handler's return value becomes the response payload.
   */
  on<T extends MessageType>(type: T, handler: MessageHandler<T>): () => void {
    this.handlers.set(type, handler as MessageHandler)
    return () => this.off(type)
  }

  off(type: MessageType): void {
    this.handlers.delete(type)
  }

  private initListener(): void {
    if (typeof chrome === 'undefined' || !chrome.runtime?.onMessage) return

    chrome.runtime.onMessage.addListener(
      (
        request: MessageRequest,
        sender: chrome.runtime.MessageSender,
        sendResponse: (response: MessageResponse) => void,
      ) => {
        const handler = this.handlers.get(request.type)
        if (!handler) return false

        Promise.resolve(handler(request.payload, sender))
          .then((data) => {
            sendResponse({ success: true, data, requestId: request.requestId })
          })
          .catch((err: unknown) => {
            log.error(`Handler error for ${request.type}`, err)
            sendResponse({
              success: false,
              error: err instanceof Error ? err.message : String(err),
              requestId: request.requestId,
            })
          })

        return true // Keep channel open for async response
      },
    )
  }
}

export const messageService = MessageService.getInstance()
