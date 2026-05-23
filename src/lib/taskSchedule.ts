import { format, parseISO } from 'date-fns'
import type { LifeTask } from '../db/types'

/** Effective due date for a task. Tasks without an explicit date land on Today. */
export function effectiveDueDate(task: LifeTask, today: Date = new Date()): string {
  return task.dueDate && task.dueDate.length === 10
    ? task.dueDate
    : format(today, 'yyyy-MM-dd')
}

/**
 * Combine `dueDate` + `dueTime` into a concrete moment. Without a time we
 * deliberately point at the end of the day so a date-only task is "due by"
 * 11:59 PM and the countdown still counts down through the evening.
 */
export function effectiveDueAt(
  task: LifeTask,
  today: Date = new Date(),
): Date {
  const date = effectiveDueDate(task, today)
  const time =
    task.dueTime && /^\d{2}:\d{2}$/.test(task.dueTime) ? task.dueTime : '23:59'
  return parseISO(`${date}T${time}:00`)
}

export interface Countdown {
  /** ms until due — negative if overdue. */
  diffMs: number
  overdue: boolean
  /** Human countdown · negative-overdue clamps to `00:00`. */
  label: string
  /** Hint for color (red when due in <15m or overdue). */
  tone: 'idle' | 'soon' | 'overdue'
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

/** Format countdown as H:MM:SS, MM:SS, or `00:00` when overdue. */
export function countdownTo(target: Date, now: Date = new Date()): Countdown {
  const diff = target.getTime() - now.getTime()
  if (diff <= 0) {
    return { diffMs: diff, overdue: true, label: '00:00', tone: 'overdue' }
  }
  const totalSec = Math.floor(diff / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const label = h > 0 ? `${h}:${pad2(m)}:${pad2(s)}` : `${pad2(m)}:${pad2(s)}`
  const tone: Countdown['tone'] = diff < 15 * 60 * 1000 ? 'soon' : 'idle'
  return { diffMs: diff, overdue: false, label, tone }
}

/** Pretty 12-hour version of HH:mm. Returns `null` when value is missing. */
export function formatDueTime(hhmm: string | null | undefined): string | null {
  if (!hhmm || !/^\d{2}:\d{2}$/.test(hhmm)) return null
  const [hStr, mStr] = hhmm.split(':')
  const h = Number(hStr)
  const m = Number(mStr)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = ((h + 11) % 12) + 1
  return `${hour12}:${pad2(m)} ${period}`
}
