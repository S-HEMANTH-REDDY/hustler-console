import { format } from 'date-fns'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  useApplicationsHybrid,
  useBehavioralStoriesHybrid,
  useDsaProblemsHybrid,
  useResumeFilesHybrid,
  useSettingsRowHybrid,
  useSystemDesignHybrid,
  useTasksHybrid,
} from '../cloud/hybridData'
import type { ApplicationSource, ResumeAttachment } from '../db/types'
import {
  FunnelMini,
  HeatLegend,
  HeatStrip,
  MiniBars,
  Sparkline,
} from '../components/charts'
import { BirthdayCountdown } from '../components/BirthdayCountdown'
import { DayRibbon } from '../components/DayRibbon'
import { PaceBar, PaceHeroNumber } from '../components/PaceVisual'
import {
  ResumeInlinePreview,
  ResumePreviewToolbar,
} from '../components/ResumePreview'
import { TodayTasksCard } from '../components/TodayTasksCard'
import { useIntervalTick, useSecondsTick } from '../hooks/useIntervalTick'
import { useAuthStore } from '../store/authStore'
import { BEHAVIORAL_CATEGORIES, statusPillClass } from '../lib/constants'
import { dayKey, isRecurrenceComplete, isoWeekNumber } from '../lib/dates'
import {
  hoursMinutesRemaining,
  lastNDailyCounts,
  mixBy,
  pipelineCounts,
  throughput,
  trendStats,
} from '../lib/insights'
import { computePace, sweetSpot } from '../lib/pace'
import { cn } from '../lib/utils'

const SOURCE_COLORS: Record<ApplicationSource, string> = {
  LinkedIn: '#06b6d4',
  Company: '#84cc16',
  Referral: '#a78bfa',
  Handshake: '#f59e0b',
  Otta: '#ec4899',
  Wellfound: '#22d3ee',
  Other: '#71717a',
}

function getGreeting(hour: number): string {
  if (hour < 5) return 'Good night'
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  if (hour < 21) return 'Good evening'
  return 'Good night'
}

function getFirstName(email: string | null | undefined): string | null {
  if (!email) return null
  const local = email.split('@')[0]
  if (!local) return null
  const name = local.replace(/[._-]/g, ' ').split(' ')[0]
  if (!name || name.length < 2) return null
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()
}

