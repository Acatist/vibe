import { describe, it, expect, beforeEach } from 'vitest'
import { TypingEngine } from '@engine/stealth/typing.engine'
import { PROFILES } from '@profiles/index'

describe('TypingEngine', () => {
  let engine: TypingEngine
  let input: HTMLInputElement

  beforeEach(() => {
    engine = new TypingEngine()
    engine.configure(PROFILES['normal-user'])

    input = document.createElement('input')
    input.type = 'text'
    document.body.appendChild(input)
  })

  it('types a string into an input element', async () => {
    await engine.humanType(input, 'hello', { typoRate: 0 })
    expect(input.value).toBe('hello')
  }, 30_000)

  it('clears existing content before typing when clearFirst=true', async () => {
    input.value = 'old text'
    await engine.humanType(input, 'new', { typoRate: 0, clearFirst: true })
    expect(input.value).toBe('new')
  }, 30_000)

  it('dispatches keyboard events for each character', async () => {
    const events: string[] = []
    input.addEventListener('keydown', () => events.push('keydown'))
    input.addEventListener('keyup', () => events.push('keyup'))

    await engine.humanType(input, 'ab', { typoRate: 0 })
    expect(events.filter((e) => e === 'keydown').length).toBeGreaterThanOrEqual(2)
    expect(events.filter((e) => e === 'keyup').length).toBeGreaterThanOrEqual(2)
  }, 30_000)
})
