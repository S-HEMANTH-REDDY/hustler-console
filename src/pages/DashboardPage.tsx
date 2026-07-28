import { format } from 'date-fns'
import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApplicationsHybrid, useTasksHybrid } from '../cloud/hybridData'
import { patchTaskFields } from '../cloud/mutations'
import { CycleDots } from '../components/CycleDots'
import { formatClock, phaseLabel } from '../components/PomodoroEngine'
import { useFocusLog } from '../hooks/useFocusLog'
import { useIntervalTick } from '../hooks/useIntervalTick'
import { dayKey, isRecurrenceComplete } from '../lib/dates'
import {
  formatMinutes,
  lastNDaysMinutes,
  minutesOnDay,
  sessionsOnDay,
} from '../lib/focusLog'
import { effectiveDueAt, formatDueTime } from '../lib/taskSchedule'
import { cn } from '../lib/utils'
import {
  pomodoroRemainingMs,
  useTimerStore,
} from '../store/timerStore'
import { useUiStore } from '../store/uiStore'

export function DashboardPage() {
  const now = useIntervalTick(30_000)
  const today = dayKey(now)
  const tasks = useTasksHybrid()
  const applications = useApplicationsHybrid()
  const focusLog = useFocusLog()
  const pomodoro = useTimerStore((s) => s.pomodoro)
  const pomoStart = useTimerStore((s) => s.pomoStart)
  const navigate = useNavigate()
  const pushToast = useUiStore((s) => s.pushToast)

  const focusMinutesToday = minutesOnDay(focusLog, today)
  const focusSessionsToday = sessionsOnDay(focusLog, today)
  const appsToday = applications.filter((a) => a.date === today).length

  const enrichedTasks = useMemo(() => {
    return tasks
      .map((t) => ({
        task: t,
        done: isRecurrenceComplete(t.lastCompletedAt, t.recurrence, now),
        dueAt: effectiveDueAt(t, now),
      }))
      .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())
  }, [tasks, now])

  const openToday = enrichedTasks.filter(
    (t) => !t.done && dayKey(t.dueAt) <= today,
  )
  const doneToday = enrichedTasks.filter(
    (t) => t.done && t.task.lastCompletedAt === today,
  ).length
  const nextUp = enrichedTasks.find(
    (t) => !t.done && dayKey(t.dueAt) > today,
  )

  const week = lastNDaysMinutes(focusLog, 7, now)
  const weekTotal = week.reduce((s, d) => s + d.minutes, 0)
  const weekMax = Math.max(...week.map((d) => d.minutes), 1)

  const timerActive = pomodoro.running || pomodoro.everStarted

  function startFocus() {
    if (!pomodoro.running) pomoStart()
    navigate('/focus')
  }

  const hour = now.getHours()
  const greeting =
    hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {/* Hero — one clear primary action. */}
      <section className="card flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="text-sm text-zinc-400">
            {greeting} · {format(now, 'EEEE, MMM d')}
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-zinc-50">
            Ready to focus?
          </h2>
          {timerActive ? (
            <p className="mt-1.5 text-sm text-zinc-400">
              {phaseLabel(pomodoro.phase)} ·{' '}
              <span className="font-mono tabular-nums text-zinc-200">
                {formatClock(pomodoroRemainingMs(pomodoro))}
              </span>{' '}
              {pomodoro.running ? 'running' : 'paused'}
            </p>
          ) : (
            <p className="mt-1.5 text-sm text-zinc-400">
              {pomodoro.focusMin} min focus · {pomodoro.shortBreakMin} min
              break
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={startFocus}
          className="btn-primary rounded-xl px-6 py-3.5 text-base"
        >
          {timerActive
            ? pomodoro.running
              ? 'Open timer'
              : 'Resume session'
            : 'Start focus session'}
        </button>
      </section>

      {/* Today at a glance. */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Focus today"
          value={formatMinutes(focusMinutesToday)}
          sub={`${focusSessionsToday} session${focusSessionsToday === 1 ? '' : 's'}`}
        />
        <Stat
          label="Tasks done"
          value={String(doneToday)}
          sub={openToday.length > 0 ? `${openToday.length} left today` : 'all clear'}
        />
        <Stat
          label="Applications"
          value={String(appsToday)}
          sub="logged today"
        />
        <Stat
          label="This week"
          value={formatMinutes(weekTotal)}
          sub="total focus"
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Today's tasks. */}
        <section className="card p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-100">
              Today's tasks
            </h3>
            <Link
              to="/tasks"
              className="text-xs font-medium text-lime-400 hover:underline"
            >
              View all
            </Link>
          </div>
          {openToday.length === 0 ? (
            <p className="mt-4 rounded-lg border border-dashed border-edge px-4 py-6 text-center text-sm text-zinc-500">
              Nothing due today.{' '}
              <Link to="/tasks" className="text-lime-400 hover:underline">
                Add a task
              </Link>
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-edge-soft">
              {openToday.slice(0, 5).map(({ task, dueAt }) => {
                const overdue = dueAt.getTime() < now.getTime()
                const time = formatDueTime(task.dueTime)
                return (
                  <li key={task.id} className="flex items-center gap-3 py-2.5">
                    <input
                      type="checkbox"
                      className="h-4.5 w-4.5 shrink-0 accent-lime-500"
                      checked={false}
                      onChange={() => {
                        void patchTaskFields(task.id, {
                          lastCompletedAt: today,
                        })
                        pushToast('save', 'Task done')
                      }}
                      aria-label={`Mark done: ${task.title}`}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm text-zinc-100">
                      {task.title}
                    </span>
                    <span
                      className={cn(
                        'shrink-0 font-mono text-xs tabular-nums',
                        overdue ? 'text-red-400' : 'text-zinc-500',
                      )}
                    >
                      {overdue ? 'overdue' : (time ?? 'today')}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
          {openToday.length > 5 ? (
            <p className="mt-2 text-xs text-zinc-500">
              +{openToday.length - 5} more on the Tasks page
            </p>
          ) : null}
        </section>

        <div className="flex flex-col gap-4">
          {/* Up next. */}
          <section className="card p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-zinc-100">Up next</h3>
            {nextUp ? (
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="min-w-0 flex-1 truncate text-sm text-zinc-200">
                  {nextUp.task.title}
                </span>
                <span className="shrink-0 font-mono text-xs text-zinc-500">
                  {format(nextUp.dueAt, 'EEE, MMM d')}
                </span>
              </div>
            ) : (
              <p className="mt-3 text-sm text-zinc-500">
                Nothing scheduled after today.
              </p>
            )}
            <div className="mt-3 border-t border-edge-soft pt-3 text-sm text-zinc-400">
              Focus cycle:{' '}
              <CycleDots
                completed={pomodoro.completed % pomodoro.longEvery}
                total={pomodoro.longEvery}
              />
            </div>
          </section>

          {/* Weekly progress. */}
          <section className="card flex-1 p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-zinc-100">
              Last 7 days
            </h3>
            <div className="mt-4 flex h-24 items-end gap-2">
              {week.map((d) => (
                <div
                  key={d.date}
                  className="flex flex-1 flex-col items-center gap-1.5"
                >
                  <div
                    className={cn(
                      'w-full rounded-md',
                      d.minutes > 0 ? 'bg-lime-500/80' : 'bg-surface-3',
                    )}
                    style={{
                      height: `${Math.max(6, (d.minutes / weekMax) * 100)}%`,
                    }}
                    title={`${d.date}: ${formatMinutes(d.minutes)}`}
                  />
                  <span className="text-[10px] text-zinc-500">
                    {format(new Date(d.date + 'T12:00:00'), 'EEEEE')}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              {weekTotal > 0
                ? `${formatMinutes(weekTotal)} focused this week`
                : 'Complete a focus session to see progress here.'}
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}

function Stat(props: { label: string; value: string; sub: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-zinc-500">{props.label}</p>
      <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-zinc-50">
        {props.value}
      </p>
      <p className="mt-0.5 truncate text-xs text-zinc-500">{props.sub}</p>
    </div>
  )
}
