import { format, startOfDay, subDays } from 'date-fns'
import type {
  Application,
  ApplicationStatus,
  SettingsRow,
} from '../db/types'

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

function toMinutes(hm: string): number {
  const [h, m] = hm.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

export function dailyCountMap(
  applications: Application[],
): Map<string, number> {
  const m = new Map<string, number>()
  for (const a of applications) m.set(a.date, (m.get(a.date) ?? 0) + 1)
  return m
}

export function countOnDay(
  applications: Application[],
  dateKey: string,
): number {
  let n = 0
  for (const a of applications) if (a.date === dateKey) n++
  return n
}

export interface TrendStats {
  today: number
  yesterday: number
  avg7: number
  avg30: number
  deltaVsYesterday: number
  deltaVs7d: number
  deltaVs30d: number
}

export function trendStats(
  applications: Application[],
  today: Date = new Date(),
): TrendStats {
  const counts = dailyCountMap(applications)
  const t0 = startOfDay(today)
  const todayKey = format(t0, 'yyyy-MM-dd')
  const yKey = format(subDays(t0, 1), 'yyyy-MM-dd')

  const todayN = counts.get(todayKey) ?? 0
  const yN = counts.get(yKey) ?? 0

  let s7 = 0
  for (let i = 1; i <= 7; i++)
    s7 += counts.get(format(subDays(t0, i), 'yyyy-MM-dd')) ?? 0

  let s30 = 0
  for (let i = 1; i <= 30; i++)
    s30 += counts.get(format(subDays(t0, i), 'yyyy-MM-dd')) ?? 0

  const avg7 = round1(s7 / 7)
  const avg30 = round1(s30 / 30)

  return {
    today: todayN,
    yesterday: yN,
    avg7,
    avg30,
    deltaVsYesterday: round1(todayN - yN),
    deltaVs7d: round1(todayN - avg7),
    deltaVs30d: round1(todayN - avg30),
  }
}

export interface ThroughputStats {
  /** Apps per hour so far during work window. 0 if window not started. */
  rate: number
  /** Projected total at window end at current rate. */
  projected: number
  /** Apps per hour needed to hit dailyMin from now. 0 if already met. */
  recoveryRate: number
  /** Apps per hour needed to hit dailyMax from now. */
  pushRate: number
  /** Hours remaining in work window. */
  hoursRemaining: number
  /** Whether the work window is currently active. */
  windowActive: boolean
}

export function throughput(
  now: Date,
  todayCount: number,
  settings: SettingsRow,
): ThroughputStats {
  const startM = toMinutes(settings.windowStart)
  const endM = toMinutes(settings.windowEnd)
  const nowM = now.getHours() * 60 + now.getMinutes()
  const totalMin = Math.max(1, endM - startM)
  const elapsedMin = Math.min(totalMin, Math.max(0, nowM - startM))
  const remainingMin = Math.max(0, totalMin - elapsedMin)
  const elapsedHrs = elapsedMin / 60
  const remainingHrs = remainingMin / 60
  const rate = elapsedHrs > 0 ? todayCount / elapsedHrs : 0
  const projected = round1(rate * (totalMin / 60))
  const needForMin = Math.max(0, settings.dailyMin - todayCount)
  const needForMax = Math.max(0, settings.dailyMax - todayCount)
  const recoveryRate = remainingHrs > 0 ? round1(needForMin / remainingHrs) : 0
  const pushRate = remainingHrs > 0 ? round1(needForMax / remainingHrs) : 0
  return {
    rate: round1(rate),
    projected: Number.isFinite(projected) ? projected : 0,
    recoveryRate,
    pushRate,
    hoursRemaining: round1(remainingHrs),
    windowActive: nowM >= startM && nowM < endM,
  }
}

export interface MixSlice<T extends string> {
  key: T
  count: number
  pct: number
}

export function mixBy<T extends string>(values: T[]): MixSlice<T>[] {
  const total = values.length || 1
  const m = new Map<T, number>()
  for (const v of values) m.set(v, (m.get(v) ?? 0) + 1)
  return Array.from(m.entries())
    .map(([key, count]) => ({
      key,
      count,
      pct: round1((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count)
}

export function pipelineCounts(
  applications: Application[],
): Record<ApplicationStatus, number> {
  const out: Record<ApplicationStatus, number> = {
    Applied: 0,
    OA: 0,
    Phone: 0,
    Onsite: 0,
    Offer: 0,
    Accepted: 0,
    Rejected: 0,
    Ghosted: 0,
  }
  for (const a of applications) out[a.status] = (out[a.status] ?? 0) + 1
  return out
}

export function recentCompanies(
  applications: Application[],
  limit = 12,
): string[] {
  const sorted = [...applications].sort((a, b) => b.createdAt - a.createdAt)
  const seen = new Set<string>()
  const out: string[] = []
  for (const a of sorted) {
    const k = a.company.trim()
    if (!k) continue
    const lk = k.toLowerCase()
    if (seen.has(lk)) continue
    seen.add(lk)
    out.push(k)
    if (out.length >= limit) break
  }
  return out
}

export function recentResumes(
  applications: Application[],
  limit = 8,
): string[] {
  const sorted = [...applications].sort((a, b) => b.createdAt - a.createdAt)
  const seen = new Set<string>()
  const out: string[] = []
  for (const a of sorted) {
    const k = a.resumeVersion.trim()
    if (!k) continue
    const lk = k.toLowerCase()
    if (seen.has(lk)) continue
    seen.add(lk)
    out.push(k)
    if (out.length >= limit) break
  }
  return out
}

export interface DailyCount {
  date: string
  count: number
}

export function lastNDailyCounts(
  applications: Application[],
  n: number,
  today: Date = new Date(),
): DailyCount[] {
  const counts = dailyCountMap(applications)
  const out: DailyCount[] = []
  const t0 = startOfDay(today)
  for (let i = n - 1; i >= 0; i--) {
    const d = subDays(t0, i)
    const key = format(d, 'yyyy-MM-dd')
    out.push({ date: key, count: counts.get(key) ?? 0 })
  }
  return out
}

export function hoursMinutesRemaining(
  now: Date,
  windowEnd: string,
  windowStart: string,
): {
  hours: number
  minutes: number
  minutesTotal: number
  beforeWindow: boolean
  afterWindow: boolean
} {
  const startM = toMinutes(windowStart)
  const endM = toMinutes(windowEnd)
  const nowM = now.getHours() * 60 + now.getMinutes()
  if (nowM < startM)
    return {
      hours: 0,
      minutes: 0,
      minutesTotal: 0,
      beforeWindow: true,
      afterWindow: false,
    }
  if (nowM >= endM)
    return {
      hours: 0,
      minutes: 0,
      minutesTotal: 0,
      beforeWindow: false,
      afterWindow: true,
    }
  const left = endM - nowM
  return {
    hours: Math.floor(left / 60),
    minutes: left % 60,
    minutesTotal: left,
    beforeWindow: false,
    afterWindow: false,
  }
}

const BACKUP_KEY = 'execution.lastBackupAt'

export function recordBackupNow(): void {
  try {
    localStorage.setItem(BACKUP_KEY, String(Date.now()))
  } catch {
    // localStorage can throw in private browsing; ignore
  }
}

export function backupAgeDays(): number | null {
  try {
    const v = localStorage.getItem(BACKUP_KEY)
    if (!v) return null
    const t = Number(v)
    if (!Number.isFinite(t)) return null
    return Math.floor((Date.now() - t) / 86400000)
  } catch {
    return null
  }
}
