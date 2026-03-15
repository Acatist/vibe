import type { BehaviorProfile, TypingOptions, TypoType } from '@core/types/stealth.types'
import { sleep } from '@utils/timing'
import {
  randomWPM,
  gaussianRandom,
  randomBetween,
  withProbability,
  adjacentKey,
  randomChoice,
  clamp,
} from '@utils/random'
import { Logger } from '@services/logger.service'
import { stealthConfig } from '@config/stealth.config'

const log = Logger.create('TypingEngine')

/**
 * TypingEngine — Simulates realistic human keyboard input.
 *
 * Features:
 * - Variable WPM from behavior profile
 * - Character-by-character delay with Gaussian jitter
 * - Punctuation and thinking pauses
 * - 5 typo types with correction simulation
 * - No paste/clipboard use (CAPTCHA-safe)
 * - Works on any focusable input, textarea, or contenteditable
 */
export class TypingEngine {
  private profile: BehaviorProfile | null = null

  configure(profile: BehaviorProfile): void {
    this.profile = profile
  }

  /**
   * Type text into a target element with human-realistic behavior.
   */
  async humanType(element: HTMLElement, text: string, options: TypingOptions = {}): Promise<void> {
    const wpm = options.wpm ?? this.currentWPM()
    const typoRate = options.typoRate ?? this.profile?.typoRate ?? 0.05
    const thinkingRate = options.thinkingPauseRate ?? this.profile?.thinkingPauseRate ?? 0.15

    if (options.clearFirst) {
      await this.clearElement(element)
    }

    element.focus()
    await sleep(randomBetween(80, 200))

    let charIndex = 0
    while (charIndex < text.length) {
      const char = text[charIndex]

      // Thinking pause at word boundaries (space before new word)
      if (char === ' ' && withProbability(thinkingRate, () => {})) {
        await sleep(randomBetween(...stealthConfig.thinkingPauseDuration))
      }

      // Punctuation pause
      if ('.!?,;:'.includes(char)) {
        await this.typeChar(element, char, wpm)
        await sleep(randomBetween(...stealthConfig.punctuationPauseDuration))
        charIndex++
        continue
      }

      // Typo simulation
      const shouldMakeTypo = Math.random() < typoRate && char.trim().length > 0
      if (shouldMakeTypo) {
        const typoType = this.pickTypoType()
        await this.simulateTypo(element, char, typoType, wpm)
      } else {
        await this.typeChar(element, char, wpm)
      }

      charIndex++
    }

    log.debug(`Typed ${text.length} characters at ~${wpm.toFixed(0)} WPM`)
  }

  private async typeChar(element: HTMLElement, char: string, wpm: number): Promise<void> {
    const baseDelay = 60_000 / (wpm * 5)
    const delay = clamp(
      gaussianRandom(baseDelay, baseDelay * 0.3),
      stealthConfig.minKeystrokeMs,
      baseDelay * 3,
    )

    this.dispatchKeydown(element, char)
    this.dispatchKeypress(element, char)
    this.insertChar(element, char)
    this.dispatchInput(element)
    await sleep(delay * 0.4)
    this.dispatchKeyup(element, char)
    await sleep(delay * 0.6)
  }

  private async simulateTypo(
    element: HTMLElement,
    intendedChar: string,
    typoType: TypoType,
    wpm: number,
  ): Promise<void> {
    let typoChar: string

    switch (typoType) {
      case 'adjacent-key':
        typoChar = adjacentKey(intendedChar)
        break
      case 'double-press':
        typoChar = intendedChar
        await this.typeChar(element, typoChar, wpm)
        await sleep(randomBetween(60, 200))
        await this.backspace(element)
        await this.typeChar(element, intendedChar, wpm)
        return
      case 'transposition':
        // Swap current char with next char — handle at caller level
        typoChar = intendedChar
        break
      case 'missed-key':
        // Skip a character then add it back
        await sleep(randomBetween(300, 900))
        await this.typeChar(element, intendedChar, wpm)
        return
      case 'fat-finger':
        // Type an extra character next to the intended one
        typoChar = adjacentKey(intendedChar)
        await this.typeChar(element, intendedChar, wpm)
        await this.typeChar(element, typoChar, wpm * 0.8)
        await sleep(randomBetween(100, 400))
        await this.backspace(element)
        return
    }

    // Type the typo character
    await this.typeChar(element, typoChar, wpm)

    // Pause as if noticing the mistake
    await sleep(randomBetween(150, 600))

    // Correct it with backspace
    await this.backspace(element)

    // Type the correct character
    await this.typeChar(element, intendedChar, wpm * 0.9)
  }

