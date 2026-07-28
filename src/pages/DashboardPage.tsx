import { format } from 'date-fns'
import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  useApplicationsHybrid,
  useSettingsRowHybrid,
  useTasksHybrid,
} from '../cloud/hybridData'
import { patchTaskFields } from '../cloud/mutations'
import { CycleDots } from '../components/CycleDots'
import { PaceBar, PaceHeroNumber } from '../components/PaceVisual'
import { formatClock, phaseLabel } from '../lib/timerFormat'
import { useFocusLog } from '../hooks/useFocusLog'
import { useIntervalTick } from '../hooks/useIntervalTick'
import { dayKey, isRecurrenceComplete } from '../lib/dates'
import {
  formatMinutes,
  lastNDaysMinutes,
  minutesOnDay,
  sessionsOnDay,
} from '../lib/focusLog'
import { hoursMinutesRemaining, throughput } from '../lib/insights'
import { computePace, sweetSpot } from '../lib/pace'
import { effectiveDueAt, formatDueTime } from '../lib/taskSchedule'
import { cn } from '../lib/utils'
import { pomodoroRemainingMs, useTimerStore } from '../store/timerStore'
import { useUiStore } from '../store/uiStore'

export function DashboardPage() {
  const now = useIntervalTick(30_000)
  const today = dayKey(now)
  const tasks = useTasksHybrid()
  const applications = useApplicationsHybrid()
  const settings = useSettingsRowHybrid()
  const focusLog = useFocusLog()
  const pomodoro = useTimerStore((s) => s.pomodoro)
  const pomoStart = useTimerStore((s) => s.pomoStart)
  const navigate = useNavigate()
  const pushToast = useUiStore((s) => s.pushToast)

  const dailyMin = settings?.dailyMin ?? 25
  const dailyMax = settings?.dailyMax ?? 50
  const sweet = sweetSpot(dailyMin, dailyMax)
  const winStart = settings?.windowStart ?? '00:00'
  const winEnd = settings?.windowEnd ?? '23:59'

  const todayApps = useMemo(
    () => applications.filter((a) => a.date === today),
    [applications, today],
  )

  const pace = useMemo(() => {
    if (!settings) {
      return computePace(now, todayApps.length, {
        id: 'default',
        dailyMin: 25,
        dailyMax: 50,
        windowStart: '00:00',
        windowEnd: '23:59',
        updatedAt: 0,
      })
    }
    return computePace(now, todayApps.length, settings)
  }, [settings, now, todayApps.length])

  const firstAppMs = useMemo(() => {
    if (todayApps.length === 0) return null
    return todayApps.reduce(
      (min, a) => (a.createdAt < min ? a.createdAt : min),
      todayApps[0].createdAt,
    )
  }, [todayApps])

  const tput = useMemo(() => {
    if (!settings) return null
    return throughput(now, todayApps.length, settings, firstAppMs)
  }, [settings, now, todayApps.length, firstAppMs])

  const wr = hoursMinutesRemaining(now, winEnd, winStart)

  const focusMinutesToday = minutesOnDay(focusLog, today)
  const focusSessionsToday = sessionsOnDay(focusLog, today)

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
  const nextUp = enrichedTasks.find((t) => !t.done && dayKey(t.dueAt) > today)

  const week = lastNDaysMinutes(focusLog, 7, now)
  const weekTotal = week.reduce((s, d) => s + d.minutes, 0)
  const weekMax = Math.max(...week.map((d) => d.minutes), 1)

  const timerActive = pomodoro.running || pomodoro.everStarted
  const todayAppsSorted = useMemo(
    () => [...todayApps].sort((a, b) => b.createdAt - a.createdAt),
    [todayApps],
  )

  function startFocus() {
    if (!pomodoro.running) pomoStart()
    navigate('/focus')
  }

  const stateBadge =
    pace.state === 'idle'
      ? 'border-edge text-zinc-400'
      : pace.state === 'onPace'
        ? 'border-lime-500/60 text-lime-300'
        : pace.state === 'behind'
          ? 'border-amber-500/60 text-amber-200'
          : 'border-red-500/60 text-red-300'

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {/* Application quota — primary daily goal */}
      <section className="card p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Applications today · goal {dailyMin}–{dailyMax} · sweet spot{' '}
              {sweet.min}–{sweet.max}
            </p>
            <div className="mt-1 flex flex-wrap items-baseline gap-3">
              <PaceHeroNumber count={pace.todayCount} state={pace.state} />
              <div className="flex flex-col gap-1">
                <span className="font-mono text-2xl font-semibold tabular-nums text-zinc-400">
                  / {dailyMin}
                </span>
                <span
                  className={cn(
                    'rounded border px-2 py-0.5 text-center font-mono text-xs uppercase tracking-wider',
                    stateBadge,
                  )}
                >
                  {pace.state.replace('onPace', 'on pace')}
                </span>
              </div>
            </div>
            <p className="mt-3 max-w-xl font-mono text-sm text-zinc-300">
              {pace.statusLine}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
            <Link
              to="/applications#quick-log"
              className="btn-primary rounded-lg px-5 py-3 text-center text-sm"
            >
              + Log application
            </Link>
            <p className="font-mono text-xs text-zinc-500 sm:text-right">
              {wr.beforeWindow
                ? `Day opens ${winStart}`
                : wr.afterWindow
                  ? `Day ended at ${winEnd}`
                  : `${wr.hours}h ${String(wr.minutes).padStart(2, '0')}m left`}
            </p>
          </div>
        </div>

        <div className="mt-6">
          <PaceBar pace={pace} dailyMin={dailyMin} dailyMax={dailyMax} />
        </div>

        {tput ? (
          <div className="mt-5 grid gap-px overflow-hidden rounded-lg border border-edge bg-edge sm:grid-cols-2 lg:grid-cols-4">
            <ThroughputTile
              label="Logged today"
              value={`${pace.todayCount}`}
              hint={
                tput.measuring && tput.activeSinceMs
                  ? `${tput.rate.toFixed(1)}/hr since ${format(new Date(tput.activeSinceMs), 'HH:mm')}`
                  : pace.todayCount === 1 && tput.activeSinceMs
                    ? `started ${format(new Date(tput.activeSinceMs), 'HH:mm')}`
                    : 'log your first to start'
              }
            />
            <ThroughputTile
              label="Forecast"
              value={tput.measuring ? `${tput.projected.toFixed(0)}` : '—'}
              hint={
                tput.measuring
                  ? tput.projected >= dailyMin
                    ? `On track for ${dailyMin}–${dailyMax}`
                    : `Below ${dailyMin} at this pace`
                  : 'Need 2+ apps to project'
              }
              valueClass={
                !tput.measuring
                  ? 'text-zinc-300'
                  : tput.projected >= dailyMin
                    ? 'text-lime-300'
                    : 'text-amber-300'
              }
            />
            <ThroughputTile
              label={`To hit ${dailyMin}`}
              value={
                tput.recoveryRate > 0
                  ? `+${Math.max(0, dailyMin - pace.todayCount)}`
                  : 'Done'
              }
              hint={
                tput.recoveryRate > 0
                  ? `≈ ${tput.recoveryRate.toFixed(1)}/hr · ${tput.hoursRemaining.toFixed(1)}h left`
                  : `Min reached · stretch to ${dailyMax}`
              }
              valueClass={
                tput.recoveryRate > 0 ? 'text-amber-300' : 'text-lime-300'
              }
            />
            <ThroughputTile
              label={`To hit ${dailyMax}`}
              value={
                tput.pushRate > 0
                  ? `+${Math.max(0, dailyMax - pace.todayCount)}`
                  : 'Max hit'
              }
              hint={
                tput.pushRate > 0
                  ? `≈ ${tput.pushRate.toFixed(1)}/hr to top out`
                  : 'Already at max'
              }
            />
          </div>
        ) : null}
      </section>

      {/* Focus + quick stats */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <button
          type="button"
          onClick={startFocus}
          className="card flex items-center justify-between gap-3 p-4 text-left transition-colors hover:border-lime-500/40"
        >
          <div>
            <p className="text-xs text-zinc-500">Focus</p>
            <p className="mt-0.5 text-sm font-semibold text-zinc-100">
              {timerActive
                ? `${phaseLabel(pomodoro.phase)} · ${formatClock(pomodoroRemainingMs(pomodoro))}`
                : 'Start session'}
            </p>
          </div>
          <span className="btn-primary rounded-lg px-3 py-1.5 text-xs">
            {timerActive ? (pomodoro.running ? 'Open' : 'Resume') : 'Start'}
          </span>
        </button>
        <Stat
          label="Focus today"
          value={formatMinutes(focusMinutesToday)}
          sub={`${focusSessionsToday} session${focusSessionsToday === 1 ? '' : 's'}`}
        />
        <Stat
          label="Tasks done"
          value={String(doneToday)}
          sub={
            openToday.length > 0
              ? `${openToday.length} left today`
              : 'all clear'
          }
        />
        <Stat
          label="This week"
          value={formatMinutes(weekTotal)}
          sub="total focus"
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Today's applications log */}
        <section className="card p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-100">
              Today's applications
            </h3>
            <Link
              to="/applications"
              className="text-xs font-medium text-lime-400 hover:underline"
            >
              View all
            </Link>
          </div>
          {todayAppsSorted.length === 0 ? (
            <p className="mt-4 rounded-lg border border-dashed border-edge px-4 py-6 text-center text-sm text-zinc-500">
              Nothing logged yet.{' '}
              <Link
                to="/applications#quick-log"
                className="text-lime-400 hover:underline"
              >
                Log your first
              </Link>
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-edge-soft">
              {todayAppsSorted.slice(0, 6).map((a) => (
                <li key={a.id} className="flex items-center gap-3 py-2">
                  <span className="w-10 shrink-0 font-mono text-xs text-zinc-500">
                    {format(new Date(a.createdAt), 'HH:mm')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-zinc-100">{a.company}</p>
                    <p className="truncate font-mono text-xs text-zinc-500">
                      {a.role} · {a.source}
                    </p>
                  </div>
                  <span className="shrink-0 rounded border border-edge px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                    {a.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {todayAppsSorted.length > 6 ? (
            <p className="mt-2 text-xs text-zinc-500">
              +{todayAppsSorted.length - 6} more on Applications
            </p>
          ) : null}
        </section>

        {/* Today's tasks */}
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
          {nextUp ? (
            <p className="mt-3 border-t border-edge-soft pt-3 text-xs text-zinc-500">
              Up next: {nextUp.task.title} ·{' '}
              {format(nextUp.dueAt, 'EEE, MMM d')}
            </p>
          ) : null}
          <div className="mt-3 border-t border-edge-soft pt-3 text-sm text-zinc-400">
            Focus cycle:{' '}
            <CycleDots
              completed={pomodoro.completed % pomodoro.longEvery}
              total={pomodoro.longEvery}
            />
          </div>
        </section>
      </div>

      {/* Weekly focus bars */}
      <section className="card p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-100">
            Focus · last 7 days
          </h3>
          <Link
            to="/analytics"
            className="text-xs font-medium text-lime-400 hover:underline"
          >
            Analytics
          </Link>
        </div>
        <div className="mt-4 flex h-20 items-end gap-2">
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
      </section>
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

function ThroughputTile(props: {
  label: string
  value: string
  hint: string
  valueClass?: string
}) {
  return (
    <div className="bg-surface p-3">
      <div className="font-mono text-xs uppercase tracking-wider text-zinc-500">
        {props.label}
      </div>
      <div
        className={cn(
          'mt-0.5 font-mono text-xl font-semibold tabular-nums',
          props.valueClass ?? 'text-zinc-100',
        )}
      >
        {props.value}
      </div>
      <div className="font-mono text-xs text-zinc-500">{props.hint}</div>
    </div>
  )
}
