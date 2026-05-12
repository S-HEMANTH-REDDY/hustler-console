import { addDays, format, startOfDay } from 'date-fns'
import { useEffect, useMemo, useRef } from 'react'
import type {
  Application,
  BehavioralStory,
  DsaProblem,
  SystemDesignProblem,
} from '../db/types'
import { cn } from '../lib/utils'

export interface DayCell {
  key: string
  dow: string
  dayNum: string
  monthAbbr: string
  apps: number
  dsa: number
  beh: number
  sd: number
  isToday: boolean
  isMonthStart: boolean
  isWeekend: boolean
}

export type TrackKind = 'apps' | 'dsa' | 'beh' | 'sd'

export interface TrackDef {
  kind: TrackKind
  letter: string
  label: string
  color: string
}

export const TRACKS: TrackDef[] = [
  { kind: 'apps', letter: 'A', label: 'Applications', color: '#84cc16' },
  { kind: 'dsa', letter: 'D', label: 'DSA', color: '#06b6d4' },
  { kind: 'beh', letter: 'B', label: 'Behavioral', color: '#a78bfa' },
  { kind: 'sd', letter: 'S', label: 'System Design', color: '#f59e0b' },
]

export function buildDayCells(args: {
  applications: Application[]
  dsaProblems: DsaProblem[]
  behavioralStories: BehavioralStory[]
  systemDesignProblems: SystemDesignProblem[]
  today: Date
  days: number
}): DayCell[] {
  const appsByDay = new Map<string, number>()
  for (const a of args.applications) {
    appsByDay.set(a.date, (appsByDay.get(a.date) ?? 0) + 1)
  }
  const dsaByDay = new Map<string, number>()
  for (const p of args.dsaProblems) {
    dsaByDay.set(p.date, (dsaByDay.get(p.date) ?? 0) + 1)
  }
  const sdByDay = new Map<string, number>()
  for (const p of args.systemDesignProblems) {
    sdByDay.set(p.date, (sdByDay.get(p.date) ?? 0) + 1)
  }
  const behByDay = new Map<string, number>()
  for (const s of args.behavioralStories) {
    const k = format(new Date(s.updatedAt), 'yyyy-MM-dd')
    behByDay.set(k, (behByDay.get(k) ?? 0) + 1)
  }

  const t0 = startOfDay(args.today)
  const out: DayCell[] = []
  for (let i = args.days - 1; i >= 0; i--) {
    const d = addDays(t0, -i)
    const key = format(d, 'yyyy-MM-dd')
    const dayNum = format(d, 'd')
    const dow = format(d, 'EEEEE') // single letter day-of-week
    out.push({
      key,
      dow,
      dayNum,
      monthAbbr: format(d, 'MMM'),
      apps: appsByDay.get(key) ?? 0,
      dsa: dsaByDay.get(key) ?? 0,
      beh: behByDay.get(key) ?? 0,
      sd: sdByDay.get(key) ?? 0,
      isToday: i === 0,
      isMonthStart: dayNum === '1',
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
    })
  }
  return out
}

