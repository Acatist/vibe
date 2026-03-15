/**
 * random.ts — Statistical random utilities for human behavior simulation
 */

/**
 * Returns a uniformly distributed random float in [min, max)
 */
export function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

/**
 * Returns a random integer in [min, max] (inclusive)
 */
export function randomIntBetween(min: number, max: number): number {
  return Math.floor(randomBetween(min, max + 1))
}

/**
 * Box-Muller transform — produces a gaussian-distributed number.
 * @param mean - center of distribution
 * @param stdDev - standard deviation
 */
export function gaussianRandom(mean: number, stdDev: number): number {
  let u = 0
  let v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  const standard = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
  return mean + stdDev * standard
}

/**
 * Clamps a value between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Returns a Gaussian-clamped value in [min, max].
 * Mean defaults to the midpoint. Uses ~2 stdDev range.
 */
export function gaussianBetween(min: number, max: number): number {
  const mean = (min + max) / 2
  const stdDev = (max - min) / 4
  return clamp(gaussianRandom(mean, stdDev), min, max)
}

/**
 * Randomly selects one element from an array.
 */
export function randomChoice<T>(array: readonly T[]): T {
  if (array.length === 0) throw new Error('Cannot pick from empty array')
  return array[Math.floor(Math.random() * array.length)]
}

/**
 * Executes fn with probability p (0–1). Returns true if executed.
 */
export function withProbability(p: number, fn: () => void): boolean {
  if (Math.random() < p) {
    fn()
    return true
  }
  return false
}

/**
 * Returns a delay of base ± jitter milliseconds.
 * Ensures result is never negative.
 */
export function randomDelay(base: number, jitter: number): number {
  return Math.max(0, base + randomBetween(-jitter, jitter))
}

/**
 * Generates a random WPM value within a [min, max] range using Gaussian distribution.
 */
export function randomWPM(min: number, max: number): number {
  return clamp(gaussianRandom((min + max) / 2, (max - min) / 4), min, max)
}

/**
 * Returns a random key adjacent to the given key on a QWERTY keyboard layout.
 * Used for realistic typo simulation.
 */
const QWERTY_ADJACENT: Record<string, string[]> = {
  q: ['w', 'a', 's'],
  w: ['q', 'e', 'a', 's', 'd'],
  e: ['w', 'r', 's', 'd', 'f'],
  r: ['e', 't', 'd', 'f', 'g'],
  t: ['r', 'y', 'f', 'g', 'h'],
  y: ['t', 'u', 'g', 'h', 'j'],
  u: ['y', 'i', 'h', 'j', 'k'],
  i: ['u', 'o', 'j', 'k', 'l'],
  o: ['i', 'p', 'k', 'l'],
  p: ['o', 'l'],
  a: ['q', 'w', 's', 'z'],
  s: ['a', 'w', 'e', 'd', 'x', 'z'],
  d: ['s', 'e', 'r', 'f', 'c', 'x'],
  f: ['d', 'r', 't', 'g', 'v', 'c'],
  g: ['f', 't', 'y', 'h', 'b', 'v'],
  h: ['g', 'y', 'u', 'j', 'n', 'b'],
  j: ['h', 'u', 'i', 'k', 'm', 'n'],
  k: ['j', 'i', 'o', 'l', 'm'],
  l: ['k', 'o', 'p'],
  z: ['a', 's', 'x'],
  x: ['z', 's', 'd', 'c'],
  c: ['x', 'd', 'f', 'v'],
  v: ['c', 'f', 'g', 'b'],
  b: ['v', 'g', 'h', 'n'],
  n: ['b', 'h', 'j', 'm'],
  m: ['n', 'j', 'k'],
}

export function adjacentKey(key: string): string {
  const lower = key.toLowerCase()
  const neighbors = QWERTY_ADJACENT[lower]
  if (!neighbors || neighbors.length === 0) return key
  const picked = randomChoice(neighbors)
  return key === key.toUpperCase() ? picked.toUpperCase() : picked
}
