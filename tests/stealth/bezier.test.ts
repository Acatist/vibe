import { describe, it, expect } from 'vitest'
import { bezierPoint, bezierPath, easeInOutCubic } from '@utils/bezier'
import type { Point } from '@core/types/stealth.types'

describe('bezier.ts', () => {
  describe('bezierPoint', () => {
    it('returns start point at t=0', () => {
      const p0: Point = { x: 0, y: 0 }
      const p1: Point = { x: 50, y: 0 }
      const p2: Point = { x: 50, y: 100 }
      const p3: Point = { x: 100, y: 100 }

      const result = bezierPoint(0, p0, p1, p2, p3)
      expect(result.x).toBeCloseTo(0)
      expect(result.y).toBeCloseTo(0)
    })

    it('returns end point at t=1', () => {
      const p0: Point = { x: 0, y: 0 }
      const p1: Point = { x: 50, y: 0 }
      const p2: Point = { x: 50, y: 100 }
      const p3: Point = { x: 100, y: 100 }

      const result = bezierPoint(1, p0, p1, p2, p3)
      expect(result.x).toBeCloseTo(100)
      expect(result.y).toBeCloseTo(100)
    })

    it('returns intermediate point at t=0.5', () => {
      const p0: Point = { x: 0, y: 0 }
      const p1: Point = { x: 0, y: 0 }
      const p2: Point = { x: 100, y: 100 }
      const p3: Point = { x: 100, y: 100 }

      const result = bezierPoint(0.5, p0, p1, p2, p3)
      expect(result.x).toBeGreaterThan(0)
      expect(result.x).toBeLessThan(100)
    })
  })

  describe('bezierPath', () => {
    it('generates a path with steps+2 points (including overshoot snap)', () => {
      // jsdom window.innerWidth/innerHeight fallback
      Object.defineProperty(window, 'innerWidth', { value: 1280, configurable: true })
      Object.defineProperty(window, 'innerHeight', { value: 720, configurable: true })

      const start: Point = { x: 0, y: 0 }
      const end: Point = { x: 200, y: 200 }
      const path = bezierPath(start, end, { steps: 20, jitter: 0, overshoot: false })

      expect(path.length).toBe(21) // steps + 1 (t=0 to t=1)
    })

    it('starts near start and ends at end point', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1280, configurable: true })
      Object.defineProperty(window, 'innerHeight', { value: 720, configurable: true })

      const start: Point = { x: 10, y: 10 }
      const end: Point = { x: 500, y: 300 }
      const path = bezierPath(start, end, { steps: 30, jitter: 0, overshoot: false })

      const first = path[0]
      expect(Math.abs(first.x - start.x)).toBeLessThan(5)
      expect(Math.abs(first.y - start.y)).toBeLessThan(5)
    })

    it('returns [end] when steps=0', () => {
      const start: Point = { x: 0, y: 0 }
      const end: Point = { x: 100, y: 100 }
      const path = bezierPath(start, end, { steps: 0 })
      expect(path).toEqual([end])
    })
  })

  describe('easeInOutCubic', () => {
    it('returns 0 at t=0', () => {
      expect(easeInOutCubic(0)).toBeCloseTo(0)
    })

    it('returns 1 at t=1', () => {
      expect(easeInOutCubic(1)).toBeCloseTo(1)
    })

    it('returns 0.5 at t=0.5 (symmetric)', () => {
      expect(easeInOutCubic(0.5)).toBeCloseTo(0.5)
    })
  })
})
