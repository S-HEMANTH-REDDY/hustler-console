import { useEffect, useState } from 'react'

/** Re-render at interval (pace bar NOW marker). */
export function useIntervalTick(ms: number): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), ms)
    return () => clearInterval(id)
  }, [ms])
  return now
}

/**
 * One-second tick aligned to the wall clock so the display flips
 * on the same second as the system clock instead of drifting.
 */
export function useSecondsTick(): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    let timeoutId: number | null = null
    let intervalId: number | null = null
    const align = () => {
      const next = new Date()
      setNow(next)
      const msUntilNextSecond = 1000 - (next.getTime() % 1000)
      timeoutId = window.setTimeout(() => {
        setNow(new Date())
        intervalId = window.setInterval(() => setNow(new Date()), 1000)
      }, msUntilNextSecond)
    }
    align()
    return () => {
      if (timeoutId != null) window.clearTimeout(timeoutId)
      if (intervalId != null) window.clearInterval(intervalId)
    }
  }, [])
  return now
}
