import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, type FormEvent } from 'react'
import { db } from '../db/database'
import type { LifeTask, TaskPriority, TaskRecurrence } from '../db/types'
import { dayKey, isRecurrenceComplete } from '../lib/dates'
import { useIntervalTick } from '../hooks/useIntervalTick'
import { useUiStore } from '../store/uiStore'
import { cn, newId } from '../lib/utils'

const EMPTY_TASKS: LifeTask[] = []

export function TasksPage() {
  const raw = useLiveQuery(() => db.tasks.toArray(), [])
  const tasks = (raw ?? EMPTY_TASKS) as LifeTask[]
  const pushToast = useUiStore((s) => s.pushToast)
  const today = useIntervalTick(60_000)

  const sorted = useMemo(() => {
    return tasks
      .map((t) => ({
        t,
        done: isRecurrenceComplete(t.lastCompletedAt, t.recurrence, today),
      }))
      .sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1
        const pr: Record<TaskPriority, number> = { high: 0, mid: 1, low: 2 }
        return pr[a.t.priority] - pr[b.t.priority]
      })
  }, [tasks, today])

  async function addTask(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const title = String(fd.get('title') ?? '').trim()
    if (!title) {
      pushToast('info', 'Title required')
      return
    }
    const t: LifeTask = {
      id: newId(),
      title,
      priority: (fd.get('priority') as TaskPriority) || 'mid',
      recurrence: (fd.get('recurrence') as TaskRecurrence) || 'oneoff',
      lastCompletedAt: null,
      createdAt: Date.now(),
    }
    await db.tasks.add(t)
    pushToast('save', 'Task added')
    e.currentTarget.reset()
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 opacity-90">
      <div>
        <h1
          className="text-lg font-semibold text-zinc-300"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Tasks
        </h1>
        <p className="text-xs text-zinc-400">
          Life lane · demoted priority versus applications
        </p>
      </div>

      <form
        onSubmit={addTask}
        className="flex flex-col gap-2 rounded border border-[#3d4150]/80 bg-[#262934]/50 p-3 md:flex-row md:items-end"
      >
        <label className="block flex-1 space-y-1">
          <span className="text-xs text-zinc-400">Title</span>
          <input name="title" className="field border-zinc-800 bg-[#0d0d0f]" />
        </label>
        <label className="block space-y-1 md:w-28">
          <span className="text-xs text-zinc-400">Priority</span>
          <select
            name="priority"
            className="field border-zinc-800 bg-[#0d0d0f] text-xs"
            defaultValue="mid"
          >
            <option value="low">low</option>
            <option value="mid">mid</option>
            <option value="high">high</option>
          </select>
        </label>
        <label className="block space-y-1 md:w-36">
          <span className="text-xs text-zinc-400">Recurrence</span>
          <select
            name="recurrence"
            className="field border-zinc-800 bg-[#0d0d0f] text-xs"
            defaultValue="oneoff"
          >
            <option value="oneoff">one-off</option>
            <option value="daily">daily</option>
            <option value="weekly">weekly</option>
            <option value="monthly">monthly</option>
          </select>
        </label>
        <button
          type="submit"
          className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-300"
        >
          Add task
        </button>
      </form>

      <ul className="space-y-2">
        {sorted.map(({ t, done }) => (
          <li
            key={t.id}
            className={cn(
              'rounded border border-[#3d4150]/70 p-3',
              done ? 'bg-[#0d0d0f]/80 text-zinc-400' : 'bg-[#262934]/60',
            )}
          >
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 accent-lime-500"
                checked={done}
                onChange={(e) => {
                  const checked = e.target.checked
                  void db.tasks.update(t.id, {
                    lastCompletedAt: checked ? dayKey(today) : null,
                  })
                  pushToast('save', checked ? 'Marked done' : 'Reopened')
                }}
              />
              <input
                className={cn(
                  'field flex-1 border-zinc-800 bg-transparent text-sm',
                  done && 'line-through',
                )}
                defaultValue={t.title}
                onBlur={(e) => {
                  void db.tasks.update(t.id, { title: e.target.value })
                  pushToast('save', 'Saved')
                }}
              />
              <select
                className="field w-24 border-zinc-800 bg-transparent text-xs"
                value={t.priority}
                onChange={(e) => {
                  void db.tasks.update(t.id, {
                    priority: e.target.value as TaskPriority,
                  })
                  pushToast('save', 'Saved')
                }}
              >
                <option value="low">low</option>
                <option value="mid">mid</option>
                <option value="high">high</option>
              </select>
              <select
                className="field w-28 border-zinc-800 bg-transparent text-xs"
                value={t.recurrence}
                onChange={(e) => {
                  void db.tasks.update(t.id, {
                    recurrence: e.target.value as TaskRecurrence,
                  })
                  pushToast('save', 'Saved')
                }}
              >
                <option value="oneoff">one-off</option>
                <option value="daily">daily</option>
                <option value="weekly">weekly</option>
                <option value="monthly">monthly</option>
              </select>
              <button
                type="button"
                className="text-xs text-red-400/80 hover:text-red-300"
                onClick={() => {
                  if (!window.confirm('Delete task?')) return
                  void db.tasks.delete(t.id)
                  pushToast('delete', 'Deleted')
                }}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
      {tasks.length === 0 ? (
        <p className="text-center text-sm text-zinc-400">No errands logged.</p>
      ) : null}
    </div>
  )
}
