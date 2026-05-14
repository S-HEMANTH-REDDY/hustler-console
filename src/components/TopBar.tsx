import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { db, ensureDefaults } from '../db/database'
import type { Application } from '../db/types'
import { useIntervalTick, useSecondsTick } from '../hooks/useIntervalTick'
import {
  computeApplicationStreak,
  isoWeekNumber,
  rollingAvgLastNDays,
  weeksToGraduation,
} from '../lib/dates'
import {
  backupAgeDays,
  hoursMinutesRemaining,
  trendStats,
} from '../lib/insights'
import { cn } from '../lib/utils'
import { useUiStore } from '../store/uiStore'
import { MobileHeaderToggle } from './Sidebar'

const EMPTY_APPS: Application[] = []

export function TopBar() {
  const tick = useIntervalTick(60_000)
  const secondTick = useSecondsTick()
  const settings = useLiveQuery(() => ensureDefaults(), [])
  const rawApps = useLiveQuery(() => db.applications.toArray(), [])
  const applications = rawApps ?? EMPTY_APPS
  const setPaletteOpen = useUiStore((s) => s.setPaletteOpen)

  const dateStr = format(tick, 'EEE MMM d')
  const yearStr = format(tick, 'yyyy')
  const week = isoWeekNumber(tick)
  const grad = weeksToGraduation(tick)
  const clock = format(secondTick, 'HH:mm:ss')

  const dailyMin = settings?.dailyMin ?? 30
  const streak = computeApplicationStreak(applications, dailyMin, tick)
  const avg7 = rollingAvgLastNDays(applications, 7, tick)
  const trends = trendStats(applications, tick)
  const bAge = backupAgeDays()
  const backupStale = bAge !== null && bAge >= 7
  const noBackup = bAge === null

  const winStart = settings?.windowStart ?? '00:00'
  const winEnd = settings?.windowEnd ?? '23:59'
  const wr = hoursMinutesRemaining(tick, winEnd, winStart)
  const fullDay = winStart === '00:00' && winEnd === '23:59'
  const remainingLabel = wr.beforeWindow
    ? `Pre-window · opens ${winStart}`
    : wr.afterWindow
      ? `Day done · ${winStart}–${winEnd}`
      : fullDay
        ? `${wr.hours}h ${String(wr.minutes).padStart(2, '0')}m left today`
        : `${wr.hours}h ${String(wr.minutes).padStart(2, '0')}m left`

  return (
    <header className="frost sticky top-0 z-20 border-b border-[#3d4150] shadow-[0_1px_0_0_rgba(255,255,255,0.02),0_10px_30px_-20px_rgba(0,0,0,0.9)]">
      <div className="flex min-h-14 flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2">
        <div className="flex items-center gap-3">
          <MobileHeaderToggle />
          <div>
            <div
              className="flex items-baseline gap-2 text-sm font-semibold tracking-tight text-zinc-50 tabular-nums"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              <span>{dateStr}</span>
              <span className="text-zinc-400">{yearStr}</span>
              <span className="rounded border border-[#3d4150] px-1.5 py-0.5 font-mono text-xs text-zinc-400">
                {clock}
              </span>
            </div>
            <div className="font-mono text-xs text-zinc-400">
              W{week} · {grad.label} · {remainingLabel}
            </div>
          </div>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-3 text-xs sm:text-sm">
          <Stat
            label="Streak"
            value={`${streak}d`}
            valueClass={streak > 0 ? 'text-lime-300' : 'text-zinc-400'}
          />
          <Stat label="Today" value={String(trends.today)} />
          <Stat
            label="Δ y'day"
            value={fmtDelta(trends.deltaVsYesterday)}
            valueClass={deltaClass(trends.deltaVsYesterday)}
          />
          <Stat label="7d avg" value={String(avg7)} />
          <Stat label="30d avg" value={String(trends.avg30)} />

          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="hidden items-center gap-2 rounded border border-[#3d4150] bg-[#262934] px-2.5 py-1.5 text-xs text-zinc-400 hover:border-zinc-700 hover:text-zinc-200 sm:flex"
            aria-label="Open command palette"
          >
            <span>Commands</span>
            <kbd className="rounded border border-[#4a4e5b] bg-[#1c1f27] px-1.5 py-0.5 font-mono text-xs text-zinc-400">
              ⌘K
            </kbd>
          </button>
        </div>
      </div>
      {(backupStale || noBackup) && (
        <div className="flex items-center justify-between gap-3 border-t border-[#3d4150] bg-amber-950/20 px-4 py-1.5 font-mono text-xs text-amber-200/90">
          <span>
            {noBackup
              ? 'No backup recorded · export soon to keep your data safe.'
              : `Backup is ${bAge} days old · consider exporting.`}
          </span>
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="rounded border border-amber-700/60 px-2 py-0.5 text-amber-100 hover:bg-amber-900/30"
          >
            Backup now
          </button>
        </div>
      )}
    </header>
  )
}

function Stat(props: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="text-right">
      <div className="font-mono text-xs uppercase tracking-wider text-zinc-400">
        {props.label}
      </div>
      <div
        className={cn(
          'font-mono text-base font-semibold tabular-nums',
          props.valueClass ?? 'text-zinc-100',
        )}
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {props.value}
      </div>
    </div>
  )
}

function fmtDelta(n: number): string {
  if (n > 0) return `+${n}`
  if (n < 0) return String(n)
  return '0'
}

function deltaClass(n: number): string {
  if (n > 0) return 'text-lime-300'
  if (n < 0) return 'text-amber-300'
  return 'text-zinc-400'
}
