// ─────────────────────────────────────────────
// Automation Types
// ─────────────────────────────────────────────

import type { TypingOptions, CursorOptions } from './stealth.types'

export interface ClickOptions extends CursorOptions {
  /** Number of clicks (1 = single, 2 = double) */
  clicks?: 1 | 2
  /** Mouse button (0=left, 1=middle, 2=right) */
  button?: 0 | 1 | 2
  /** Whether to hover before clicking */
  hoverFirst?: boolean
  /** Milliseconds to wait after hover before clicking */
  hoverDuration?: [number, number]
}

export interface ScrollOptions {
  /** Direction of scroll */
  direction: 'up' | 'down' | 'left' | 'right'
  /** Total pixels to scroll */
  distance: number
  /** Pixels per scroll step */
  stepSize?: number
  /** Milliseconds between scroll steps */
  stepDelay?: [number, number]
  /** Whether to use smooth scroll behavior */
  smooth?: boolean
  /** Element to scroll (defaults to window) */
  target?: Element | Window
}

export interface TypeOptions extends TypingOptions {
  /** Whether to use a focus event before typing */
  focusFirst?: boolean
  /** Milliseconds to wait after focusing before typing */
  focusDelay?: [number, number]
}

export interface HoverOptions extends CursorOptions {
  /** How long to hover on the element (ms) */
  dwellTime?: [number, number]
  /** Whether to leave the element after dwelling */
  leaveAfter?: boolean
}

export interface WaitOptions {
  /** Min wait in ms */
  min?: number
  /** Max wait in ms */
  max?: number
  /** Whether to use gaussian distribution */
  gaussian?: boolean
}

export interface NavigateOptions {
  /** Whether to simulate a human clicking a link vs direct navigation */
  humanLike?: boolean
  /** Delay before navigating (ms) */
  preDelay?: [number, number]
  /** Delay after navigation loads (ms) */
  postDelay?: [number, number]
}

export interface WaitForElementOptions {
  /** Milliseconds before timeout */
  timeout?: number
  /** Polling interval if using fallback */
  interval?: number
  /** Whether to wait for element to be visible */
  visible?: boolean
}

export type AutomationAction =
  | 'click'
  | 'scroll'
  | 'type'
  | 'hover'
  | 'wait'
  | 'navigate'
  | 'scrape'
  | 'fillForm'
  | 'submitForm'
  | 'like'
  | 'follow'
  | 'search'
  | 'addToCart'
  | 'checkout'
