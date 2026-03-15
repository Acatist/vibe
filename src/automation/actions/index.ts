import type {
  ClickOptions,
  HoverOptions,
  TypeOptions,
  ScrollOptions,
  WaitOptions,
} from '@core/types/automation.types'
import { stealthEngine, StealthEngine } from '@engine/stealth/StealthEngine'
import { sleep, sleepRandom } from '@utils/timing'
import { randomBetween, clamp } from '@utils/random'
import { Logger } from '@services/logger.service'

const log = Logger.create('Actions')

// ─────────────────────────────────────────────
// Click
// ─────────────────────────────────────────────

/**
 * Moves cursor to the element using Bézier path and dispatches a realistic click.
 */
export async function clickHuman(
  element: Element,
  options: ClickOptions = {},
  engine: StealthEngine = stealthEngine,
): Promise<void> {
  if (!(element instanceof HTMLElement)) {
    throw new TypeError('clickHuman: target must be an HTMLElement')
  }

  if (options.hoverFirst !== false) {
    await hoverHuman(element, {}, engine)
  }

  const [hoverMin, hoverMax] = options.hoverDuration ?? [80, 250]
  await sleep(randomBetween(hoverMin, hoverMax))

  const clicks = options.clicks ?? 1
  for (let i = 0; i < clicks; i++) {
    await engine.cursor.clickElement(element, options.button ?? 0, options)
    if (i < clicks - 1) await sleep(randomBetween(80, 200))
  }
  log.debug(`clickHuman: clicked ${element.tagName}`)
}

// ─────────────────────────────────────────────
// Hover
// ─────────────────────────────────────────────

/**
 * Moves cursor to the element without clicking. Useful for triggering tooltips/dropdowns.
 */
export async function hoverHuman(
  element: Element,
  options: HoverOptions = {},
  engine: StealthEngine = stealthEngine,
): Promise<void> {
  if (!(element instanceof HTMLElement)) {
    throw new TypeError('hoverHuman: target must be an HTMLElement')
  }

  await engine.cursor.hoverElement(element, options)

  const [dwellMin, dwellMax] = options.dwellTime ?? [200, 800]
  await sleep(randomBetween(dwellMin, dwellMax))

  if (options.leaveAfter) {
    const leaveTarget: Element = document.body
    await engine.cursor.moveTo(leaveTarget, options)
  }
}

// ─────────────────────────────────────────────
// Type
// ─────────────────────────────────────────────

/**
 * Types text into an input or contenteditable element with human-realistic delays and typos.
 */
export async function typeHuman(
  element: Element,
  text: string,
  options: TypeOptions = {},
  engine: StealthEngine = stealthEngine,
): Promise<void> {
  if (!(element instanceof HTMLElement)) {
    throw new TypeError('typeHuman: target must be an HTMLElement')
  }

  if (options.focusFirst !== false) {
    element.focus()
    const [focusMin, focusMax] = options.focusDelay ?? [80, 200]
    await sleep(randomBetween(focusMin, focusMax))
  }

  await engine.typing.humanType(element, text, options)
}

// ─────────────────────────────────────────────
// Scroll
// ─────────────────────────────────────────────

/**
 * Smoothly scrolls in the given direction with realistic acceleration/deceleration.
 */
export async function scrollHuman(options: ScrollOptions): Promise<void> {
  const {
    direction,
    distance,
    stepSize = 80,
    stepDelay = [20, 60],
    smooth = true,
    target = window,
  } = options

  const totalSteps = Math.ceil(distance / stepSize)
  let scrolled = 0

  for (let step = 0; step < totalSteps; step++) {
    const progress = step / totalSteps
    // Ease-in-out speed curve
    const speed = Math.sin(progress * Math.PI)
    const actualStep = clamp(stepSize * (0.5 + speed * 0.5), 10, stepSize * 1.5)

    const dx = direction === 'left' ? -actualStep : direction === 'right' ? actualStep : 0
    const dy = direction === 'up' ? -actualStep : direction === 'down' ? actualStep : 0

    if (target instanceof Window) {
      target.scrollBy({ left: dx, top: dy, behavior: smooth ? 'smooth' : 'instant' })
    } else {
      target.scrollBy({ left: dx, top: dy, behavior: smooth ? 'smooth' : 'instant' })
    }

    scrolled += actualStep

    const [delayMin, delayMax] = stepDelay
    await sleep(randomBetween(delayMin, delayMax))

    // Micro-pause mid-scroll (like a human re-reading)
    if (step === Math.floor(totalSteps * 0.4) && Math.random() < 0.2) {
      await sleepRandom(300, 900)
    }
  }

  log.debug(`scrollHuman: scrolled ${scrolled.toFixed(0)}px ${direction}`)
}

// ─────────────────────────────────────────────
// Wait
// ─────────────────────────────────────────────

/**
 * Waits for a random duration. Defaults to 500–1500ms.
 */
export async function waitRandom(options: WaitOptions = {}): Promise<void> {
  const { min = 500, max = 1500, gaussian = false } = options
  if (gaussian) {
    await sleepRandom(min, max)
  } else {
    await sleep(randomBetween(min, max))
  }
}
