import { useState, useEffect, useCallback, useRef } from 'react'

type EntityState = 'resting' | 'thinking' | 'acting'

interface TransitionState {
  from: EntityState
  to: EntityState
  progress: number
  isTransitioning: boolean
}

const TRANSITION_DURATIONS: Record<string, number> = {
  'resting-thinking': 1500,
  'thinking-acting': 600,
  'acting-resting': 2000,
  'thinking-resting': 1200,
  'resting-acting': 800,
  'acting-thinking': 1000,
}

function getTransitionDuration(from: EntityState, to: EntityState): number {
  return TRANSITION_DURATIONS[`${from}-${to}`] || 1000
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

export function useEntityState() {
  const [currentState, setCurrentState] = useState<EntityState>('resting')
  const [transition, setTransition] = useState<TransitionState>({
    from: 'resting',
    to: 'resting',
    progress: 1,
    isTransitioning: false,
  })

  const transitionRef = useRef<{ startTime: number; duration: number } | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  const transitionTo = useCallback((newState: EntityState) => {
    if (newState === currentState || transition.isTransitioning) return

    const duration = getTransitionDuration(currentState, newState)
    transitionRef.current = { startTime: performance.now(), duration }

    setTransition({
      from: currentState,
      to: newState,
      progress: 0,
      isTransitioning: true,
    })
  }, [currentState, transition.isTransitioning])

  useEffect(() => {
    if (!transition.isTransitioning || !transitionRef.current) return

    const animate = () => {
      if (!transitionRef.current) return

      const elapsed = performance.now() - transitionRef.current.startTime
      const rawProgress = Math.min(elapsed / transitionRef.current.duration, 1)
      const easedProgress = easeInOutCubic(rawProgress)

      if (rawProgress >= 1) {
        setCurrentState(transition.to)
        setTransition(prev => ({
          ...prev,
          progress: 1,
          isTransitioning: false,
        }))
        transitionRef.current = null
      } else {
        setTransition(prev => ({
          ...prev,
          progress: easedProgress,
        }))
        animationFrameRef.current = requestAnimationFrame(animate)
      }
    }

    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [transition.isTransitioning, transition.to])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      if (key === 'r') transitionTo('resting')
      else if (key === 't') transitionTo('thinking')
      else if (key === 'a') transitionTo('acting')
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [transitionTo])

  return {
    currentState,
    transition,
    transitionTo,
  }
}

export function getInterpolatedValue(
  restingValue: number,
  thinkingValue: number,
  actingValue: number,
  currentState: EntityState,
  transition: TransitionState
): number {
  const stateValues = { resting: restingValue, thinking: thinkingValue, acting: actingValue }

  if (!transition.isTransitioning) {
    return stateValues[currentState]
  }

  const fromValue = stateValues[transition.from]
  const toValue = stateValues[transition.to]

  return fromValue + (toValue - fromValue) * transition.progress
}

export type { EntityState, TransitionState }
