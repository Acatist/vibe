import { useSessionStore } from '@store/session.store'
import { sessionService } from '@services/session.service'
import { useEffect } from 'react'

/**
 * useSession — Hook for tracking the current automation session.
 *
 * Usage:
 *   const { session, startSession, endSession, isIdle } = useSession()
 */
export function useSession() {
  const {
    id,
    startTime,
    isActive,
    totalActiveMs,
    breakCount,
    isFatigued,
    startSession,
    endSession,
    updateState,
  } = useSessionStore()

  useEffect(() => {
    const unsubscribe = sessionService.onChange((state) => {
      updateState(state)
    })
    return unsubscribe
  }, [updateState])

  return {
    session: { id, startTime, isActive, totalActiveMs, breakCount, isFatigued },
    startSession,
    endSession,
    isIdle: sessionService.isIdle(),
    sessionDurationMs: isActive && startTime > 0 ? Date.now() - startTime : 0,
  }
}