export function DayRibbon(props: {
  applications: Application[]
  dsaProblems: DsaProblem[]
  behavioralStories: BehavioralStory[]
  systemDesignProblems: SystemDesignProblem[]
  dailyMin: number
  selectedKey: string
  onSelect: (key: string) => void
  today: Date
  days?: number
}) {
  const days = props.days ?? 28
  const cells = useMemo(
    () =>
      buildDayCells({
        applications: props.applications,
        dsaProblems: props.dsaProblems,
        behavioralStories: props.behavioralStories,
        systemDesignProblems: props.systemDesignProblems,
        today: props.today,
        days,
      }),
    [
      props.applications,
      props.dsaProblems,
      props.behavioralStories,
      props.systemDesignProblems,
      props.today,
      days,
    ],
  )

  const scrollRef = useRef<HTMLDivElement>(null)
  const todayBtnRef = useRef<HTMLButtonElement>(null)
  const todayKey = format(startOfDay(props.today), 'yyyy-MM-dd')

  // Anchor today on the right edge on mount and on midnight rollover.
  useEffect(() => {
    const c = scrollRef.current
    if (!c) return
    requestAnimationFrame(() => {
      c.scrollTo({ left: c.scrollWidth, behavior: 'auto' })
    })
  }, [todayKey, days])

  function scrollToToday() {
    const c = scrollRef.current
    if (!c) return
    c.scrollTo({ left: c.scrollWidth, behavior: 'smooth' })
    props.onSelect(todayKey)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          className="text-xs font-medium uppercase tracking-wider text-zinc-500"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          Last {days} days · scroll left for older · today on right
        </h2>
        <div className="flex items-center gap-2">
          <Legend />
          <button
            type="button"
            onClick={scrollToToday}
            className="rounded border border-[#232328] px-2 py-0.5 font-mono text-[10px] text-zinc-400 hover:border-lime-500/40 hover:text-lime-300"
            title="Jump to today"
          >
            Today →
          </button>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="-mb-1 overflow-x-auto pb-1"
        style={{ scrollbarGutter: 'stable' }}
      >
        <div className="flex min-w-max gap-1.5">
          {cells.map((d) => {
            const selected = d.key === props.selectedKey
            const appsState =
              d.apps >= props.dailyMin
                ? 'done'
                : d.apps > 0
                  ? 'partial'
                  : 'none'
            return (
              <button
                key={d.key}
                ref={d.isToday ? todayBtnRef : undefined}
                type="button"
                onClick={() => props.onSelect(d.key)}
                aria-pressed={selected}
                title={`${d.key} · ${d.apps} apps · ${d.dsa} dsa · ${d.beh} beh · ${d.sd} sd`}
                className={cn(
                  'group flex w-[58px] shrink-0 flex-col items-stretch rounded-md border p-1.5 text-center transition-colors',
                  selected
                    ? 'border-lime-500/70 bg-lime-500/10'
                    : d.isToday
                      ? 'border-zinc-700 bg-[#15151a]'
                      : 'border-[#232328] bg-[#131316] hover:border-zinc-700',
                )}
              >
                <div
                  className={cn(
                    'font-mono text-[9px] uppercase tracking-wider',
                    d.isWeekend ? 'text-zinc-600' : 'text-zinc-500',
                  )}
                >
                  {d.dow}
                </div>
                <div className="flex items-baseline justify-center gap-1">
                  <span
                    className={cn(
                      'font-mono text-lg font-semibold tabular-nums',
                      d.isToday ? 'text-lime-300' : 'text-zinc-100',
                    )}
                  >
                    {d.dayNum}
                  </span>
                  {d.isMonthStart ? (
                    <span className="font-mono text-[9px] text-zinc-500">
                      {d.monthAbbr}
                    </span>
                  ) : null}
                </div>
                <div className="mt-1 flex justify-center gap-0.5">
                  <TrackTick
                    letter="A"
                    state={appsState}
                    color="#84cc16"
                  />
                  <TrackTick
                    letter="D"
                    state={d.dsa > 0 ? 'done' : 'none'}
                    color="#06b6d4"
                  />
                  <TrackTick
                    letter="B"
                    state={d.beh > 0 ? 'done' : 'none'}
                    color="#a78bfa"
                  />
                  <TrackTick
                    letter="S"
                    state={d.sd > 0 ? 'done' : 'none'}
                    color="#f59e0b"
                  />
                </div>
                <div
                  className={cn(
                    'mt-1 font-mono text-[9px]',
                    d.isToday ? 'text-lime-400' : 'text-transparent',
                  )}
                >
                  TODAY
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function TrackTick(props: {
  letter: string
  state: 'done' | 'partial' | 'none'
  color: string
}) {
  if (props.state === 'done') {
    return (
      <span
        className="flex h-3.5 w-3.5 items-center justify-center rounded-sm font-mono text-[8px] font-bold text-zinc-950"
        style={{ backgroundColor: props.color }}
      >
        {props.letter}
      </span>
    )
  }
  if (props.state === 'partial') {
    return (
      <span
        className="flex h-3.5 w-3.5 items-center justify-center rounded-sm border font-mono text-[8px] font-bold"
        style={{
          borderColor: props.color,
          color: props.color,
          backgroundColor: 'rgba(0,0,0,0.2)',
        }}
      >
        {props.letter}
      </span>
    )
  }
  return (
    <span className="flex h-3.5 w-3.5 items-center justify-center rounded-sm border border-[#2a2a30] font-mono text-[8px] text-zinc-700">
      {props.letter}
    </span>
  )
}

function Legend() {
  return (
    <div className="hidden items-center gap-2 font-mono text-[10px] text-zinc-500 sm:flex">
      {TRACKS.map((t) => (
        <span key={t.kind} className="inline-flex items-center gap-1">
          <span
            className="inline-flex h-3 w-3 items-center justify-center rounded-sm font-bold text-zinc-950"
            style={{ backgroundColor: t.color, fontSize: 8 }}
          >
            {t.letter}
          </span>
          <span>{t.label}</span>
        </span>
      ))}
    </div>
  )
}
