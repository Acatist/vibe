import type { ProfileName } from '../types/extension.types'

export const PROFILE_NAMES: Record<string, ProfileName> = {
  SLOW_USER: 'slow-user',
  NORMAL_USER: 'normal-user',
  POWER_USER: 'power-user',
} as const

export const DEFAULT_PROFILE: ProfileName = 'normal-user'
