import {
  differenceInCalendarDays,
  endOfWeek,
  format,
  getISOWeek,
  isSameMonth,
  parseISO,
  startOfDay,
  startOfISOWeek,
} from 'date-fns'
import type { Application } from '../db/types'

export const GRADUATION_TARGET = parseISO('2026-05-01')

export function dayKey(d: Date = new Date()): string {
  return format(d, 'yyyy-MM-dd')
}

export function isoWeekNumber(d: Date = new Date()): number {
  return getISOWeek(d)
}

/**
 * Streak: consecutive completed past days where applications >= dailyMin.
 * Today never breaks streak while the calendar day is open.
 */
export function computeApplicationStreak(
  applications: Application[],
  dailyMin: number,
  today: Date = new Date(),
): number {
  const counts = new Map<string, number>()
  for (const a of applications) {
    counts.set(a.date, (counts.get(a.date) ?? 0) + 1)
  }

  let streak = 0
  let cursor = startOfDay(today)
  cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000)

  while (true) {
    const key = format(cursor, 'yyyy-MM-dd')
    const c = counts.get(key) ?? 0
    if (c >= dailyMin) streak += 1
    else break
    cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000)
  }
  return streak
}

export function rollingAvgLastNDays(
  applications: Application[],
  n: number,
  today: Date = new Date(),
): number {
  const counts = new Map<string, number>()
  for (const a of applications) {
    counts.set(a.date, (counts.get(a.date) ?? 0) + 1)
  }

  let sum = 0
  for (let i = 0; i < n; i++) {
    const d = new Date(startOfDay(today).getTime() - i * 86400000)
    const key = format(d, 'yyyy-MM-dd')
    sum += counts.get(key) ?? 0
  }
  return Math.round((sum / n) * 10) / 10
}

export function weeksToGraduation(today: Date = new Date()): {
  label: string
  weeks: number
} {
  const days = differenceInCalendarDays(GRADUATION_TARGET, today)
  if (days <= 0) {
    return { label: 'Post target · May 1, 2026', weeks: 0 }
  }
  const weeks = Math.ceil(days / 7)
  return { label: `${weeks} wk to May 1`, weeks }
}

export type SparkDay = {
  date: string
  count: number
  band: 'below' | 'within' | 'above'
}

export function lastNSparkDays(
  applications: Application[],
  n: number,
  dailyMin: number,
  dailyMax: number,
  today: Date = new Date(),
): SparkDay[] {
  const counts = new Map<string, number>()
  for (const a of applications) {
    counts.set(a.date, (counts.get(a.date) ?? 0) + 1)
  }

  const out: SparkDay[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(startOfDay(today).getTime() - i * 86400000)
    const key = format(d, 'yyyy-MM-dd')
    const count = counts.get(key) ?? 0
    let band: SparkDay['band']
    if (count < dailyMin) band = 'below'
    else if (count <= dailyMax) band = 'within'
    else band = 'above'
    out.push({ date: key, count, band })
  }
  return out
}

/** True if `lastCompleted` counts as done for `recurrence` on `today`. */
export function isRecurrenceComplete(
  lastCompleted: string | null,
  recurrence: 'oneoff' | 'daily' | 'weekly' | 'monthly',
  today: Date = new Date(),
): boolean {
  if (!lastCompleted) return false
  const t0 = startOfDay(today)
  if (recurrence === 'oneoff') return true
  if (recurrence === 'daily') {
    return lastCompleted === format(t0, 'yyyy-MM-dd')
  }
  if (recurrence === 'weekly') {
    const weekStart = startOfISOWeek(t0)
    const weekEnd = endOfWeek(t0, { weekStartsOn: 1 })
    const lc = parseISO(lastCompleted + 'T12:00:00')
    return lc >= weekStart && lc <= weekEnd
  }
  if (recurrence === 'monthly') {
    const lc = parseISO(lastCompleted + 'T12:00:00')
    return isSameMonth(lc, t0)
  }
  return false
}
