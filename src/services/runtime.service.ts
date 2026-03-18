import type { RuntimeMode, RuntimeCapabilities } from '@core/types/runtime.types'
import { RUNTIME_CAPABILITIES } from '@config/runtime.config'
import { useRuntimeStore } from '@store/runtime.store'

/**
 * RuntimeService — Single entry point for runtime environment queries.
 *
 * All service factories and environment-aware code should read the
 * current mode through this service.  Never scatter `if (mode === ...)`
 * checks throughout the codebase — use the Strategy Pattern instead.
 */

export function getMode(): RuntimeMode {
  return useRuntimeStore.getState().mode
}

export function getCapabilities(): RuntimeCapabilities {
  return RUNTIME_CAPABILITIES[getMode()]
}

export function isSimulation(): boolean {
  return getMode() === 'simulation'
}

export function isStaging(): boolean {
  return getMode() === 'staging'
}

export function isProduction(): boolean {
  return getMode() === 'production'
}

export function getLogPrefix(): string {
  return RUNTIME_CAPABILITIES[getMode()].logPrefix
}
