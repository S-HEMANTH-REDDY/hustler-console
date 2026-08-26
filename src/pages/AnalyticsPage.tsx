import { format } from 'date-fns'
import { useMemo } from 'react'
import { useApplicationsHybrid, useSettingsRowHybrid, useTasksHybrid } from '../cloud/hybridData'
import { FunnelMini, HeatLegend, HeatStrip } from '../components/charts'
import { useFocusLog } from '../hooks/useFocusLog'
import { useIntervalTick } from '../hooks/useIntervalTick'
import { dayKey } from '../lib/dates'
import {
  bestTimeOfDay,
  bestWeekday,
  focusStreakDays,
  formatMinutes,
  lastNDaysMinutes,
  totalMinutes,
} from '../lib/focusLog'
import { lastNDailyCounts, pipelineCounts, trendStats } from '../lib/insights'
import { cn } from '../lib/utils'

export function AnalyticsPage() {
  const now = useIntervalTick(60_000)
  const today = dayKey(now)
  const focusLog = useFocusLog()
  const tasks = useTasksHybrid()
  const applications = useApplicationsHybrid()
  const settings = useSettingsRowHybrid()

  const total = totalMinutes(focusLog)
  const streak = focusStreakDays(focusLog, now)
  const days14 = lastNDaysMinutes(focusLog, 14, now)
  const max14 = Math.max(...days14.map((d) => d.minutes), 1)
  const activeDays14 = days14.filter((d) => d.minutes > 0).length
  const weekday = bestWeekday(focusLog)
  const timeOfDay = bestTimeOfDay(focusLog)

  const doneByDay = useMemo(() => {
    const m = new Map<string, number>()
    for (const t of tasks) {
      if (t.lastCompletedAt) m.set(t.lastCompletedAt, (m.get(t.lastCompletedAt) ?? 0) + 1)
    }
    return m
  }, [tasks])
  const tasksWeek = useMemo(() => {
    const out: { date: string; count: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000)
      const key = format(d, 'yyyy-MM-dd')
      out.push({ date: key, count: doneByDay.get(key) ?? 0 })
    }
    return out
  }, [doneByDay, now])
  const tasksWeekTotal = tasksWeek.reduce((s, d) => s + d.count, 0)
  const tasksWeekMax = Math.max(...tasksWeek.map((d) => d.count), 1)

  const dailyMin = settings?.dailyMin ?? 25
  const dailyMax = settings?.dailyMax ?? 50
  const cells30 = useMemo(() => lastNDailyCounts(applications, 30, now), [applications, now])
  const trends = useMemo(() => trendStats(applications, now), [applications, now])
  const pipeline = useMemo(() => pipelineCounts(applications), [applications])
  const funnelStages = [
    { label: 'Applied', count: pipeline.Applied + pipeline.OA + pipeline.Phone + pipeline.Onsite + pipeline.Offer + pipeline.Accepted, color: '#71717a' },
    { label: 'OA', count: pipeline.OA + pipeline.Phone + pipeline.Onsite + pipeline.Offer + pipeline.Accepted, color: '#06b6d4' },
    { label: 'Phone', count: pipeline.Phone + pipeline.Onsite + pipeline.Offer + pipeline.Accepted, color: '#10b981' },
    { label: 'Onsite', count: pipeline.Onsite + pipeline.Offer + pipeline.Accepted, color: '#a78bfa' },
    { label: 'Offer', count: pipeline.Offer + pipeline.Accepted, color: '#84cc16' },
  ]

  return (
    <div className="mx-auto max-w-5xl space-y-5 animate-fade-in">
      {/* Focus section */}
      <section className="card p-5">
        <h3 className="section-label">Focus</h3>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label="Total time" value={formatMinutes(total)} accent="lime" />
          <Metric label="Sessions" value={String(focusLog.length)} />
          <Metric label="Streak" value={`${streak} day${streak === 1 ? '' : 's'}`} accent={streak > 0 ? 'lime' : undefined} />
          <Metric label="Active (14d)" value={`${activeDays14} / 14`} />
        </div>
        <div className="mt-5">
          <p className="text-xs text-zinc-500">Last 14 days</p>
          <div className="mt-2 flex h-28 items-end gap-1">
            {days14.map((d) => (
              <div key={d.date} className="group relative flex-1" title={`${d.date}: ${formatMinutes(d.minutes)}`}>
                <div
                  className="w-full rounded-t transition-all"
                  style={{
                    height: `${Math.max(4, (d.minutes / max14) * 100)}px`,
                    background: d.minutes > 0
                      ? 'linear-gradient(180deg, rgba(132,204,22,0.8) 0%, rgba(132,204,22,0.4) 100%)'
                      : 'var(--color-surface-3)',
                    boxShadow: d.date === today && d.minutes > 0 ? '0 0 8px rgba(132,204,22,0.3)' : undefined,
                  }}
                />
              </div>
            ))}
          </div>
        </div>
        {(weekday || timeOfDay) && (
          <p className="mt-4 border-t border-edge-soft pt-3 text-sm text-zinc-500">
            {weekday ? (<>Most productive: <span className="text-zinc-200">{weekday.label}</span>{timeOfDay ? ' · ' : null}</>) : null}
            {timeOfDay ? (<>Best time: <span className="text-zinc-200">{timeOfDay}</span></>) : null}
          </p>
        )}
        {focusLog.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">Complete your first focus session to see stats.</p>
        ) : null}
      </section>

      {/* Tasks section */}
      <section className="card p-5">
        <h3 className="section-label">Tasks</h3>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label="Done this week" value={String(tasksWeekTotal)} accent="cyan" />
          <Metric label="Done today" value={String(doneByDay.get(today) ?? 0)} />
        </div>
        <div className="mt-5 flex h-20 items-end gap-2">
          {tasksWeek.map((d) => (
            <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t transition-all"
                style={{
                  height: `${Math.max(4, (d.count / tasksWeekMax) * 64)}px`,
                  background: d.count > 0
                    ? 'linear-gradient(180deg, rgba(6,182,212,0.7) 0%, rgba(6,182,212,0.3) 100%)'
                    : 'var(--color-surface-3)',
                }}
                title={`${d.date}: ${d.count} done`}
              />
              <span className="text-[9px] font-medium text-zinc-600">{format(new Date(d.date + 'T12:00:00'), 'EEEEE')}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Applications section */}
      <section className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="section-label">Applications</h3>
          <HeatLegend dailyMin={dailyMin} dailyMax={dailyMax} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label="Today" value={String(trends.today)} />
          <Metric label="vs yesterday" value={fmtDelta(trends.deltaVsYesterday)} tone={trends.deltaVsYesterday} />
          <Metric label="7-day avg" value={String(trends.avg7)} />
          <Metric label="30-day avg" value={String(trends.avg30)} />
        </div>
        <div className="mt-5">
          <p className="text-xs text-zinc-500">Last 30 days · goal {dailyMin}–{dailyMax}</p>
          <div className="mt-2">
            <HeatStrip cells={cells30} dailyMin={dailyMin} dailyMax={dailyMax} />
          </div>
        </div>
        {applications.length > 0 ? (
          <div className="mt-5 border-t border-edge-soft pt-4">
            <p className="mb-2 text-xs text-zinc-500">Interview pipeline</p>
            <FunnelMini stages={funnelStages} />
          </div>
        ) : (
          <p className="mt-3 text-sm text-zinc-500">No applications logged yet.</p>
        )}
      </section>
    </div>
  )
}

function Metric(props: { label: string; value: string; tone?: number; accent?: 'lime' | 'cyan' }) {
  const toneClass =
    props.tone !== undefined
      ? props.tone > 0
        ? 'text-lime-400'
        : props.tone < 0
          ? 'text-amber-300'
          : 'text-zinc-50'
      : props.accent === 'lime'
        ? 'text-lime-400'
        : props.accent === 'cyan'
          ? 'text-cyan-400'
          : 'text-zinc-50'
  return (
    <div className="rounded-xl bg-well/50 border border-edge px-4 py-3 transition-colors hover:border-edge-strong">
      <p className="text-xs text-zinc-500">{props.label}</p>
      <p className={cn('mt-1 font-mono text-xl font-bold tabular-nums', toneClass)}>{props.value}</p>
    </div>
  )
}

function fmtDelta(n: number): string {
  if (n > 0) return `+${n}`
  return String(n)
}
