import { addDays } from 'date-fns'
import { useMemo, type FormEvent } from 'react'
import {
  addTask as createTaskRecord,
  deleteTaskById,
  patchTaskFields,
} from '../cloud/mutations'
import { useTasksHybrid } from '../cloud/hybridData'
import { useSecondsTick } from '../hooks/useIntervalTick'
import type { LifeTask, TaskRecurrence } from '../db/types'
import { dayKey, isRecurrenceComplete } from '../lib/dates'
import {
  countdownTo,
  effectiveDueAt,
  effectiveDueDate,
  formatDueTime,
} from '../lib/taskSchedule'
import { cn, newId } from '../lib/utils'
import { useUiStore } from '../store/uiStore'

type Bucket = 'overdue' | 'yesterday' | 'today' | 'tomorrow' | 'later' | 'done'

function bucketFor(
  due: string,
  done: boolean,
  now: Date,
): Bucket {
  if (done) return 'done'
  const y = dayKey(addDays(now, -1))
  const t = dayKey(now)
  const tm = dayKey(addDays(now, 1))
  if (due < y) return 'overdue'
  if (due === y) return 'yesterday'
  if (due === t) return 'today'
  if (due === tm) return 'tomorrow'
  return 'later'
}

const BUCKET_LABEL: Record<Bucket, string> = {
  overdue: 'Overdue',
  yesterday: 'Yesterday',
  today: 'Today',
  tomorrow: 'Tomorrow',
  later: 'Later',
  done: 'Done',
}

const BUCKET_ORDER: Bucket[] = [
  'overdue',
  'today',
  'tomorrow',
  'yesterday',
  'later',
  'done',
]

export function TasksPage() {
  const tasks = useTasksHybrid()
  const pushToast = useUiStore((s) => s.pushToast)
  const now = useSecondsTick()
  const todayStr = dayKey(now)

  const grouped = useMemo(() => {
    const enriched = tasks.map((t) => {
      const done = isRecurrenceComplete(t.lastCompletedAt, t.recurrence, now)
      const due = effectiveDueDate(t, now)
      return { t, done, due, bucket: bucketFor(due, done, now) }
    })
    enriched.sort((a, b) => {
      const da = effectiveDueAt(a.t, now).getTime()
      const db = effectiveDueAt(b.t, now).getTime()
      return da - db
    })
    const byBucket = new Map<Bucket, typeof enriched>()
    for (const row of enriched) {
      const arr = byBucket.get(row.bucket) ?? []
      arr.push(row)
      byBucket.set(row.bucket, arr)
    }
    return byBucket
  }, [tasks, now])

  async function addTask(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const title = String(fd.get('title') ?? '').trim()
    if (!title) {
      pushToast('info', 'Title required')
      return
    }
    const rawDate = String(fd.get('dueDate') ?? '').trim()
    const rawTime = String(fd.get('dueTime') ?? '').trim()
    const dueDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : todayStr
    const dueTime = /^\d{2}:\d{2}$/.test(rawTime) ? rawTime : null
    const recurrence =
      (fd.get('recurrence') as TaskRecurrence) || 'oneoff'
    const t: LifeTask = {
      id: newId(),
      title,
      priority: 'mid',
      recurrence,
      lastCompletedAt: null,
      dueDate,
      dueTime,
      createdAt: Date.now(),
    }
    await createTaskRecord(t)
    pushToast('save', 'Task added')
    e.currentTarget.reset()
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1
          className="text-lg font-semibold text-zinc-100"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Tasks
        </h1>
        <p className="text-xs text-zinc-400">
          Set a due date and time · the Today card shows a live countdown.
        </p>
      </header>

      <form
        onSubmit={addTask}
        className="grid gap-2 rounded-lg border border-[#3d4150]/80 bg-[#262934]/60 p-3 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto] sm:items-end"
      >
        <label className="block space-y-1">
          <span className="text-xs text-zinc-400">Title</span>
          <input
            name="title"
            placeholder="What needs to be done?"
            className="field w-full border-zinc-800 bg-[#1c1f27]"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-zinc-400">Due date</span>
          <input
            type="date"
            name="dueDate"
            defaultValue={todayStr}
            className="field border-zinc-800 bg-[#1c1f27] font-mono text-xs"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-zinc-400">Due time</span>
          <input
            type="time"
            name="dueTime"
            className="field border-zinc-800 bg-[#1c1f27] font-mono text-xs"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-zinc-400">Repeat</span>
          <select
            name="recurrence"
            defaultValue="oneoff"
            className="field border-zinc-800 bg-[#1c1f27] text-xs"
          >
            <option value="oneoff">once</option>
            <option value="daily">daily</option>
            <option value="weekly">weekly</option>
            <option value="monthly">monthly</option>
          </select>
        </label>
        <button
          type="submit"
          className="btn-primary rounded-md px-3 py-2 text-xs font-semibold"
        >
          + Add task
        </button>
      </form>

      <div className="space-y-5">
        {BUCKET_ORDER.filter((b) => (grouped.get(b)?.length ?? 0) > 0).map(
          (bucket) => {
            const rows = grouped.get(bucket)!
            return (
              <section key={bucket}>
                <h2 className="mb-2 flex items-baseline gap-2 font-mono text-xs uppercase tracking-wider text-zinc-400">
                  <span
                    className={cn(
                      bucket === 'overdue' && 'text-red-300',
                      bucket === 'today' && 'text-lime-300',
                      bucket === 'tomorrow' && 'text-cyan-300',
                    )}
                  >
                    {BUCKET_LABEL[bucket]}
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    {rows.length}
                  </span>
                </h2>
                <ul className="divide-y divide-[#3d4150]/60 rounded-lg border border-[#3d4150]/70 bg-[#20232c]/40">
                  {rows.map(({ t, done }) => (
                    <TaskRow
                      key={t.id}
                      task={t}
                      done={done}
                      now={now}
                      onToggle={(checked) => {
                        void patchTaskFields(t.id, {
                          lastCompletedAt: checked ? dayKey(now) : null,
                        })
                        pushToast('save', checked ? 'Task done' : 'Reopened')
                      }}
                      onPatch={(partial) => {
                        void patchTaskFields(t.id, partial)
                        pushToast('save', 'Saved')
                      }}
                      onDelete={() => {
                        if (!window.confirm('Delete task?')) return
                        void deleteTaskById(t.id)
                        pushToast('delete', 'Deleted')
                      }}
                    />
                  ))}
                </ul>
              </section>
            )
          },
        )}
        {tasks.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[#3d4150] bg-[#20232c]/40 p-8 text-center text-sm text-zinc-400">
            No tasks yet. Add one above — pick a date and time and the Today
            card will show a live countdown.
          </p>
        ) : null}
      </div>
    </div>
  )
}

