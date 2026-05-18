import type {
  PassionDailySlotRow,
  PassionScheduleDoc,
  PassionWeekendSlotRow,
} from '../db/types'
import { newId } from './utils'

const DEFAULT_DAILY_ROWS = 16
const DEFAULT_WEEKEND_ROWS = 10

function emptyDailyRow(): PassionDailySlotRow {
  return { id: newId(), timeRange: '', activity: '', duration: '' }
}

function emptyWeekendRow(): PassionWeekendSlotRow {
  return { id: newId(), day: '', session: '', duration: '' }
}

export function createEmptyPassionScheduleDoc(): PassionScheduleDoc {
  const now = Date.now()
  return {
    id: 'default',
    dailyRows: Array.from({ length: DEFAULT_DAILY_ROWS }, emptyDailyRow),
    weekendRows: Array.from({ length: DEFAULT_WEEKEND_ROWS }, emptyWeekendRow),
    updatedAt: now,
  }
}

function normDaily(r: unknown): PassionDailySlotRow {
  const x = r as Partial<PassionDailySlotRow>
  return {
    id: x.id && typeof x.id === 'string' ? x.id : newId(),
    timeRange: typeof x.timeRange === 'string' ? x.timeRange : '',
    activity: typeof x.activity === 'string' ? x.activity : '',
    duration: typeof x.duration === 'string' ? x.duration : '',
  }
}

function normWeekend(r: unknown): PassionWeekendSlotRow {
  const x = r as Partial<PassionWeekendSlotRow>
  return {
    id: x.id && typeof x.id === 'string' ? x.id : newId(),
    day: typeof x.day === 'string' ? x.day : '',
    session: typeof x.session === 'string' ? x.session : '',
    duration: typeof x.duration === 'string' ? x.duration : '',
  }
}

export function normalizePassionScheduleDoc(raw: unknown): PassionScheduleDoc {
  const base = createEmptyPassionScheduleDoc()
  if (!raw || typeof raw !== 'object') return base
  const o = raw as Partial<PassionScheduleDoc>
  const daily = Array.isArray(o.dailyRows)
    ? (o.dailyRows as unknown[]).map(normDaily)
    : []
  const weekend = Array.isArray(o.weekendRows)
    ? (o.weekendRows as unknown[]).map(normWeekend)
    : []
  return {
    id: 'default',
    dailyRows: daily.length ? daily : base.dailyRows,
    weekendRows: weekend.length ? weekend : base.weekendRows,
    updatedAt:
      typeof o.updatedAt === 'number' && Number.isFinite(o.updatedAt)
        ? o.updatedAt
        : Date.now(),
  }
}
