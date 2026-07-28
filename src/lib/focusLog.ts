import { format } from 'date-fns'

/**
 * Local log of completed focus sessions. Kept in localStorage so the
 * dashboard / analytics can show focus time without any backend changes.
 */
export interface FocusSessionEntry {
  /** YYYY-MM-DD the session completed. */
  date: string
  minutes: number
  /** Date.now() when the session completed. */
  at: number
}

const KEY = 'hustler.focusLog.v1'
const MAX_ENTRIES = 3000

export function getFocusLog(): FocusSessionEntry[] {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (e): e is FocusSessionEntry =>
        typeof e === 'object' &&
        e !== null &&
        typeof (e as FocusSessionEntry).date === 'string' &&
        typeof (e as FocusSessionEntry).minutes === 'number',
    )
  } catch {
    return []
  }
}

export function recordFocusSession(minutes: number, now = new Date()) {
  const entry: FocusSessionEntry = {
    date: format(now, 'yyyy-MM-dd'),
    minutes,
    at: now.getTime(),
  }
  const log = [...getFocusLog(), entry].slice(-MAX_ENTRIES)
  try {
    window.localStorage.setItem(KEY, JSON.stringify(log))
  } catch {
    // ignore quota failures
  }
  notifyFocusLogChange()
}

/* Simple subscription so React views refresh when a session completes. */
type Listener = () => void
const listeners = new Set<Listener>()

export function subscribeFocusLog(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function notifyFocusLogChange() {
  for (const fn of listeners) fn()
}

/* ── Aggregations ── */

export function minutesOnDay(log: FocusSessionEntry[], day: string): number {
  let total = 0
  for (const e of log) if (e.date === day) total += e.minutes
  return total
}

export function sessionsOnDay(log: FocusSessionEntry[], day: string): number {
  let n = 0
  for (const e of log) if (e.date === day) n++
  return n
}

/** Minutes per day for the last N days, oldest → newest. */
export function lastNDaysMinutes(
  log: FocusSessionEntry[],
  n: number,
  now = new Date(),
): { date: string; minutes: number }[] {
  const byDay = new Map<string, number>()
  for (const e of log) byDay.set(e.date, (byDay.get(e.date) ?? 0) + e.minutes)
  const out: { date: string; minutes: number }[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000)
    const key = format(d, 'yyyy-MM-dd')
    out.push({ date: key, minutes: byDay.get(key) ?? 0 })
  }
  return out
}

export function totalMinutes(log: FocusSessionEntry[]): number {
  return log.reduce((s, e) => s + e.minutes, 0)
}

/** Consecutive days (ending today or yesterday) with at least one session. */
export function focusStreakDays(
  log: FocusSessionEntry[],
  now = new Date(),
): number {
  const days = new Set(log.map((e) => e.date))
  let streak = 0
  let cursor = new Date(now)
  if (!days.has(format(cursor, 'yyyy-MM-dd'))) {
    cursor = new Date(cursor.getTime() - 86400000)
  }
  while (days.has(format(cursor, 'yyyy-MM-dd'))) {
    streak++
    cursor = new Date(cursor.getTime() - 86400000)
  }
  return streak
}

/** Most productive weekday, by total focus minutes. */
export function bestWeekday(
  log: FocusSessionEntry[],
): { label: string; minutes: number } | null {
  if (log.length === 0) return null
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const totals = new Array<number>(7).fill(0)
  for (const e of log) {
    const d = new Date(e.date + 'T12:00:00')
    totals[d.getDay()] += e.minutes
  }
  let best = 0
  for (let i = 1; i < 7; i++) if (totals[i] > totals[best]) best = i
  if (totals[best] === 0) return null
  return { label: names[best], minutes: totals[best] }
}

/** Most productive time of day, bucketed by session completion hour. */
export function bestTimeOfDay(log: FocusSessionEntry[]): string | null {
  const withTime = log.filter((e) => typeof e.at === 'number' && e.at > 0)
  if (withTime.length === 0) return null
  const buckets = [
    { label: 'Morning (5–12)', from: 5, to: 12, minutes: 0 },
    { label: 'Afternoon (12–17)', from: 12, to: 17, minutes: 0 },
    { label: 'Evening (17–22)', from: 17, to: 22, minutes: 0 },
    { label: 'Night (22–5)', from: 22, to: 29, minutes: 0 },
  ]
  for (const e of withTime) {
    const h = new Date(e.at).getHours()
    const hh = h < 5 ? h + 24 : h
    const b = buckets.find((b) => hh >= b.from && hh < b.to)
    if (b) b.minutes += e.minutes
  }
  const best = buckets.reduce((a, b) => (b.minutes > a.minutes ? b : a))
  return best.minutes > 0 ? best.label : null
}

export function formatMinutes(min: number): string {
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}