function TaskRow(props: {
  task: LifeTask
  done: boolean
  now: Date
  onToggle: (checked: boolean) => void
  onPatch: (partial: Partial<LifeTask>) => void
  onDelete: () => void
}) {
  const { task, done, now } = props
  const due = effectiveDueAt(task, now)
  const cd = countdownTo(due, now)
  const due12 = formatDueTime(task.dueTime)
  const showCountdown = !done

  return (
    <li className="flex flex-wrap items-center gap-3 px-3 py-2">
      <input
        type="checkbox"
        className="h-4 w-4 shrink-0 accent-lime-500"
        checked={done}
        onChange={(e) => props.onToggle(e.target.checked)}
        aria-label={`Done: ${task.title}`}
      />
      <input
        defaultValue={task.title}
        onBlur={(e) => {
          const v = e.target.value.trim()
          if (v && v !== task.title) props.onPatch({ title: v })
        }}
        className={cn(
          'field min-w-0 flex-1 border-transparent bg-transparent text-sm',
          done && 'text-zinc-500 line-through',
        )}
      />
      <input
        type="date"
        defaultValue={task.dueDate ?? ''}
        onChange={(e) => {
          const v = e.target.value
          props.onPatch({ dueDate: v.length === 10 ? v : null })
        }}
        className="field w-[8.5rem] border-zinc-800 bg-[#1c1f27] font-mono text-[11px]"
        title="Due date"
      />
      <input
        type="time"
        defaultValue={task.dueTime ?? ''}
        onChange={(e) => {
          const v = e.target.value
          props.onPatch({ dueTime: /^\d{2}:\d{2}$/.test(v) ? v : null })
        }}
        className="field w-[6.5rem] border-zinc-800 bg-[#1c1f27] font-mono text-[11px]"
        title="Due time"
      />
      <div className="flex shrink-0 flex-col items-end font-mono text-[11px] leading-tight tabular-nums">
        {due12 ? (
          <span className="text-zinc-400">{due12}</span>
        ) : (
          <span className="text-zinc-600">end of day</span>
        )}
        {showCountdown ? (
          <span
            className={cn(
              'mt-0.5 rounded border px-1.5 py-0.5 text-[10px] font-semibold',
              cd.tone === 'overdue'
                ? 'border-red-500/60 bg-red-500/15 text-red-300'
                : cd.tone === 'soon'
                  ? 'border-amber-500/60 bg-amber-500/10 text-amber-200'
                  : 'border-[#3d4150] bg-[#1c1f27] text-zinc-300',
            )}
          >
            {cd.label}
          </span>
        ) : null}
      </div>
      <button
        type="button"
        onClick={props.onDelete}
        className="rounded border border-[#3d4150] px-2 py-1 text-xs text-zinc-400 hover:border-red-900/60 hover:text-red-300"
        aria-label="Delete task"
      >
        Delete
      </button>
    </li>
  )
}
