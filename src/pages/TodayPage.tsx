import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { db, ensureDefaults } from '../db/database'
import type {
  Application,
  ApplicationSource,
  BehavioralStory,
  DsaProblem,
  LifeTask,
  ResumeAttachment,
  SystemDesignProblem,
  TaskPriority,
  TaskRecurrence,
} from '../db/types'
import {
  FunnelMini,
  HeatLegend,
  HeatStrip,
  MiniBars,
  Sparkline,
} from '../components/charts'
import { DayRibbon } from '../components/DayRibbon'
import { PaceBar, PaceHeroNumber } from '../components/PaceVisual'
import {
  ResumeInlinePreview,
  ResumePreviewToolbar,
} from '../components/ResumePreview'
import { useIntervalTick } from '../hooks/useIntervalTick'
import { BEHAVIORAL_CATEGORIES, statusPillClass } from '../lib/constants'
import { dayKey, isRecurrenceComplete } from '../lib/dates'
import {
  hoursMinutesRemaining,
  lastNDailyCounts,
  mixBy,
  pipelineCounts,
  throughput,
  trendStats,
} from '../lib/insights'
import { computePace } from '../lib/pace'
import { cn } from '../lib/utils'
import { useUiStore } from '../store/uiStore'

const EMPTY_APPS: Application[] = []
const EMPTY_DSA: DsaProblem[] = []
const EMPTY_SD: SystemDesignProblem[] = []
const EMPTY_STORIES: BehavioralStory[] = []
const EMPTY_TASKS: LifeTask[] = []
const EMPTY_RESUMES: ResumeAttachment[] = []

function recurrenceShort(r: TaskRecurrence): string {
  switch (r) {
    case 'oneoff':
      return 'once'
    case 'daily':
      return 'daily'
    case 'weekly':
      return 'wk'
    case 'monthly':
      return 'mo'
    default:
      return r
  }
}

const SOURCE_COLORS: Record<ApplicationSource, string> = {
  LinkedIn: '#06b6d4',
  Company: '#84cc16',
  Referral: '#a78bfa',
  Handshake: '#f59e0b',
  Otta: '#ec4899',
  Wellfound: '#22d3ee',
  Other: '#71717a',
}

