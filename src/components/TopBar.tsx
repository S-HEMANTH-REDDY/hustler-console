import { format } from 'date-fns'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApplicationsHybrid, useSettingsRowHybrid } from '../cloud/hybridData'
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
import { useAuthStore } from '../store/authStore'
import { useUiStore } from '../store/uiStore'
import { MobileHeaderToggle } from './Sidebar'

export function TopBar() {
  const tick = useIntervalTick(60_000)
  const secondTick = useSecondsTick()
  const settings = useSettingsRowHybrid()
  const applications = useApplicationsHybrid()
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
      <div className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2 sm:gap-x-4 sm:px-4 md:gap-x-6">
        <div className="flex min-w-0 items-center gap-3">
          <MobileHeaderToggle />
          <div className="min-w-0">
            <div
              className="flex items-baseline gap-2 text-sm font-semibold tracking-tight text-zinc-50 tabular-nums"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              <span>{dateStr}</span>
              <span className="hidden text-zinc-400 sm:inline">{yearStr}</span>
              <span className="rounded border border-[#3d4150] px-1.5 py-0.5 font-mono text-xs text-zinc-400">
                {clock}
              </span>
            </div>
            <div className="truncate font-mono text-xs text-zinc-400">
              W{week} · {grad.label} · {remainingLabel}
            </div>
          </div>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2 text-xs sm:gap-3 sm:text-sm">
          <Stat
            label="Streak"
            value={`${streak}d`}
            valueClass={streak > 0 ? 'text-lime-300' : 'text-zinc-400'}
          />
          <Stat label="Today" value={String(trends.today)} />
          {/* Secondary stats hide on very narrow screens to keep the top bar tidy. */}
          <Stat
            className="hidden sm:block"
            label="Δ y'day"
            value={fmtDelta(trends.deltaVsYesterday)}
            valueClass={deltaClass(trends.deltaVsYesterday)}
          />
          <Stat className="hidden md:block" label="7d avg" value={String(avg7)} />
          <Stat
            className="hidden md:block"
            label="30d avg"
            value={String(trends.avg30)}
          />

          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="hidden items-center gap-2 rounded border border-[#3d4150] bg-[#262934] px-2.5 py-1.5 text-xs text-zinc-400 hover:border-zinc-700 hover:text-zinc-200 md:flex"
            aria-label="Open command palette"
          >
            <span>Commands</span>
            <kbd className="rounded border border-[#4a4e5b] bg-[#1c1f27] px-1.5 py-0.5 font-mono text-xs text-zinc-400">
              ⌘K
            </kbd>
          </button>

          <AuthSetupLink />

          <UserChip />
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

function AuthSetupLink() {
  const status = useAuthStore((s) => s.status)

  if (status !== 'disabled') return null

  return (
    <Link
      to="/auth"
      title="Supabase wasn’t configured at deploy time. Open for steps to enable sign-in on GitHub Pages."
      className="rounded border border-amber-800/60 bg-amber-950/25 px-2.5 py-1.5 text-xs font-medium text-amber-100/95 hover:border-amber-600/70 hover:bg-amber-950/35"
    >
      Sign in (setup)
    </Link>
  )
}

function UserChip() {
  const status = useAuthStore((s) => s.status)
  const user = useAuthStore((s) => s.user)
  const signOut = useAuthStore((s) => s.signOut)
  const pushToast = useUiStore((s) => s.pushToast)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    window.addEventListener('mousedown', onDoc)
    return () => window.removeEventListener('mousedown', onDoc)
  }, [open])

  if (status !== 'authed' || !user) return null

  const email = user.email ?? 'signed in'
  const initial = (email.match(/[a-z0-9]/i)?.[0] ?? '?').toUpperCase()

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-[#3d4150] bg-[#262934] py-1 pl-1 pr-3 text-xs text-zinc-200 transition-colors hover:border-zinc-700 hover:bg-[#2c2f3a]"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span
          aria-hidden
          className="flex h-6 w-6 items-center justify-center rounded-full bg-lime-500/20 font-mono text-xs font-semibold text-lime-200 ring-1 ring-lime-500/40"
        >
          {initial}
        </span>
        <span className="hidden max-w-[10rem] truncate font-mono sm:inline">
          {email}
        </span>
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-60 overflow-hidden rounded-md border border-[#3d4150] bg-[#20232c] shadow-2xl"
        >
          <div className="border-b border-[#3d4150] px-3 py-2">
            <p className="font-mono text-xs uppercase tracking-wider text-zinc-400">
              Signed in as
            </p>
            <p className="truncate text-sm text-zinc-100">{email}</p>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={async () => {
              setOpen(false)
              await signOut()
              pushToast('info', 'Signed out')
            }}
            className="block w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-[#262934]"
          >
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  )
}

function Stat(props: {
  label: string
  value: string
  valueClass?: string
  className?: string
}) {
  return (
    <div className={cn('text-right', props.className)}>
      <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-400 sm:text-xs">
        {props.label}
      </div>
      <div
        className={cn(
          'font-mono text-sm font-semibold tabular-nums sm:text-base',
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
