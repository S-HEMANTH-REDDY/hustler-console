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
