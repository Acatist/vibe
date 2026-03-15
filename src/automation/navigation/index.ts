import type { NavigateOptions } from '@core/types/automation.types'
import { sleep, pageSettleDelay } from '@utils/timing'
import { randomBetween } from '@utils/random'
import { Logger } from '@services/logger.service'

const log = Logger.create('Navigation')

/**
 * Navigate to a URL with human-realistic pre/post delays.
 */
export async function navigateTo(url: string, options: NavigateOptions = {}): Promise<void> {
  const { preDelay = [200, 800], postDelay = [500, 1500] } = options

  await sleep(randomBetween(...preDelay))
  log.debug(`Navigating to: ${url}`)
  window.location.href = url

  if (options.postDelay) {
    await sleep(randomBetween(...postDelay))
  }
}

/**
 * Waits for the page to finish loading (DOMContentLoaded or load event).
 */
export function waitForNavigation(timeout = 15000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.readyState === 'complete') {
      return resolve()
    }

    const timer = setTimeout(() => {
      reject(new Error(`waitForNavigation: page load timed out after ${timeout}ms`))
    }, timeout)

    const onLoad = () => {
      clearTimeout(timer)
      resolve()
    }

    window.addEventListener('load', onLoad, { once: true })
  })
}

/**
 * Navigate and wait for the page to settle (load + random post-load delay).
 */
export async function navigateAndWait(url: string, options: NavigateOptions = {}): Promise<void> {
  await navigateTo(url, options)
  await pageSettleDelay()
}

/**
 * Click the browser back button with a human-realistic delay.
 */
export async function goBack(delay = randomBetween(300, 800)): Promise<void> {
  await sleep(delay)
  window.history.back()
  log.debug('Navigated back')
}

/**
 * Click the browser forward button with a human-realistic delay.
 */
export async function goForward(delay = randomBetween(300, 800)): Promise<void> {
  await sleep(delay)
  window.history.forward()
  log.debug('Navigated forward')
}
