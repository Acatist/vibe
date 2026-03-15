import type { Point, BezierOptions } from '@core/types/stealth.types'
import { randomBetween, clamp } from './random'

/**
 * bezier.ts — Cubic Bézier path generation for realistic cursor movement
 */

/**
 * Evaluates a cubic Bézier curve at parameter t ∈ [0, 1].
 * P(t) = (1-t)³P₀ + 3(1-t)²tP₁ + 3(1-t)t²P₂ + t³P₃
 */
export function bezierPoint(t: number, p0: Point, p1: Point, p2: Point, p3: Point): Point {
  const mt = 1 - t
  const mt2 = mt * mt
  const mt3 = mt2 * mt
  const t2 = t * t
  const t3 = t2 * t

  return {
    x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
    y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y,
  }
}

/**
 * Evaluates the tangent (first derivative) of a cubic Bézier at parameter t.
 * Used for velocity/direction calculations.
 */
export function bezierTangent(t: number, p0: Point, p1: Point, p2: Point, p3: Point): Point {
  const mt = 1 - t
  const mt2 = mt * mt
  const t2 = t * t

  return {
    x: 3 * mt2 * (p1.x - p0.x) + 6 * mt * t * (p2.x - p1.x) + 3 * t2 * (p3.x - p2.x),
    y: 3 * mt2 * (p1.y - p0.y) + 6 * mt * t * (p2.y - p1.y) + 3 * t2 * (p3.y - p2.y),
  }
}

/**
 * Generates randomized cubic Bézier control points between two positions.
 * The control points produce a natural arc/curve similar to real mouse movement.
 */
function generateControlPoints(start: Point, end: Point, tension: number): [Point, Point] {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  const offset = dist * tension

  // Perpendicular direction
  const nx = -dy / dist
  const ny = dx / dist

  const arc1 = randomBetween(-1, 1) * offset
  const arc2 = randomBetween(-1, 1) * offset

  const cp1: Point = {
    x: start.x + dx * 0.3 + nx * arc1,
    y: start.y + dy * 0.3 + ny * arc1,
  }
  const cp2: Point = {
    x: start.x + dx * 0.7 + nx * arc2,
    y: start.y + dy * 0.7 + ny * arc2,
  }

  return [cp1, cp2]
}

/**
 * Generates a full cursor path from `start` to `end` as an array of Point objects.
 *
 * The path uses a cubic Bézier curve with randomized control points,
 * plus micro-jitter applied to each step to mimic hand tremor.
 *
 * @param start - Starting position
 * @param end   - Target position
 * @param options - Path configuration
 * @returns Array of intermediate {x, y} positions along the path
 */
export function bezierPath(start: Point, end: Point, options: BezierOptions = {}): Point[] {
  const { steps = 50, tension = 0.35, jitter = 2, overshoot = true } = options

  if (steps <= 0) return [end]

  const [cp1, cp2] = generateControlPoints(start, end, tension)

  // Optionally add a small overshoot beyond the target
  let target = end
  if (overshoot) {
    const dx = end.x - start.x
    const dy = end.y - start.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const overshootDist = randomBetween(2, Math.min(10, dist * 0.05))
    const angle = Math.atan2(dy, dx)
    const overshootPoint: Point = {
      x: end.x + Math.cos(angle) * overshootDist,
      y: end.y + Math.sin(angle) * overshootDist,
    }
    // Generate path to overshoot point, then snap back
    const [ocp1, ocp2] = generateControlPoints(start, overshootPoint, tension * 0.8)
    const points: Point[] = []
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      // Apply easing: ease-in-out (slow start, slow end, fast middle)
      const eased = easeInOutCubic(t)
      const pt = bezierPoint(eased, start, ocp1, ocp2, overshootPoint)
      points.push({
        x: pt.x + (jitter ? randomBetween(-jitter, jitter) : 0),
        y: pt.y + (jitter ? randomBetween(-jitter, jitter) : 0),
      })
    }
    // Step back to actual target
    points.push(end)
    return points
  }

  const points: Point[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const eased = easeInOutCubic(t)
    const pt = bezierPoint(eased, start, cp1, cp2, target)
    points.push({
      x: clamp(pt.x + (jitter ? randomBetween(-jitter, jitter) : 0), 0, window.innerWidth),
      y: clamp(pt.y + (jitter ? randomBetween(-jitter, jitter) : 0), 0, window.innerHeight),
    })
  }
  return points
}

/**
 * Ease-in-out cubic easing function.
 * t ∈ [0, 1] → smoothly accelerates then decelerates.
 */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/**
 * Ease-in quadratic: starts slow, accelerates.
 */
export function easeInQuadratic(t: number): number {
  return t * t
}

/**
 * Ease-out quadratic: starts fast, decelerates.
 */
export function easeOutQuadratic(t: number): number {
  return 1 - (1 - t) * (1 - t)
}
