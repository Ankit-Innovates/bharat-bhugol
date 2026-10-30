import { useEffect, type Dispatch } from 'react'
import type { Action, Phase } from './types'

/** Dispatches 'tick' every 1000 ms while the round is playing, and stops otherwise. */
export function useTimer(phase: Phase, dispatch: Dispatch<Action>): void {
  useEffect(() => {
    if (phase !== 'playing') return
    const id = window.setInterval(() => dispatch({ type: 'tick' }), 1000)
    return () => window.clearInterval(id)
  }, [phase, dispatch])
}
