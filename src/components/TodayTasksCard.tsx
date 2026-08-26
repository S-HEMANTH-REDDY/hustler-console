import { addDays, format } from 'date-fns'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { patchTaskFields } from '../cloud/mutations'
import { useTasksHybrid } from '../cloud/hybridData'
import { useSecondsTick } from '../hooks/useIntervalTick'
import { dayKey, isRecurrenceComplete } from '../lib/dates'
import {
  countdownTo,
  effectiveDueAt,
  effectiveDueDate,
  formatDueTime,
} from '../lib/taskSchedule'
import { cn } from '../lib/utils'
import { useUiStore } from '../store/uiStore'

type Tab = 'yesterday' | 'today' | 'tomorrow'

const TAB_LABEL: Record<Tab, string> = {
  yesterday: 'Yesterday',
  today: 'Today',
  tomorrow: 'Tomorrow',
}

function tabKey(tab: Tab, now: Date): string {
  if (tab === 'yesterday') return dayKey(addDays(now, -1))
  if (tab === 'tomorrow') return dayKey(addDays(now, 1))
  return dayKey(now)
}

export function TodayTasksCard() {
  const tasks = useTasksHybrid()
  const pushToast = useUiStore((s) => s.pushToast)
  const now = useSecondsTick()
  const [tab, setTab] = useState<Tab>('today')

  const counts = useMemo(() => {
    const byTab: Record<Tab, { open: number; total: number }> = {
      yesterday: { open: 0, total: 0 },
      today: { open: 0, total: 0 },
      tomorrow: { open: 0, total: 0 },
    }
    for (const t of tasks) {
      const due = effectiveDueDate(t, now)
      let where: Tab | null = null
      if (due === tabKey('yesterday', now)) where = 'yesterday'
      else if (due === tabKey('today', now)) where = 'today'
      else if (due === tabKey('tomorrow', now)) where = 'tomorrow'
      if (!where) continue
      byTab[where].total += 1
      if (!isRecurrenceComplete(t.lastCompletedAt, t.recurrence, now)) {
        byTab[where].open += 1
      }
    }
    return byTab
  }, [tasks, now])

  const visible = useMemo(() => {
    const wanted = tabKey(tab, now)
    const rows = tasks
      .filter((t) => effectiveDueDate(t, now) === wanted)
      .map((t) => ({
        t,
        done: isRecurrenceComplete(t.lastCompletedAt, t.recurrence, now),
        due: effectiveDueAt(t, now),
      }))
    rows.sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1
      return a.due.getTime() - b.due.getTime()
    })
    return rows
  }, [tasks, tab, now])

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="section-label">
            Tasks · {TAB_LABEL[tab].toLowerCase()}
          </p>
          <h2 className="mt-1 text-base font-semibold text-zinc-100">
            {format(
              tab === 'yesterday'
                ? addDays(now, -1)
                : tab === 'tomorrow'
                  ? addDays(now, 1)
                  : now,
              'EEEE · MMM d',
            )}
          </h2>
        </div>
        <Link
          to="/tasks"
          className="font-mono text-xs text-zinc-400 hover:text-lime-300"
        >
          Manage →
        </Link>
      </div>

      <div className="mt-3 flex gap-1 rounded-2xl border border-edge bg-well/50 p-1 text-sm">
        {(['yesterday', 'today', 'tomorrow'] as Tab[]).map((k) => {
          const active = k === tab
          const c = counts[k]
          return (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={cn(
                'flex-1 rounded-xl px-2 py-2 font-medium transition-all',
                active
                  ? 'bg-lime-500/10 text-lime-100 shadow-[inset_0_0_0_1px_rgba(132,204,22,0.35)]'
                  : 'text-zinc-400 hover:bg-surface hover:text-zinc-200',
              )}
              aria-pressed={active}
            >
              <span>{TAB_LABEL[k]}</span>
              <span
                className={cn(
                  'ml-1.5 font-mono text-[10px]',
                  active ? 'text-lime-300/80' : 'text-zinc-500',
                )}
              >
                {c.open}/{c.total}
              </span>
            </button>
          )
        })}
      </div>

      <ul className="mt-4 divide-y divide-edge/40">
        {visible.length === 0 ? (
          <li className="py-8 text-center text-sm text-zinc-400">
            Nothing scheduled for {TAB_LABEL[tab].toLowerCase()}.{' '}
            <Link to="/tasks" className="text-lime-400/90 hover:underline">
              Add one →
            </Link>
          </li>
        ) : null}
        {visible.map(({ t, done, due }) => {
          const cd = countdownTo(due, now)
          const due12 = formatDueTime(t.dueTime)
          // Hide countdown on yesterday/tomorrow tabs — only "today" gets the
          // live clock so the card stays calm.
          const showCountdown = tab === 'today' && !done
          return (
            <li
              key={t.id}
              className="flex items-center gap-3 py-2.5 first:pt-1.5"
            >
              <input
                type="checkbox"
                className="h-4 w-4 shrink-0 accent-lime-500"
                checked={done}
                aria-label={`Done: ${t.title}`}
                onChange={(e) => {
                  const checked = e.target.checked
                  void patchTaskFields(t.id, {
                    lastCompletedAt: checked ? dayKey(now) : null,
                  })
                  pushToast('save', checked ? 'Task done' : 'Reopened')
                }}
              />
              <span
                className={cn(
                  'min-w-0 flex-1 truncate text-sm',
                  done ? 'text-zinc-500 line-through' : 'text-zinc-200',
                )}
                title={t.title}
              >
                {t.title}
              </span>
              <div className="flex shrink-0 flex-col items-end font-mono text-xs leading-tight tabular-nums">
                {due12 ? (
                  <span className="text-zinc-400">{due12}</span>
                ) : (
                  <span className="text-zinc-600">—</span>
                )}
                {showCountdown ? (
                  <span
                    className={cn(
                      'mt-0.5 rounded border px-1.5 py-0.5 text-[10px] font-semibold',
                      cd.tone === 'overdue'
                        ? 'border-red-500/60 bg-red-500/15 text-red-300'
                        : cd.tone === 'soon'
                          ? 'border-amber-500/60 bg-amber-500/10 text-amber-200'
                          : 'border-edge bg-base text-zinc-300',
                    )}
                    aria-label={
                      cd.overdue ? 'Overdue' : `Due in ${cd.label}`
                    }
                  >
                    {cd.label}
                  </span>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
