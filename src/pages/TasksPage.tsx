import { format } from 'date-fns'
import { useMemo, useState, type FormEvent } from 'react'
import {
  addTask as createTaskRecord,
  deleteTaskById,
  patchTaskFields,
} from '../cloud/mutations'
import { useTasksHybrid } from '../cloud/hybridData'
import { useIntervalTick } from '../hooks/useIntervalTick'
import type { LifeTask, TaskPriority, TaskRecurrence } from '../db/types'
import { dayKey, isRecurrenceComplete } from '../lib/dates'
import {
  countdownTo,
  effectiveDueAt,
  formatDueTime,
} from '../lib/taskSchedule'
import { cn, newId } from '../lib/utils'
import { useUiStore } from '../store/uiStore'

type Filter = 'today' | 'upcoming' | 'done'

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  high: 'High',
  mid: 'Medium',
  low: 'Low',
}

export function TasksPage() {
  const tasks = useTasksHybrid()
  const pushToast = useUiStore((s) => s.pushToast)
  const now = useIntervalTick(30_000)
  const todayStr = dayKey(now)
  const [filter, setFilter] = useState<Filter>('today')
  const [detailsOpen, setDetailsOpen] = useState(false)

  const enriched = useMemo(() => {
    const rows = tasks.map((t) => {
      const done = isRecurrenceComplete(t.lastCompletedAt, t.recurrence, now)
      const dueAt = effectiveDueAt(t, now)
      return { t, done, dueAt, dueDay: dayKey(dueAt) }
    })
    rows.sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())
    return rows
  }, [tasks, now])

  const buckets = useMemo(() => {
    return {
      today: enriched.filter((r) => !r.done && r.dueDay <= todayStr),
      upcoming: enriched.filter((r) => !r.done && r.dueDay > todayStr),
      done: enriched.filter((r) => r.done),
    }
  }, [enriched, todayStr])

  const visible = buckets[filter]

  async function addTask(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formEl = e.currentTarget
    const fd = new FormData(formEl)
    const title = String(fd.get('title') ?? '').trim()
    if (!title) {
      pushToast('info', 'Give the task a name first')
      return
    }
    const rawDate = String(fd.get('dueDate') ?? '').trim()
    const rawTime = String(fd.get('dueTime') ?? '').trim()
    const priority = (fd.get('priority') as TaskPriority) || 'mid'
    const recurrence = (fd.get('recurrence') as TaskRecurrence) || 'oneoff'
    const t: LifeTask = {
      id: newId(),
      title,
      priority,
      recurrence,
      lastCompletedAt: null,
      dueDate: /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : todayStr,
      dueTime: /^\d{2}:\d{2}$/.test(rawTime) ? rawTime : null,
      createdAt: Date.now(),
    }
    await createTaskRecord(t)
    pushToast('save', 'Task added')
    formEl.reset()
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Quick add */}
      <form onSubmit={addTask} className="card p-3 sm:p-4">
        <div className="flex gap-2">
          <input
            name="title"
            placeholder="Add a task…"
            className="field flex-1"
            aria-label="New task title"
          />
          <button
            type="submit"
            className="btn-primary shrink-0 rounded-lg px-4 py-2 text-sm"
          >
            Add
          </button>
        </div>
        <button
          type="button"
          onClick={() => setDetailsOpen((v) => !v)}
          className="mt-2 text-xs text-zinc-500 hover:text-zinc-300"
          aria-expanded={detailsOpen}
        >
          {detailsOpen ? 'Hide details' : 'Due date, priority, repeat…'}
        </button>
        <div
          className={cn(
            'grid gap-2 sm:grid-cols-4',
            detailsOpen ? 'mt-2' : 'hidden',
          )}
        >
          <label className="block space-y-1">
            <span className="text-xs text-zinc-500">Due date</span>
            <input
              type="date"
              name="dueDate"
              defaultValue={todayStr}
              className="field font-mono text-xs"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-zinc-500">Time</span>
            <input type="time" name="dueTime" className="field font-mono text-xs" />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-zinc-500">Priority</span>
            <select name="priority" defaultValue="mid" className="field text-xs">
              <option value="high">High</option>
              <option value="mid">Medium</option>
              <option value="low">Low</option>
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-zinc-500">Repeat</span>
            <select name="recurrence" defaultValue="oneoff" className="field text-xs">
              <option value="oneoff">Never</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </label>
        </div>
      </form>

      {/* Filters */}
      <div
        role="tablist"
        aria-label="Task filters"
        className="flex gap-1 rounded-lg border border-edge bg-surface p-1"
      >
        {(
          [
            ['today', `Today${buckets.today.length ? ` · ${buckets.today.length}` : ''}`],
            ['upcoming', `Upcoming${buckets.upcoming.length ? ` · ${buckets.upcoming.length}` : ''}`],
            ['done', 'Completed'],
          ] as [Filter, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={filter === key}
            onClick={() => setFilter(key)}
            className={cn(
              'min-h-9 flex-1 rounded-md px-3 text-sm font-medium transition-colors',
              filter === key
                ? 'bg-lime-500/15 text-lime-300'
                : 'text-zinc-400 hover:text-zinc-200',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      {visible.length === 0 ? (
        <p className="rounded-xl border border-dashed border-edge px-4 py-10 text-center text-sm text-zinc-500">
          {filter === 'today'
            ? 'Nothing due today. Add a task above or check Upcoming.'
            : filter === 'upcoming'
              ? 'No upcoming tasks.'
              : 'Nothing completed yet.'}
        </p>
      ) : (
        <ul className="card divide-y divide-edge-soft">
          {visible.map(({ t, done, dueAt, dueDay }) => (
            <TaskRow
              key={t.id}
              task={t}
              done={done}
              dueAt={dueAt}
              dueDay={dueDay}
              todayStr={todayStr}
              now={now}
              onToggle={(checked) => {
                void patchTaskFields(t.id, {
                  lastCompletedAt: checked ? todayStr : null,
                })
                pushToast('save', checked ? 'Task done' : 'Reopened')
              }}
              onPatch={(partial) => {
                void patchTaskFields(t.id, partial)
                pushToast('save', 'Saved')
              }}
              onDelete={() => {
                if (!window.confirm('Delete this task?')) return
                void deleteTaskById(t.id)
                pushToast('delete', 'Deleted')
              }}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function TaskRow(props: {
  task: LifeTask
  done: boolean
  dueAt: Date
  dueDay: string
  todayStr: string
  now: Date
  onToggle: (checked: boolean) => void
  onPatch: (partial: Partial<LifeTask>) => void
  onDelete: () => void
}) {
  const { task, done, dueAt, dueDay, todayStr, now } = props
  const [editing, setEditing] = useState(false)
  const cd = countdownTo(dueAt, now)
  const time12 = formatDueTime(task.dueTime)

  const dueLabel = done
    ? null
    : dueDay < todayStr
      ? 'Overdue'
      : dueDay === todayStr
        ? (time12 ?? 'Today')
        : format(dueAt, 'EEE, MMM d')

  return (
    <li className="px-3 py-2.5 sm:px-4">
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          className="h-4.5 w-4.5 shrink-0 accent-lime-500"
          checked={done}
          onChange={(e) => props.onToggle(e.target.checked)}
          aria-label={`Done: ${task.title}`}
        />
        <div className="min-w-0 flex-1">
          <input
            defaultValue={task.title}
            onBlur={(e) => {
              const v = e.target.value.trim()
              if (v && v !== task.title) props.onPatch({ title: v })
            }}
            className={cn(
              'w-full min-w-0 border-none bg-transparent text-sm outline-none',
              done ? 'text-zinc-500 line-through' : 'text-zinc-100',
            )}
            aria-label={`Task title: ${task.title}`}
          />
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
            {task.priority !== 'mid' ? (
              <span
                className={cn(
                  'rounded-full border px-1.5 py-px font-medium',
                  task.priority === 'high'
                    ? 'border-red-400/40 text-red-400'
                    : 'border-edge text-zinc-500',
                )}
              >
                {PRIORITY_LABEL[task.priority]}
              </span>
            ) : null}
            {task.recurrence !== 'oneoff' ? (
              <span className="rounded-full border border-edge px-1.5 py-px">
                {task.recurrence}
              </span>
            ) : null}
            {!done && cd.tone !== 'idle' && dueDay <= todayStr ? (
              <span
                className={cn(
                  'font-mono tabular-nums',
                  cd.tone === 'overdue' ? 'text-red-400' : 'text-amber-300',
                )}
              >
                {cd.tone === 'overdue' ? 'past due' : `${cd.label} left`}
              </span>
            ) : null}
          </div>
        </div>
        {dueLabel ? (
          <span
            className={cn(
              'shrink-0 font-mono text-xs tabular-nums',
              dueLabel === 'Overdue' ? 'text-red-400' : 'text-zinc-500',
            )}
          >
            {dueLabel}
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="btn-quiet h-8 w-8 shrink-0 text-xs"
          aria-label={`Edit ${task.title}`}
          aria-expanded={editing}
        >
          ✎
        </button>
      </div>
      {editing ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 pl-7">
          <input
            type="date"
            defaultValue={task.dueDate ?? ''}
            onChange={(e) => {
              const v = e.target.value
              props.onPatch({ dueDate: v.length === 10 ? v : null })
            }}
            className="field w-36 font-mono text-xs"
            aria-label="Due date"
          />
          <input
            type="time"
            defaultValue={task.dueTime ?? ''}
            onChange={(e) => {
              const v = e.target.value
              props.onPatch({ dueTime: /^\d{2}:\d{2}$/.test(v) ? v : null })
            }}
            className="field w-28 font-mono text-xs"
            aria-label="Due time"
          />
          <select
            defaultValue={task.priority}
            onChange={(e) =>
              props.onPatch({ priority: e.target.value as TaskPriority })
            }
            className="field w-28 text-xs"
            aria-label="Priority"
          >
            <option value="high">High</option>
            <option value="mid">Medium</option>
            <option value="low">Low</option>
          </select>
          <button
            type="button"
            onClick={props.onDelete}
            className="ml-auto rounded-lg border border-red-400/30 px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-500/10"
          >
            Delete
          </button>
        </div>
      ) : null}
    </li>
  )
}