export function TodayPage() {
  const tick = useIntervalTick(60_000)
  const settings = useLiveQuery(() => ensureDefaults(), [])
  const applications =
    useLiveQuery(() => db.applications.toArray(), []) ?? EMPTY_APPS
  const dsaProblems =
    useLiveQuery(() => db.dsaProblems.toArray(), []) ?? EMPTY_DSA
  const sysdesignProblems =
    useLiveQuery(() => db.systemDesignProblems.toArray(), []) ?? EMPTY_SD
  const stories =
    useLiveQuery(() => db.behavioralStories.toArray(), []) ?? EMPTY_STORIES
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) ?? EMPTY_TASKS
  const resumeRows =
    useLiveQuery(() => db.resumeFiles.toArray(), []) ?? EMPTY_RESUMES
  const resumeIndex = useMemo(() => {
    const m = new Map<string, ResumeAttachment>()
    for (const r of resumeRows) m.set(r.id, r)
    return m
  }, [resumeRows])
  const pushToast = useUiStore((s) => s.pushToast)

  const today = dayKey(tick)
  const [selectedKey, setSelectedKey] = useState<string>(today)
  const [previewedAppId, setPreviewedAppId] = useState<string | null>(null)
  const todayApps = useMemo(
    () => applications.filter((a) => a.date === today),
    [applications, today],
  )

  const dailyMin = settings?.dailyMin ?? 30
  const dailyMax = settings?.dailyMax ?? 50
  const winStart = settings?.windowStart ?? '09:00'
  const winEnd = settings?.windowEnd ?? '21:00'

  const pace = useMemo(() => {
    if (!settings) {
      return computePace(tick, todayApps.length, {
        id: 'default',
        dailyMin: 30,
        dailyMax: 50,
        windowStart: '09:00',
        windowEnd: '21:00',
        updatedAt: 0,
      })
    }
    return computePace(tick, todayApps.length, settings)
  }, [settings, tick, todayApps.length])

  const tput = useMemo(() => {
    if (!settings) return null
    return throughput(tick, todayApps.length, settings)
  }, [settings, tick, todayApps.length])

  const trends = useMemo(
    () => trendStats(applications, tick),
    [applications, tick],
  )

  const cells30 = useMemo(
    () => lastNDailyCounts(applications, 30, tick),
    [applications, tick],
  )

  const dsaToday = dsaProblems.filter((p) => p.date === today).length
  const sdToday = sysdesignProblems.filter((p) => p.date === today).length
  const dsaSpark = useMemo(() => {
    const counts = new Map<string, number>()
    for (const p of dsaProblems) counts.set(p.date, (counts.get(p.date) ?? 0) + 1)
    const out: number[] = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date(tick.getTime() - i * 86400000)
      out.push(counts.get(format(d, 'yyyy-MM-dd')) ?? 0)
    }
    return out
  }, [dsaProblems, tick])

  const sdSpark = useMemo(() => {
    const counts = new Map<string, number>()
    for (const p of sysdesignProblems)
      counts.set(p.date, (counts.get(p.date) ?? 0) + 1)
    const out: number[] = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date(tick.getTime() - i * 86400000)
      out.push(counts.get(format(d, 'yyyy-MM-dd')) ?? 0)
    }
    return out
  }, [sysdesignProblems, tick])

  // Per-day computed values for the selected-day detail strip
  const selectedDetail = useMemo(() => {
    const apps = applications.filter((a) => a.date === selectedKey).length
    const dsa = dsaProblems.filter((p) => p.date === selectedKey).length
    const sd = sysdesignProblems.filter((p) => p.date === selectedKey).length
    const beh = stories.filter(
      (s) => format(new Date(s.updatedAt), 'yyyy-MM-dd') === selectedKey,
    ).length
    return { apps, dsa, sd, beh }
  }, [applications, dsaProblems, sysdesignProblems, stories, selectedKey])

  const tasksDone = tasks.filter((t) =>
    isRecurrenceComplete(t.lastCompletedAt, t.recurrence, tick),
  ).length
  const tasksTotal = tasks.length

  const openTasks = useMemo(() => {
    const pr: Record<TaskPriority, number> = { high: 0, mid: 1, low: 2 }
    return tasks
      .filter(
        (t) =>
          !isRecurrenceComplete(t.lastCompletedAt, t.recurrence, tick),
      )
      .sort((a, b) => pr[a.priority] - pr[b.priority])
  }, [tasks, tick])

  const sourceMixToday = useMemo(
    () =>
      mixBy(todayApps.map((a) => a.source)).map((s) => ({
        key: s.key,
        label: s.key,
        count: s.count,
        color: SOURCE_COLORS[s.key as ApplicationSource] ?? '#84cc16',
      })),
    [todayApps],
  )

  const pipeline = useMemo(() => pipelineCounts(applications), [applications])
  const funnelStages = [
    { label: 'Applied', count: pipeline.Applied + pipeline.OA + pipeline.Phone + pipeline.Onsite + pipeline.Offer + pipeline.Accepted, color: '#52525b' },
    { label: 'OA', count: pipeline.OA + pipeline.Phone + pipeline.Onsite + pipeline.Offer + pipeline.Accepted, color: '#06b6d4' },
    { label: 'Phone', count: pipeline.Phone + pipeline.Onsite + pipeline.Offer + pipeline.Accepted, color: '#10b981' },
    { label: 'Onsite', count: pipeline.Onsite + pipeline.Offer + pipeline.Accepted, color: '#a78bfa' },
    { label: 'Offer', count: pipeline.Offer + pipeline.Accepted, color: '#84cc16' },
  ]

  const behavioralGaps = BEHAVIORAL_CATEGORIES.filter(
    (cat) => !stories.some((s) => s.category === cat),
  ).length
  const behavioralCoverage = Math.round(
    ((BEHAVIORAL_CATEGORIES.length - behavioralGaps) /
      BEHAVIORAL_CATEGORIES.length) *
      100,
  )

  const todayAppsSorted = useMemo(
    () => [...todayApps].sort((a, b) => b.createdAt - a.createdAt),
    [todayApps],
  )

  const wr = hoursMinutesRemaining(tick, winEnd, winStart)

  const stateBadge =
    pace.state === 'idle'
      ? 'border-zinc-600 text-zinc-400'
      : pace.state === 'onPace'
        ? 'border-lime-500/60 text-lime-300'
        : pace.state === 'behind'
          ? 'border-amber-500/60 text-amber-200'
          : 'border-red-500/60 text-red-300'

  const showTasks = openTasks.slice(0, 8)
  const moreTasks = openTasks.length - showTasks.length

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section
        className="surface-glossy relative overflow-hidden rounded-xl p-5 md:p-7"
      >
        <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-lime-500/5 blur-3xl" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <p
              className="text-[10px] font-medium uppercase tracking-wider text-zinc-500"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Application pace · today
            </p>
            <div className="mt-1 flex flex-wrap items-baseline gap-3">
              <PaceHeroNumber count={pace.todayCount} state={pace.state} />
              <div className="flex flex-col gap-1">
                <span
                  className={cn(
                    'rounded border px-2 py-0.5 text-xs font-mono uppercase tracking-wider',
                    stateBadge,
                  )}
                >
                  {pace.state.replace('onPace', 'on pace')}
                </span>
                <span className="font-mono text-[11px] text-zinc-600">
                  target {dailyMin}–{dailyMax}
                </span>
              </div>
            </div>
            <p
              className="mt-3 max-w-xl text-sm text-zinc-300"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {pace.statusLine}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-stretch gap-2 md:items-end">
            <Link
              to="/applications#quick-log"
              className="btn-primary rounded-md px-5 py-3 text-center text-sm font-semibold"
            >
              + Log application
              <span className="ml-2 rounded border border-lime-800/50 bg-lime-100/20 px-1 py-0.5 font-mono text-[10px] text-lime-950">
                A
              </span>
            </Link>
            <p className="font-mono text-[11px] text-zinc-600 md:text-right">
              {wr.beforeWindow
                ? `Window opens ${winStart}`
                : wr.afterWindow
                  ? `Window closed at ${winEnd}`
                  : `${wr.hours}h ${String(wr.minutes).padStart(2, '0')}m left in window`}
            </p>
          </div>
        </div>

        <div className="relative mt-7">
          <PaceBar pace={pace} dailyMin={dailyMin} dailyMax={dailyMax} />
        </div>

        {tput ? (
          <div className="relative mt-5 grid gap-px overflow-hidden rounded border border-[#232328] bg-[#232328] sm:grid-cols-4">
            <ThroughputTile
              label="Rate"
              value={`${tput.rate.toFixed(1)}/h`}
              hint={tput.windowActive ? 'Live in-window' : 'Outside window'}
            />
            <ThroughputTile
              label="Projected"
              value={`${tput.projected.toFixed(0)}`}
              hint={`At current rate by ${winEnd}`}
              valueClass={
                tput.projected >= dailyMin
                  ? 'text-lime-300'
                  : tput.projected > 0
                    ? 'text-amber-300'
                    : 'text-zinc-300'
              }
            />
            <ThroughputTile
              label="To recover"
              value={
                tput.recoveryRate > 0 ? `${tput.recoveryRate.toFixed(1)}/h` : '—'
              }
              hint={
                tput.recoveryRate > 0
                  ? `Need to hit ${dailyMin}`
                  : 'Daily min met'
              }
              valueClass={
                tput.recoveryRate > 0 ? 'text-amber-300' : 'text-lime-300'
              }
            />
            <ThroughputTile
              label="To max"
              value={
                tput.pushRate > 0 ? `${tput.pushRate.toFixed(1)}/h` : '—'
              }
              hint={
                tput.pushRate > 0 ? `Path to ${dailyMax}` : 'Max already hit'
              }
            />
          </div>
        ) : null}
      </section>

      <section className="surface-glossy rounded-xl p-4">
        <DayRibbon
          applications={applications}
          dsaProblems={dsaProblems}
          behavioralStories={stories}
          systemDesignProblems={sysdesignProblems}
          dailyMin={dailyMin}
          selectedKey={selectedKey}
          onSelect={setSelectedKey}
          today={tick}
          days={28}
        />
        <SelectedDayPanel
          selectedKey={selectedKey}
          todayKey={today}
          detail={selectedDetail}
          dailyMin={dailyMin}
          onBackToToday={() => setSelectedKey(today)}
        />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi
          label="Applications"
          primary={`${todayApps.length} / ${dailyMin}`}
          secondary={`band ${dailyMin}–${dailyMax}`}
        />
        <Kpi
          label="DSA today"
          primary={String(dsaToday)}
          secondary={`14d ${dsaSpark.reduce((s, n) => s + n, 0)}`}
          chart={
            <Sparkline
              values={dsaSpark}
              width={88}
              height={22}
              color="#06b6d4"
              fill="rgba(6,182,212,0.18)"
            />
          }
        />
        <Kpi
          label="System Design"
          primary={String(sdToday)}
          secondary={`14d ${sdSpark.reduce((s, n) => s + n, 0)}`}
          chart={
            <Sparkline
              values={sdSpark}
              width={88}
              height={22}
              color="#f59e0b"
              fill="rgba(245,158,11,0.18)"
            />
          }
        />
        <Kpi
          label="Behavioral"
          primary={`${behavioralCoverage}%`}
          secondary={
            behavioralGaps > 0
              ? `${behavioralGaps} category gaps`
              : 'all categories covered'
          }
          primaryClass={
            behavioralGaps > 0 ? 'text-amber-300' : 'text-lime-300'
          }
        />
        <Kpi
          label="Tasks"
          primary={`${tasksDone} / ${tasksTotal || 0}`}
          secondary="life lane done / total"
          primaryClass={
            tasksTotal > 0 && tasksDone === tasksTotal
              ? 'text-lime-300'
              : 'text-zinc-100'
          }
        />
      </section>

      <section className="rounded-lg border border-[#232328] bg-[#131316] p-4">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2
              className="text-xs font-medium uppercase tracking-wider text-zinc-500"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Last 30 days · application volume
            </h2>
            <p className="mt-0.5 text-[11px] text-zinc-600">
              Color encodes daily band · hover for date · today on the right
            </p>
          </div>
          <HeatLegend dailyMin={dailyMin} dailyMax={dailyMax} />
        </div>
        <HeatStrip
          cells={cells30}
          dailyMin={dailyMin}
          dailyMax={dailyMax}
        />
        <div className="mt-4 grid gap-2 sm:grid-cols-4">
          <Delta label="Today" value={trends.today} muted="apps" />
          <Delta
            label="vs yesterday"
            value={trends.deltaVsYesterday}
            muted={`y'day ${trends.yesterday}`}
            colored
          />
          <Delta
            label="vs 7d avg"
            value={trends.deltaVs7d}
            muted={`avg ${trends.avg7}`}
            colored
          />
          <Delta
            label="vs 30d avg"
            value={trends.deltaVs30d}
            muted={`avg ${trends.avg30}`}
            colored
          />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card
          title="Open tasks"
          right={
            <Link
              to="/tasks"
              className="font-mono text-[11px] text-zinc-500 hover:text-lime-300"
            >
              Tasks →
            </Link>
          }
          muted
        >
          {openTasks.length === 0 ? (
            <p className="text-sm text-zinc-600">
              Nothing open ·{' '}
              <Link to="/tasks" className="text-lime-400/90 hover:underline">
                add on Tasks
              </Link>
            </p>
          ) : (
            <ul className="-my-1 divide-y divide-[#232328]/60">
              {showTasks.map((t) => (
                <li
                  key={t.id}
                  className="flex items-start gap-3 py-2 first:pt-0"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 shrink-0 accent-lime-500"
                    checked={false}
                    onChange={(e) => {
                      if (e.target.checked) {
                        void db.tasks.update(t.id, {
                          lastCompletedAt: dayKey(tick),
                        })
                        pushToast('save', 'Task cleared')
                      }
                    }}
                    aria-label={`Done: ${t.title}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-zinc-300">
                      {t.title}
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-2 font-mono text-[10px]">
                      <span
                        className={cn(
                          'uppercase tracking-wider',
                          t.priority === 'high' && 'text-amber-400/90',
                          t.priority === 'mid' && 'text-zinc-500',
                          t.priority === 'low' && 'text-zinc-600',
                        )}
                      >
                        {t.priority}
                      </span>
                      <span className="text-zinc-600">
                        {recurrenceShort(t.recurrence)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {moreTasks > 0 ? (
            <p className="mt-3 text-xs text-zinc-600">
              +{moreTasks} more on{' '}
              <Link to="/tasks" className="text-zinc-400 hover:text-lime-300">
                Tasks
              </Link>
            </p>
          ) : null}
        </Card>

        <Card title="Pipeline">
          {applications.length === 0 ? (
            <p className="text-sm text-zinc-600">No applications yet.</p>
          ) : (
            <>
              <FunnelMini stages={funnelStages} />
              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-[#232328] pt-3 font-mono text-xs">
                <Aside
                  label="Active screens"
                  value={pipeline.OA + pipeline.Phone + pipeline.Onsite}
                />
                <Aside
                  label="Offers"
                  value={pipeline.Offer + pipeline.Accepted}
                  className="text-lime-300"
                />
                <Aside
                  label="Rejected"
                  value={pipeline.Rejected}
                  className="text-red-300"
                />
                <Aside
                  label="Ghosted"
                  value={pipeline.Ghosted}
                  className="text-zinc-500"
                />
              </div>
            </>
          )}
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card title="Source mix · today">
          <MiniBars
            items={sourceMixToday}
            emptyLabel="No applications logged today yet."
          />
        </Card>
        <Card title="Today's log">
          {todayAppsSorted.length === 0 ? (
            <p className="text-sm text-zinc-600">
              Nothing yet ·{' '}
              <Link
                to="/applications#quick-log"
                className="text-lime-400/90 hover:underline"
              >
                log your first
              </Link>
            </p>
          ) : (
            <ul className="-my-1 divide-y divide-[#232328]/60">
              {todayAppsSorted.slice(0, 8).map((a) => {
                const att = a.resumeFileId
                  ? resumeIndex.get(a.resumeFileId) ?? null
                  : null
                const expanded = previewedAppId === a.id
                return (
                  <li key={a.id} className="py-2 first:pt-0">
                    <div className="flex items-start gap-3">
                      <span className="w-12 shrink-0 font-mono text-[11px] text-zinc-500">
                        {format(new Date(a.createdAt), 'HH:mm')}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 truncate text-sm text-zinc-100">
                          <span className="truncate">{a.company}</span>
                          {att ? (
                            <span
                              className="inline-flex items-center gap-0.5 rounded border border-lime-700/40 bg-lime-500/5 px-1 py-0.5 font-mono text-[9px] uppercase tracking-wider text-lime-300"
                              title={`${att.fileName} attached`}
                            >
                              <PaperclipMini />
                              file
                            </span>
                          ) : null}
                        </div>
                        <div className="truncate font-mono text-[11px] text-zinc-500">
                          {a.role} · {a.source}
                          {a.resumeVersion ? ` · ${a.resumeVersion}` : null}
                        </div>
                      </div>
                      <span
                        className={cn(
                          'shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px]',
                          statusPillClass(a.status),
                        )}
                      >
                        {a.status}
                      </span>
                    </div>
                    {att ? (
                      <div className="mt-2 pl-[3.75rem]">
                        <ResumePreviewToolbar
                          attachment={att}
                          expanded={expanded}
                          onToggle={() =>
                            setPreviewedAppId((p) => (p === a.id ? null : a.id))
                          }
                        />
                        {expanded ? (
                          <ResumeInlinePreview
                            attachment={att}
                            height={320}
                          />
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          )}
          {todayAppsSorted.length > 8 ? (
            <p className="mt-3 text-xs text-zinc-600">
              +{todayAppsSorted.length - 8} more on{' '}
              <Link
                to="/applications"
                className="text-zinc-400 hover:text-lime-300"
              >
                Applications
              </Link>
            </p>
          ) : null}
        </Card>
      </section>

      <p className="text-center font-mono text-[11px] text-zinc-700">
        Press{' '}
        <kbd className="rounded border border-[#232328] bg-[#131316] px-1 py-0.5 text-[10px] text-zinc-500">
          ⌘K
        </kbd>{' '}
        for commands ·{' '}
        <kbd className="rounded border border-[#232328] bg-[#131316] px-1 py-0.5 text-[10px] text-zinc-500">
          A
        </kbd>{' '}
        to log application ·{' '}
        <kbd className="rounded border border-[#232328] bg-[#131316] px-1 py-0.5 text-[10px] text-zinc-500">
          g
        </kbd>{' '}
        +{' '}
        <kbd className="rounded border border-[#232328] bg-[#131316] px-1 py-0.5 text-[10px] text-zinc-500">
          t/a/d/b/k/s
        </kbd>{' '}
        to navigate
      </p>
    </div>
  )
}

function Card(props: {
  title: string
  right?: React.ReactNode
  muted?: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        props.muted
          ? 'border-[#232328]/80 bg-[#131316]/60'
          : 'border-[#232328] bg-[#131316]',
      )}
    >
      <div className="mb-3 flex items-end justify-between gap-2">
        <h2
          className="text-xs font-medium uppercase tracking-wider text-zinc-500"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {props.title}
        </h2>
        {props.right}
      </div>
      {props.children}
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
    <div className="bg-[#131316] p-3">
      <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
        {props.label}
      </div>
      <div
        className={cn(
          'mt-0.5 font-mono text-xl font-semibold tabular-nums',
          props.valueClass ?? 'text-zinc-100',
        )}
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {props.value}
      </div>
      <div className="font-mono text-[11px] text-zinc-600">{props.hint}</div>
    </div>
  )
}

function Kpi(props: {
  label: string
  primary: string
  secondary: string
  primaryClass?: string
  chart?: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-[#232328] bg-[#131316] p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
          {props.label}
        </div>
        {props.chart}
      </div>
      <div
        className={cn(
          'mt-1 font-mono text-2xl font-semibold tabular-nums',
          props.primaryClass ?? 'text-zinc-100',
        )}
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {props.primary}
      </div>
      <div className="font-mono text-[11px] text-zinc-600">
        {props.secondary}
      </div>
    </div>
  )
}

function Delta(props: {
  label: string
  value: number
  muted: string
  colored?: boolean
}) {
  const v = props.value
  const cls = props.colored
    ? v > 0
      ? 'text-lime-300'
      : v < 0
        ? 'text-amber-300'
        : 'text-zinc-300'
    : 'text-zinc-100'
  const sign = props.colored ? (v > 0 ? '+' : '') : ''
  return (
    <div className="rounded border border-[#232328]/70 bg-[#0f0f12] px-3 py-2">
      <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
        {props.label}
      </div>
      <div
        className={cn(
          'mt-0.5 font-mono text-lg font-semibold tabular-nums',
          cls,
        )}
      >
        {sign}
        {v}
      </div>
      <div className="font-mono text-[10px] text-zinc-600">{props.muted}</div>
    </div>
  )
}

function Aside(props: {
  label: string
  value: number
  className?: string
}) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-[#232328]/40 pb-1">
      <span className="text-zinc-500">{props.label}</span>
      <span className={cn('tabular-nums', props.className ?? 'text-zinc-200')}>
        {props.value}
      </span>
    </div>
  )
}

function PaperclipMini() {
  return (
    <svg
      width="9"
      height="9"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 17.99 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.49" />
    </svg>
  )
}

function SelectedDayPanel(props: {
  selectedKey: string
  todayKey: string
  detail: { apps: number; dsa: number; beh: number; sd: number }
  dailyMin: number
  onBackToToday: () => void
}) {
  const isToday = props.selectedKey === props.todayKey
  const d = new Date(props.selectedKey + 'T12:00:00')
  const label = format(d, 'EEE MMM d')
  const apps = props.detail.apps
  const appsClass =
    apps >= props.dailyMin
      ? 'text-lime-300'
      : apps > 0
        ? 'text-amber-300'
        : 'text-zinc-500'
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[#232328] pt-3 font-mono text-xs">
      <span className="text-zinc-500">
        Selected ·{' '}
        <span className={isToday ? 'text-lime-300' : 'text-zinc-200'}>
          {isToday ? `${label} · TODAY` : label}
        </span>
      </span>
      <span className="text-zinc-600">|</span>
      <span>
        <span className="text-zinc-500">Apps </span>
        <span className={cn('tabular-nums', appsClass)}>{apps}</span>
        <span className="text-zinc-600">/{props.dailyMin}</span>
      </span>
      <span>
        <span className="text-zinc-500">DSA </span>
        <span
          className={cn(
            'tabular-nums',
            props.detail.dsa > 0 ? 'text-cyan-300' : 'text-zinc-500',
          )}
        >
          {props.detail.dsa}
        </span>
      </span>
      <span>
        <span className="text-zinc-500">Beh </span>
        <span
          className={cn(
            'tabular-nums',
            props.detail.beh > 0 ? 'text-violet-300' : 'text-zinc-500',
          )}
        >
          {props.detail.beh}
        </span>
      </span>
      <span>
        <span className="text-zinc-500">SysD </span>
        <span
          className={cn(
            'tabular-nums',
            props.detail.sd > 0 ? 'text-amber-300' : 'text-zinc-500',
          )}
        >
          {props.detail.sd}
        </span>
      </span>
      {!isToday ? (
        <button
          type="button"
          onClick={props.onBackToToday}
          className="ml-auto rounded border border-[#232328] px-2 py-0.5 text-zinc-300 hover:border-lime-500/40 hover:text-lime-300"
        >
          ↩ Today
        </button>
      ) : null}
    </div>
  )
}
