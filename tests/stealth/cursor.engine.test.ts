import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CursorEngine } from '@engine/stealth/cursor.engine'
import { PROFILES } from '@profiles/index'

describe('CursorEngine', () => {
  let engine: CursorEngine

  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { value: 1280, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: 720, configurable: true })

    engine = new CursorEngine()
    engine.configure(PROFILES['normal-user'])
  })

  it('initialises at position (0,0)', () => {
    const pos = engine.getCurrentPos()
    expect(pos).toEqual({ x: 0, y: 0 })
  })

  it('moveTo updates current position to target', async () => {
    const target = { x: 300, y: 200 }
    await engine.moveTo(target, { steps: 5 })
    const pos = engine.getCurrentPos()
    expect(pos.x).toBeCloseTo(300, 0)
    expect(pos.y).toBeCloseTo(200, 0)
  }, 15_000)

  it('clickElement dispatches mouse events on the element', async () => {
    const div = document.createElement('div')
    document.body.appendChild(div)

    // Mock getBoundingClientRect for the element
    vi.spyOn(div, 'getBoundingClientRect').mockReturnValue({
      x: 100,
      y: 100,
      width: 60,
      height: 30,
      top: 100,
      left: 100,
      bottom: 130,
      right: 160,
      toJSON: () => ({}),
    })

    const events: string[] = []
    div.addEventListener('mousedown', () => events.push('mousedown'))
    div.addEventListener('mouseup', () => events.push('mouseup'))
    div.addEventListener('click', () => events.push('click'))

    await engine.clickElement(div)
    expect(events).toContain('mousedown')
    expect(events).toContain('mouseup')
    expect(events).toContain('click')
  }, 15_000)
})
