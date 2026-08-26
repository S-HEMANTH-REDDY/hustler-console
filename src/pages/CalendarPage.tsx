import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApplicationsHybrid, useTasksHybrid } from '../cloud/hybridData'
import { useFocusLog } from '../hooks/useFocusLog'
import { useIntervalTick } from '../hooks/useIntervalTick'
import { dayKey, isRecurrenceComplete } from '../lib/dates'
import { formatMinutes } from '../lib/focusLog'
import { formatDueTime } from '../lib/taskSchedule'
import { cn } from '../lib/utils'

type View = 'month' | 'week'

export function CalendarPage() {
  const now = useIntervalTick(60_000)
  const [view, setView] = useState<View>('month')
  const [cursor, setCursor] = useState(() => new Date())
  const [selected, setSelected] = useState(() => dayKey(new Date()))
  const tasks = useTasksHybrid()
  const applications = useApplicationsHybrid()
  const focusLog = useFocusLog()
  const today = dayKey(now)

  const dayData = useMemo(() => {
    const map = new Map<string, { tasks: number; tasksDone: number; focusMin: number; apps: number }>()
    const get = (k: string) => {
      let v = map.get(k)
      if (!v) { v = { tasks: 0, tasksDone: 0, focusMin: 0, apps: 0 }; map.set(k, v) }
      return v
    }
    for (const t of tasks) {
      const k = t.dueDate ?? today
      const v = get(k)
      v.tasks++
      if (isRecurrenceComplete(t.lastCompletedAt, t.recurrence, now)) v.tasksDone++
    }
    for (const e of focusLog) get(e.date).focusMin += e.minutes
    for (const a of applications) get(a.date).apps++
    return map
  }, [tasks, focusLog, applications, today, now])

  const days = useMemo(() => {
    if (view === 'week') {
      const start = startOfWeek(cursor, { weekStartsOn: 1 })
      return Array.from({ length: 7 }, (_, i) => addDays(start, i))
    }
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 })
    const out: Date[] = []
    for (let d = start; d <= end; d = addDays(d, 1)) out.push(d)
    return out
  }, [cursor, view])

  const selectedTasks = useMemo(() => {
    return tasks
      .filter((t) => (t.dueDate ?? today) === selected)
      .sort((a, b) => (a.dueTime ?? '99').localeCompare(b.dueTime ?? '99'))
  }, [tasks, selected, today])

  const selectedInfo = dayData.get(selected)
  const rangeLabel =
    view === 'month'
      ? format(cursor, 'MMMM yyyy')
      : `Week of ${format(startOfWeek(cursor, { weekStartsOn: 1 }), 'MMM d')}`

  function shift(dir: -1 | 1) {
    setCursor((c) => (view === 'month' ? addMonths(c, dir) : addDays(c, dir * 7)))
  }

  return (
    <div className="mx-auto max-w-5xl space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => shift(-1)} className="btn-quiet h-8 w-8 text-xs" aria-label={view === 'month' ? 'Previous month' : 'Previous week'}>‹</button>
          <button type="button" onClick={() => { setCursor(new Date()); setSelected(today) }} className="btn-quiet h-8 px-2.5 text-xs">Today</button>
          <button type="button" onClick={() => shift(1)} className="btn-quiet h-8 w-8 text-xs" aria-label={view === 'month' ? 'Next month' : 'Next week'}>›</button>
          <h2 className="ml-2 text-sm font-semibold text-zinc-100">{rangeLabel}</h2>
        </div>
        <div role="tablist" aria-label="Calendar view" className="flex gap-0.5 rounded-lg border border-edge bg-surface p-0.5">
          {(['week', 'month'] as View[]).map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={cn(
                'min-h-7 rounded-md px-2.5 text-xs font-medium capitalize',
                view === v ? 'bg-zinc-50/[0.07] text-zinc-50' : 'text-zinc-500 hover:text-zinc-300',
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="grid grid-cols-7 border-b border-edge-soft text-center text-[0.625rem] font-medium uppercase tracking-wider text-zinc-600">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
            <div key={d} className="py-1.5">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d) => {
            const key = dayKey(d)
            const info = dayData.get(key)
            const inMonth = view === 'week' || isSameMonth(d, cursor)
            const isToday = isSameDay(d, now)
            const isSelected = key === selected
            const openTasks = info ? info.tasks - info.tasksDone : 0
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelected(key)}
                aria-label={`${format(d, 'EEEE, MMMM d')}${openTasks ? `, ${openTasks} open tasks` : ''}${info?.focusMin ? `, ${formatMinutes(info.focusMin)} focused` : ''}`}
                aria-pressed={isSelected}
                className={cn(
                  'relative flex min-h-14 flex-col items-start gap-0.5 border-b border-r border-edge-soft p-1.5 text-left transition-colors last:border-r-0 sm:min-h-[4.5rem] sm:p-2',
                  !inMonth && 'opacity-30',
                  isSelected ? 'bg-lime-500/[0.06]' : 'hover:bg-surface-2',
                )}
              >
                <span className={cn('flex h-5 w-5 items-center justify-center rounded-full text-[0.625rem] font-medium tabular-nums', isToday ? 'bg-lime-500 text-zinc-950' : 'text-zinc-400')}>
                  {format(d, 'd')}
                </span>
                {info ? (
                  <span className="flex flex-wrap items-center gap-0.5">
                    {openTasks > 0 ? (
                      <span className="rounded-full bg-lime-500/15 px-1 text-[9px] font-medium text-lime-400" title={`${openTasks} open tasks`}>{openTasks}</span>
                    ) : null}
                    {info.tasksDone > 0 && openTasks === 0 && info.tasks > 0 ? (
                      <span className="text-[9px] text-zinc-600" title="All done">✓</span>
                    ) : null}
                    {info.focusMin > 0 ? (
                      <span className="hidden text-[9px] text-cyan-400/80 sm:inline" title={`${formatMinutes(info.focusMin)} focused`}>{formatMinutes(info.focusMin)}</span>
                    ) : null}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      </div>

      <section className="card p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-zinc-200">
            {format(new Date(selected + 'T12:00:00'), 'EEEE, MMMM d')}
            {selected === today ? (
              <span className="ml-2 rounded-full bg-lime-500/15 px-1.5 py-0.5 text-[0.625rem] font-medium text-lime-400">Today</span>
            ) : null}
          </h3>
          <Link to="/tasks" className="text-[0.6875rem] font-medium text-lime-400 hover:underline">Manage tasks</Link>
        </div>
        {selectedInfo && (selectedInfo.focusMin > 0 || selectedInfo.apps > 0) ? (
          <p className="mt-1.5 text-[0.6875rem] text-zinc-500">
            {selectedInfo.focusMin > 0 ? `${formatMinutes(selectedInfo.focusMin)} focused` : null}
            {selectedInfo.focusMin > 0 && selectedInfo.apps > 0 ? ' · ' : null}
            {selectedInfo.apps > 0 ? `${selectedInfo.apps} application${selectedInfo.apps === 1 ? '' : 's'} logged` : null}
          </p>
        ) : null}
        {selectedTasks.length === 0 ? (
          <p className="mt-2.5 text-xs text-zinc-500">No tasks on this day.</p>
        ) : (
          <ul className="mt-2.5 divide-y divide-edge-soft">
            {selectedTasks.map((t) => {
              const done = isRecurrenceComplete(t.lastCompletedAt, t.recurrence, now)
              return (
                <li key={t.id} className="flex items-center gap-2.5 py-1.5">
                  <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', done ? 'bg-zinc-700' : 'bg-lime-400')} aria-hidden />
                  <span className={cn('min-w-0 flex-1 truncate text-sm', done ? 'text-zinc-600 line-through' : 'text-zinc-200')}>{t.title}</span>
                  <span className="shrink-0 font-mono text-[0.6875rem] text-zinc-500">{formatDueTime(t.dueTime) ?? 'all day'}</span>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