export function TodayPage() {
  const tick = useIntervalTick(60_000)
  const secondTick = useSecondsTick()
  const settings = useSettingsRowHybrid()
  const applications = useApplicationsHybrid()
  const dsaProblems = useDsaProblemsHybrid()
  const sysdesignProblems = useSystemDesignHybrid()
  const stories = useBehavioralStoriesHybrid()
  const tasks = useTasksHybrid()
  const resumeRows = useResumeFilesHybrid()
  const user = useAuthStore((s) => s.user)
  const resumeIndex = useMemo(() => {
    const m = new Map<string, ResumeAttachment>()
    for (const r of resumeRows) m.set(r.id, r)
    return m
  }, [resumeRows])
  const today = dayKey(tick)
  const [selectedKey, setSelectedKey] = useState<string>(today)
  const [previewedAppId, setPreviewedAppId] = useState<string | null>(null)
  const todayApps = useMemo(
    () => applications.filter((a) => a.date === today),
    [applications, today],
  )

  const dailyMin = settings?.dailyMin ?? 25
  const dailyMax = settings?.dailyMax ?? 50
  const sweet = sweetSpot(dailyMin, dailyMax)
  const winStart = settings?.windowStart ?? '00:00'
  const winEnd = settings?.windowEnd ?? '23:59'

  const pace = useMemo(() => {
    if (!settings) {
      return computePace(tick, todayApps.length, {
        id: 'default',
        dailyMin: 25,
        dailyMax: 50,
        windowStart: '00:00',
        windowEnd: '23:59',
        updatedAt: 0,
      })
    }
    return computePace(tick, todayApps.length, settings)
  }, [settings, tick, todayApps.length])

  const firstAppMs = useMemo(() => {
    if (todayApps.length === 0) return null
    return todayApps.reduce(
      (min, a) => (a.createdAt < min ? a.createdAt : min),
      todayApps[0].createdAt,
    )
  }, [todayApps])

  const tput = useMemo(() => {
    if (!settings) return null
    return throughput(tick, todayApps.length, settings, firstAppMs)
  }, [settings, tick, todayApps.length, firstAppMs])

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
      ? 'border-zinc-700 text-zinc-500 bg-zinc-500/5'
      : pace.state === 'onPace'
        ? 'border-lime-500/40 text-lime-400 bg-lime-500/5'
        : pace.state === 'behind'
          ? 'border-amber-500/40 text-amber-300 bg-amber-500/5'
          : 'border-red-500/40 text-red-400 bg-red-500/5'

  const greeting = getGreeting(secondTick.getHours())
  const firstName = getFirstName(user?.email)

  return (
    <div className="mx-auto max-w-6xl space-y-5 animate-fade-in">
      {/* ─── Hero: Greeting + Application Pace ─── */}
      <section className="hero-section p-6 sm:p-8">
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            {/* Personalized greeting */}
            <h2
              className="text-2xl font-semibold tracking-tight text-zinc-300 sm:text-3xl"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {greeting}{firstName ? `, ${firstName}` : ''}
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              {format(secondTick, 'EEEE, MMMM d')} · W{isoWeekNumber(secondTick)} ·{' '}
              {dailyMin}–{dailyMax} app goal · sweet spot {sweet.min}–{sweet.max}
            </p>

            {/* Hero pace number */}
            <div className="mt-6 flex flex-wrap items-end gap-4">
              <PaceHeroNumber count={pace.todayCount} state={pace.state} />
              <div className="mb-2 flex flex-col gap-1.5">
                <span
                  className="font-mono text-3xl font-semibold tabular-nums text-zinc-600"
                  title="Daily minimum"
                >
                  / {dailyMin}
                </span>
                <span
                  className={cn(
                    'w-fit rounded-lg border px-2.5 py-1 text-center font-mono text-[0.625rem] font-semibold uppercase tracking-wider',
                    stateBadge,
                  )}
                >
                  {pace.state.replace('onPace', 'on pace')}
                </span>
              </div>
            </div>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-400">
              {pace.statusLine}
            </p>
          </div>

          {/* Right: Time + CTA */}
          <div className="flex shrink-0 flex-col items-stretch gap-3 lg:items-end">
            <div
              className="flex flex-col items-end gap-1 rounded-2xl border border-edge bg-well/50 px-5 py-3 lg:min-w-[14rem]"
            >
              <span className="section-label">Local time</span>
              <span
                className="mt-1 font-mono text-3xl font-semibold tabular-nums tracking-tight text-zinc-50"
                aria-live="off"
                style={{ textShadow: '0 0 20px rgba(255,255,255,0.05)' }}
              >
                {format(secondTick, 'HH:mm:ss')}
              </span>
              <span className="font-mono text-xs text-zinc-500">
                {format(secondTick, 'EEE, MMM d')} · W
                {isoWeekNumber(secondTick)}
              </span>
            </div>
            <Link
              to="/applications#quick-log"
              className="btn-primary rounded-xl px-5 py-3 text-center text-sm"
            >
              + Log application
              <span className="ml-2 rounded-md border border-lime-900/30 bg-black/10 px-1.5 py-0.5 font-mono text-[0.625rem] text-lime-950">
                A
              </span>
            </Link>
            <p className="text-xs text-zinc-500 lg:text-right">
              {wr.beforeWindow
                ? `Day opens ${winStart}`
                : wr.afterWindow
                  ? `Day ended at ${winEnd}`
                  : `${wr.hours}h ${String(wr.minutes).padStart(2, '0')}m left until 11:59 PM`}
            </p>
          </div>
        </div>

        {/* Pace bar */}
        <div className="relative mt-8">
          <PaceBar pace={pace} dailyMin={dailyMin} dailyMax={dailyMax} />
        </div>

        {/* Throughput metrics */}
        {tput ? (
          <>
            <p className="section-label mt-6">How you're tracking</p>
            <div className="relative mt-2.5 grid gap-px overflow-hidden rounded-2xl border border-edge bg-edge sm:grid-cols-2 lg:grid-cols-4">
              <ThroughputTile
                label="Logged today"
                value={`${pace.todayCount} apps`}
                hint={
                  tput.measuring && tput.activeSinceMs
                    ? `${tput.rate.toFixed(1)}/hr since ${formatHm(tput.activeSinceMs)}`
                    : pace.todayCount === 1 && tput.activeSinceMs
                      ? `started ${formatHm(tput.activeSinceMs)}`
                      : 'log first to start the clock'
                }
              />
              <ThroughputTile
                label="Forecast by EOD"
                value={tput.measuring ? `${tput.projected.toFixed(0)} apps` : '—'}
                hint={
                  tput.measuring
                    ? tput.projected >= dailyMin
                      ? `On track for ${dailyMin}–${dailyMax}`
                      : `Below ${dailyMin} at this pace`
                    : 'Need 2+ to project'
                }
                valueClass={
                  !tput.measuring
                    ? 'text-zinc-400'
                    : tput.projected >= dailyMin
                      ? 'text-lime-400'
                      : 'text-amber-300'
                }
              />
              <ThroughputTile
                label={`To hit min (${dailyMin})`}
                value={
                  tput.recoveryRate > 0
                    ? `+${Math.max(0, dailyMin - pace.todayCount)} apps`
                    : 'Done'
                }
                hint={
                  tput.recoveryRate > 0
                    ? `≈ ${tput.recoveryRate.toFixed(1)}/hr for ${tput.hoursRemaining.toFixed(1)}h`
                    : `Stretch toward ${dailyMax}`
                }
                valueClass={
                  tput.recoveryRate > 0 ? 'text-amber-300' : 'text-lime-400'
                }
              />
              <ThroughputTile
                label={`To hit max (${dailyMax})`}
                value={
                  tput.pushRate > 0
                    ? `+${Math.max(0, dailyMax - pace.todayCount)} apps`
                    : 'Max hit'
                }
                hint={
                  tput.pushRate > 0
                    ? `≈ ${tput.pushRate.toFixed(1)}/hr to top out`
                    : 'Quality > volume'
                }
              />
            </div>
          </>
        ) : null}
      </section>

      {/* ─── Day Ribbon ─── */}
      <section className="card p-5">
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

      {/* ─── KPI Bento Grid ─── */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Applications"
          primary={`${todayApps.length} / ${dailyMin}`}
          secondary={`band ${dailyMin}–${dailyMax}`}
          accent="linear-gradient(90deg, #84cc16, #a3e635)"
        />
        <StatCard
          label="DSA today"
          primary={String(dsaToday)}
          secondary={`14d: ${dsaSpark.reduce((s, n) => s + n, 0)}`}
          chart={<Sparkline values={dsaSpark} width={90} height={24} color="#06b6d4" fill="rgba(6,182,212,0.12)" />}
          accent="linear-gradient(90deg, #06b6d4, #22d3ee)"
        />
        <StatCard
          label="System Design"
          primary={String(sdToday)}
          secondary={`14d: ${sdSpark.reduce((s, n) => s + n, 0)}`}
          chart={<Sparkline values={sdSpark} width={90} height={24} color="#f59e0b" fill="rgba(245,158,11,0.12)" />}
          accent="linear-gradient(90deg, #f59e0b, #fbbf24)"
        />
        <StatCard
          label="Behavioral"
          primary={`${behavioralCoverage}%`}
          secondary={behavioralGaps > 0 ? `${behavioralGaps} gaps` : 'all covered'}
          primaryClass={behavioralGaps > 0 ? 'text-amber-300' : 'text-lime-400'}
          accent="linear-gradient(90deg, #a78bfa, #c4b5fd)"
        />
        <StatCard
          label="Tasks"
          primary={`${tasksDone} / ${tasksTotal || 0}`}
          secondary="done / total"
          primaryClass={tasksTotal > 0 && tasksDone === tasksTotal ? 'text-lime-400' : 'text-zinc-100'}
          accent="linear-gradient(90deg, #10b981, #34d399)"
        />
      </section>

      {/* ─── Heatmap + Birthday ─── */}
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="section-label">30-day volume</h2>
              <p className="mt-1 text-xs text-zinc-500">
                Each square = 1 day · color = {dailyMin}–{dailyMax} goal
              </p>
            </div>
            <HeatLegend dailyMin={dailyMin} dailyMax={dailyMax} />
          </div>
          <HeatStrip cells={cells30} dailyMin={dailyMin} dailyMax={dailyMax} />
          <div className="mt-4 grid gap-2 sm:grid-cols-4">
            <Delta label="Today" value={trends.today} muted="apps" />
            <Delta label="vs yesterday" value={trends.deltaVsYesterday} muted={`y'day ${trends.yesterday}`} colored />
            <Delta label="vs 7d avg" value={trends.deltaVs7d} muted={`avg ${trends.avg7}`} colored />
            <Delta label="vs 30d avg" value={trends.deltaVs30d} muted={`avg ${trends.avg30}`} colored />
          </div>
        </div>
        <BirthdayCountdown />
      </section>

      {/* ─── Tasks + Pipeline ─── */}
      <section className="grid gap-4 lg:grid-cols-2">
        <TodayTasksCard />

        <Card title="Pipeline">
          {applications.length === 0 ? (
            <p className="text-sm text-zinc-500">No applications yet.</p>
          ) : (
            <>
              <FunnelMini stages={funnelStages} />
              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-edge pt-4 font-mono text-xs">
                <Aside label="Active screens" value={pipeline.OA + pipeline.Phone + pipeline.Onsite} />
                <Aside label="Offers" value={pipeline.Offer + pipeline.Accepted} className="text-lime-400" />
                <Aside label="Rejected" value={pipeline.Rejected} className="text-red-400" />
                <Aside label="Ghosted" value={pipeline.Ghosted} className="text-zinc-500" />
              </div>
            </>
          )}
        </Card>
      </section>

      {/* ─── Source Mix + Today's Log ─── */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card title="Source mix · today">
          <MiniBars items={sourceMixToday} emptyLabel="No applications logged today yet." />
        </Card>
        <Card title="Today's log">
          {todayAppsSorted.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Nothing yet ·{' '}
              <Link to="/applications#quick-log" className="text-lime-400/80 hover:underline">
                log your first application
              </Link>
            </p>
          ) : (
            <ul className="-my-1 divide-y divide-edge/40">
              {todayAppsSorted.slice(0, 8).map((a) => {
                const att = a.resumeFileId ? resumeIndex.get(a.resumeFileId) ?? null : null
                const expanded = previewedAppId === a.id
                return (
                  <li key={a.id} className="py-2.5 first:pt-0 transition-colors hover:bg-surface-2/50 -mx-1 px-1 rounded-lg">
                    <div className="flex items-start gap-3">
                      <span className="w-10 shrink-0 font-mono text-xs text-zinc-500">
                        {format(new Date(a.createdAt), 'HH:mm')}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 truncate text-sm text-zinc-200">
                          <span className="truncate">{a.company}</span>
                          {att ? (
                            <span className="inline-flex items-center gap-0.5 rounded-md border border-lime-700/30 bg-lime-500/5 px-1 py-0.5 font-mono text-[8px] uppercase tracking-wider text-lime-400" title={`${att.fileName} attached`}>
                              <PaperclipMini />
                              file
                            </span>
                          ) : null}
                        </div>
                        <div className="truncate font-mono text-xs text-zinc-500">
                          {a.role} · {a.source}
                          {a.resumeVersion ? ` · ${a.resumeVersion}` : null}
                        </div>
                      </div>
                      <span className={cn('shrink-0 rounded-lg border px-2 py-0.5 font-mono text-xs', statusPillClass(a.status))}>
                        {a.status}
                      </span>
                    </div>
                    {att ? (
                      <div className="mt-1.5 pl-[3.25rem]">
                        <ResumePreviewToolbar
                          attachment={att}
                          expanded={expanded}
                          onToggle={() => setPreviewedAppId((p) => (p === a.id ? null : a.id))}
                        />
                        {expanded ? <ResumeInlinePreview attachment={att} height={320} /> : null}
                      </div>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          )}
          {todayAppsSorted.length > 8 ? (
            <p className="mt-3 text-xs text-zinc-500">
              +{todayAppsSorted.length - 8} more on{' '}
              <Link to="/applications" className="text-zinc-400 hover:text-lime-400 transition-colors">Applications</Link>
            </p>
          ) : null}
        </Card>
      </section>

      {/* ─── Footer hints ─── */}
      <p className="text-center font-mono text-[0.625rem] text-zinc-700">
        <kbd className="rounded-md border border-edge bg-surface px-1.5 py-0.5 text-zinc-500">⌘K</kbd>
        {' '}commands ·{' '}
        <kbd className="rounded-md border border-edge bg-surface px-1.5 py-0.5 text-zinc-500">A</kbd>
        {' '}log apps ·{' '}
        <kbd className="rounded-md border border-edge bg-surface px-1.5 py-0.5 text-zinc-500">g</kbd>
        {' '}+{' '}
        <kbd className="rounded-md border border-edge bg-surface px-1.5 py-0.5 text-zinc-500">t/a/d/b/k/s</kbd>
        {' '}navigate
      </p>
    </div>
  )
}

function Card(props: {
  title: string
  right?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="card p-5">
      <div className="mb-4 flex items-end justify-between gap-2">
        <h2 className="section-label">{props.title}</h2>
        {props.right}
      </div>
      {props.children}
    </div>
  )
}

function StatCard(props: {
  label: string
  primary: string
  secondary: string
  primaryClass?: string
  chart?: React.ReactNode
  accent?: string
}) {
  return (
    <div className="stat-card p-5" style={{ '--stat-accent': props.accent } as React.CSSProperties}>
      <div className="flex items-start justify-between gap-2">
        <div className="section-label">{props.label}</div>
        {props.chart}
      </div>
      <div className={cn('mt-2 font-mono text-3xl font-bold tabular-nums tracking-tight', props.primaryClass ?? 'text-zinc-100')}>
        {props.primary}
      </div>
      <div className="mt-1 text-xs text-zinc-500">{props.secondary}</div>
    </div>
  )
}

function formatHm(ms: number): string {
  return format(new Date(ms), 'HH:mm')
}

function ThroughputTile(props: {
  label: string
  value: string
  hint: string
  valueClass?: string
}) {
  return (
    <div className="bg-surface p-4">
      <div className="section-label">{props.label}</div>
      <div className={cn('mt-1.5 font-mono text-xl font-bold tabular-nums tracking-tight', props.valueClass ?? 'text-zinc-100')}>
        {props.value}
      </div>
      <div className="mt-1 text-xs leading-snug text-zinc-500">{props.hint}</div>
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
    ? v > 0 ? 'text-lime-400' : v < 0 ? 'text-amber-300' : 'text-zinc-300'
    : 'text-zinc-100'
  const sign = props.colored ? (v > 0 ? '+' : '') : ''
  return (
    <div className="rounded-xl border border-edge bg-well/50 px-3.5 py-3">
      <div className="section-label">{props.label}</div>
      <div className={cn('mt-1 font-mono text-xl font-bold tabular-nums', cls)}>
        {sign}{v}
      </div>
      <div className="mt-0.5 text-xs text-zinc-500">{props.muted}</div>
    </div>
  )
}

function Aside(props: { label: string; value: number; className?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-edge/30 pb-1.5">
      <span className="text-zinc-500">{props.label}</span>
      <span className={cn('tabular-nums', props.className ?? 'text-zinc-300')}>{props.value}</span>
    </div>
  )
}

function PaperclipMini() {
  return (
    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
  const appsClass = apps >= props.dailyMin ? 'text-lime-400' : apps > 0 ? 'text-amber-300' : 'text-zinc-500'
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-edge pt-4 font-mono text-xs">
      <span className="text-zinc-500">
        Selected ·{' '}
        <span className={isToday ? 'text-lime-400' : 'text-zinc-300'}>
          {isToday ? `${label} · TODAY` : label}
        </span>
      </span>
      <span className="text-zinc-600">|</span>
      <span>
        <span className="text-zinc-500">Apps </span>
        <span className={cn('tabular-nums', appsClass)}>{apps}</span>
        <span className="text-zinc-500">/{props.dailyMin}</span>
      </span>
      <span>
        <span className="text-zinc-500">DSA </span>
        <span className={cn('tabular-nums', props.detail.dsa > 0 ? 'text-cyan-300' : 'text-zinc-500')}>{props.detail.dsa}</span>
      </span>
      <span>
        <span className="text-zinc-500">Beh </span>
        <span className={cn('tabular-nums', props.detail.beh > 0 ? 'text-violet-300' : 'text-zinc-500')}>{props.detail.beh}</span>
      </span>
      <span>
        <span className="text-zinc-500">SysD </span>
        <span className={cn('tabular-nums', props.detail.sd > 0 ? 'text-amber-300' : 'text-zinc-500')}>{props.detail.sd}</span>
      </span>
      {!isToday ? (
        <button
          type="button"
          onClick={props.onBackToToday}
          className="ml-auto rounded-lg border border-edge px-2.5 py-1 text-zinc-400 transition-colors hover:border-lime-500/40 hover:text-lime-400"
        >
          ↩ Today
        </button>
      ) : null}
    </div>
  )
}
