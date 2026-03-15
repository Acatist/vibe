import type { WaitForElementOptions } from '@core/types/automation.types'
import { sleep } from '@utils/timing'

/**
 * dom.ts — Typed DOM query helpers for automation scripts
 */

/**
 * Returns a typed element matching the CSS selector, or null.
 */
export function findElement<T extends Element = Element>(
  selector: string,
  context: Document | Element = document,
): T | null {
  return context.querySelector<T>(selector)
}

/**
 * Returns all elements matching the CSS selector as a typed array.
 */
export function findAllElements<T extends Element = Element>(
  selector: string,
  context: Document | Element = document,
): T[] {
  return Array.from(context.querySelectorAll<T>(selector))
}

/**
 * Waits for a matching element to appear in the DOM.
 * Uses MutationObserver for efficiency with a timeout fallback.
 */
export function waitForElement<T extends Element = Element>(
  selector: string,
  options: WaitForElementOptions = {},
): Promise<T> {
  const { timeout = 15000, visible = false } = options

  return new Promise((resolve, reject) => {
    // Check if element already exists
    const existing = document.querySelector<T>(selector)
    if (existing && (!visible || isVisible(existing))) {
      return resolve(existing)
    }

    const timer = setTimeout(() => {
      observer.disconnect()
      reject(new Error(`waitForElement: "${selector}" not found within ${timeout}ms`))
    }, timeout)

    const observer = new MutationObserver(() => {
      const element = document.querySelector<T>(selector)
      if (element && (!visible || isVisible(element))) {
        clearTimeout(timer)
        observer.disconnect()
        resolve(element)
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: visible,
    })
  })
}

/**
 * Returns true if the element is visible (not hidden, not zero-sized, not transparent).
 */
export function isVisible(element: Element): boolean {
  if (!(element instanceof HTMLElement)) return false
  const style = window.getComputedStyle(element)
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    parseFloat(style.opacity) > 0 &&
    element.offsetWidth > 0 &&
    element.offsetHeight > 0
  )
}

/**
 * Returns the center point of an element in viewport coordinates.
 */
export function getElementCenter(element: Element): { x: number; y: number } {
  const rect = element.getBoundingClientRect()
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  }
}

/**
 * Waits until an element matches a predicate.
 */
export async function waitUntil(
  predicate: () => boolean,
  timeout = 10000,
  interval = 100,
): Promise<void> {
  const start = Date.now()
  while (!predicate()) {
    if (Date.now() - start > timeout) {
      throw new Error('waitUntil: timeout exceeded')
    }
    await sleep(interval)
  }
}

/**
 * Returns true if the element is within the visible viewport.
 */
export function isInViewport(element: Element): boolean {
  const rect = element.getBoundingClientRect()
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= window.innerHeight &&
    rect.right <= window.innerWidth
  )
}

/**
 * Scrolls the element into view if it is not currently visible.
 */
export function ensureVisible(element: Element): void {
  if (!isInViewport(element)) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}
