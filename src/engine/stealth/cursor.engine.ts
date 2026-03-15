import type { Point, BehaviorProfile, CursorOptions } from '@core/types/stealth.types'
import { bezierPath } from '@utils/bezier'
import { sleep, sleepRandom } from '@utils/timing'
import { randomBetween } from '@utils/random'
import { stealthConfig } from '@config/stealth.config'
import { Logger } from '@services/logger.service'

const log = Logger.create('CursorEngine')

/**
 * CursorEngine — Simulates realistic human cursor movement using cubic Bézier paths.
 *
 * Dispatches real DOM MouseEvent sequences along the computed path,
 * mimicking human acceleration, deceleration, micro-jitter, and overshoot.
 */
export class CursorEngine {
  private currentPos: Point = { x: 0, y: 0 }
  private profile: BehaviorProfile | null = null

  configure(profile: BehaviorProfile): void {
    this.profile = profile
  }

  getCurrentPos(): Readonly<Point> {
    return { ...this.currentPos }
  }

  /**
   * Move cursor to the center of a DOM element or to an explicit {x, y} position.
   * Dispatches mousemove events along a Bézier-curved path.
   */
  async moveTo(target: Element | Point, options: CursorOptions = {}): Promise<void> {
    const targetPos = this.resolveTarget(target)
    const speedMultiplier = options.speedMultiplier ?? this.profile?.cursorSpeedMultiplier ?? 1.0

    const jitter = this.profile?.cursorJitter ?? stealthConfig.maxJitterPx
    const tension = this.profile?.cursorTension ?? 0.35

    const path = bezierPath(this.currentPos, targetPos, {
      steps: Math.round(30 + randomBetween(0, 25)),
      tension,
      jitter,
      overshoot: true,
    })

    // Base step delay: pixels / speed gives ~10–30ms per step
    const baseDist = this.distance(this.currentPos, targetPos)
    const baseStepMs = options.stepDuration ?? this.computeStepDuration(baseDist, speedMultiplier)

    for (let i = 0; i < path.length; i++) {
      const point = path[i]

      if (options.dispatchEvents !== false) {
        this.dispatchMouseMove(point)
      }

      this.currentPos = point

      // Variable step delay: fastest in middle, slower at start/end
      const progress = i / path.length
      const speedFactor = this.speedCurve(progress)
      await sleep(baseStepMs * speedFactor)
    }

    // Snap to exact target
    this.currentPos = targetPos
    if (options.dispatchEvents !== false) {
      this.dispatchMouseMove(targetPos)
    }

    log.debug(`Cursor moved to (${targetPos.x.toFixed(0)}, ${targetPos.y.toFixed(0)})`)
  }

  /**
   * Hover over an element (move to it + dispatch mouseenter/mouseover).
   */
  async hoverElement(element: Element, options: CursorOptions = {}): Promise<void> {
    await this.moveTo(element, options)
    this.dispatchEvent(element, 'mouseenter')
    this.dispatchEvent(element, 'mouseover')
    log.debug('Hover dispatched')
  }

  /**
   * Move to element + dispatch click events.
   */
  async clickElement(
    element: Element,
    button: 0 | 1 | 2 = 0,
    options: CursorOptions = {},
  ): Promise<void> {
    await this.moveTo(element, options)
    await sleepRandom(...stealthConfig.preclickPause)

    this.dispatchEvent(element, 'mousedown', { button })
    await sleep(randomBetween(40, 120))
    this.dispatchEvent(element, 'mouseup', { button })
    this.dispatchEvent(element, 'click', { button })
    log.debug('Click dispatched')
  }

  /**
   * Compute a smooth speed multiplier for each step of the path.
   * Slow at the start (acceleration) and slow at the end (deceleration).
   */
  private speedCurve(progress: number): number {
    // Sine-based speed: slowest at 0 and 1, fastest at 0.5
    const speed = Math.sin(progress * Math.PI)
    // Clamp to avoid division by zero; slightly slower at the very start
    return 1.5 - clampValue(speed, 0.2, 1.0)
  }

  private computeStepDuration(dist: number, speedMultiplier: number): number {
    // Target ~600ms for a 400px move at 1.0x speed
    const baseMs = (dist / 400) * 600
    return Math.max(3, baseMs / 30 / speedMultiplier)
  }

  private resolveTarget(target: Element | Point): Point {
    if (target instanceof Element) {
      const rect = target.getBoundingClientRect()
      return {
        x: rect.left + rect.width / 2 + randomBetween(-5, 5),
        y: rect.top + rect.height / 2 + randomBetween(-3, 3),
      }
    }
    return target
  }

  private distance(a: Point, b: Point): number {
    return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2)
  }

  private dispatchMouseMove(point: Point): void {
    const event = new MouseEvent('mousemove', {
      bubbles: true,
      cancelable: true,
      clientX: Math.round(point.x),
      clientY: Math.round(point.y),
      screenX: Math.round(point.x),
      screenY: Math.round(point.y),
    })
    const el = document.elementFromPoint(point.x, point.y) ?? document.body
    el.dispatchEvent(event)
  }

  private dispatchEvent(element: Element, type: string, extra: MouseEventInit = {}): void {
    const event = new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX: Math.round(this.currentPos.x),
      clientY: Math.round(this.currentPos.y),
      ...extra,
    })
    element.dispatchEvent(event)
  }
}

function clampValue(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max)
}
