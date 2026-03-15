import type { ProfileName } from '@core/types/extension.types'
import type { BehaviorProfile } from '@core/types/stealth.types'
import { slowUserProfile } from './slow-user'
import { normalUserProfile } from './normal-user'
import { powerUserProfile } from './power-user'

export const PROFILES: Record<ProfileName, BehaviorProfile> = {
  'slow-user': slowUserProfile,
  'normal-user': normalUserProfile,
  'power-user': powerUserProfile,
}

export function getProfile(name: ProfileName): BehaviorProfile {
  return PROFILES[name]
}

export { slowUserProfile, normalUserProfile, powerUserProfile }
