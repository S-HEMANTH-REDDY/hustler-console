import type { SettingsRow } from '../db/types'

export type PaceState = 'idle' | 'onPace' | 'behind' | 'pastMax'

export interface PaceComputation {
  state: PaceState
  todayCount: number
  /** Expected cumulative applications by now to finish at dailyMin by window end */
  expectedNow: number
  delta: number
  fraction: number
  statusLine: string
}

function parseHm(s: string): { h: number; m: number } {
  const [h, m] = s.split(':').map(Number)
  return { h: h ?? 0, m: m ?? 0 }
}

function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes()
}

/** Fraction [0,1] of same-day work window elapsed at `now`. */
export function workWindowFraction(
  now: Date,
  settings: Pick<SettingsRow, 'windowStart' | 'windowEnd'>,
): number {
  const startM =
    parseHm(settings.windowStart).h * 60 + parseHm(settings.windowStart).m
  const endM =
    parseHm(settings.windowEnd).h * 60 + parseHm(settings.windowEnd).m
  const nowM = minutesOfDay(now)
  if (endM <= startM) {
    const span = 24 * 60
    return Math.min(1, Math.max(0, nowM / span))
  }
  if (nowM <= startM) return 0
  if (nowM >= endM) return 1
  return (nowM - startM) / (endM - startM)
}

export function formatClock(now: Date): string {
  return now.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function computePace(
  now: Date,
  todayCount: number,
  settings: SettingsRow,
): PaceComputation {
  const fraction = workWindowFraction(now, settings)
  const expectedNow = settings.dailyMin * fraction
  const delta = Math.round((todayCount - expectedNow) * 10) / 10
  const tol = Math.max(0.75, settings.dailyMin * 0.03)
  const startM =
    parseHm(settings.windowStart).h * 60 + parseHm(settings.windowStart).m
  const nowM = minutesOfDay(now)
  const beforeStart = nowM < startM
  const idleEarlyWindow = fraction < 0.06 && todayCount === 0

  let state: PaceState
  let statusLine: string

  if (todayCount > settings.dailyMax) {
    state = 'pastMax'
    statusLine = `Past max · prioritize quality · ${formatClock(now)}`
  } else if (beforeStart || idleEarlyWindow) {
    state = 'idle'
    statusLine = beforeStart
      ? `Pre-window · ${formatClock(now)}`
      : `Idle · day not started · ${formatClock(now)}`
  } else if (todayCount + tol < expectedNow) {
    state = 'behind'
    const behind = Math.max(1, Math.ceil(expectedNow - todayCount))
    statusLine = `Behind by ${behind} · ramp now · ${formatClock(now)}`
  } else if (todayCount >= expectedNow - tol) {
    state = 'onPace'
    const prefix =
      Math.abs(delta) < 0.05
        ? `On pace · ${formatClock(now)}`
        : `On pace · ${delta >= 0 ? '+' : ''}${delta} vs expected at ${formatClock(now)}`
    statusLine = prefix
  } else {
    state = 'behind'
    statusLine = `Behind · ${formatClock(now)}`
  }

  return {
    state,
    todayCount,
    expectedNow: Math.round(expectedNow * 10) / 10,
    delta: Math.round(delta * 10) / 10,
    fraction,
    statusLine,
  }
}