  private async backspace(element: HTMLElement): Promise<void> {
    this.dispatchKeydown(element, 'Backspace')
    this.deleteLastChar(element)
    this.dispatchInput(element)
    await sleep(randomBetween(40, 120))
    this.dispatchKeyup(element, 'Backspace')
    await sleep(randomBetween(30, 80))
  }

  private async clearElement(element: HTMLElement): Promise<void> {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      element.value = ''
      this.dispatchInput(element)
    } else if (element.isContentEditable) {
      element.textContent = ''
      this.dispatchInput(element)
    }
    await sleep(50)
  }

  private insertChar(element: HTMLElement, char: string): void {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      const start = element.selectionStart ?? element.value.length
      const end = element.selectionEnd ?? element.value.length
      element.value = element.value.slice(0, start) + char + element.value.slice(end)
      element.selectionStart = start + 1
      element.selectionEnd = start + 1
    } else if (element.isContentEditable) {
      const sel = window.getSelection()
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0)
        range.deleteContents()
        range.insertNode(document.createTextNode(char))
        range.collapse(false)
      }
    }
  }

  private deleteLastChar(element: HTMLElement): void {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      const start = element.selectionStart ?? element.value.length
      if (start > 0) {
        element.value = element.value.slice(0, start - 1) + element.value.slice(start)
        element.selectionStart = start - 1
        element.selectionEnd = start - 1
      }
    } else if (element.isContentEditable) {
      const sel = window.getSelection()
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0)
        range.setStart(range.startContainer, Math.max(0, range.startOffset - 1))
        range.deleteContents()
      }
    }
  }

  private dispatchKeydown(element: HTMLElement, key: string): void {
    element.dispatchEvent(
      new KeyboardEvent('keydown', {
        key,
        code: this.keyToCode(key),
        bubbles: true,
        cancelable: true,
      }),
    )
  }

  private dispatchKeypress(element: HTMLElement, key: string): void {
    element.dispatchEvent(
      new KeyboardEvent('keypress', {
        key,
        code: this.keyToCode(key),
        charCode: key.charCodeAt(0),
        bubbles: true,
        cancelable: true,
      }),
    )
  }

  private dispatchKeyup(element: HTMLElement, key: string): void {
    element.dispatchEvent(
      new KeyboardEvent('keyup', {
        key,
        code: this.keyToCode(key),
        bubbles: true,
        cancelable: true,
      }),
    )
  }

  private dispatchInput(element: HTMLElement): void {
    element.dispatchEvent(new Event('input', { bubbles: true, cancelable: false }))
    element.dispatchEvent(new Event('change', { bubbles: true, cancelable: false }))
  }

  private keyToCode(key: string): string {
    if (key === 'Backspace') return 'Backspace'
    if (key === ' ') return 'Space'
    if (key === 'Enter') return 'Enter'
    if (key.length === 1) return `Key${key.toUpperCase()}`
    return key
  }

  private pickTypoType(): TypoType {
    const types: TypoType[] = [
      'adjacent-key',
      'adjacent-key', // Most common
      'double-press',
      'transposition',
      'missed-key',
      'fat-finger',
    ]
    return randomChoice(types)
  }

  private currentWPM(): number {
    if (!this.profile) return 65
    const [min, max] = this.profile.wpmRange
    return randomWPM(min, max)
  }
}
