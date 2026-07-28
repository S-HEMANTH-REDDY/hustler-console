import { Link, useLocation } from 'react-router-dom'
import { useIntervalTick } from '../hooks/useIntervalTick'
import { formatClock, phaseLabel } from '../lib/timerFormat'
import { cn } from '../lib/utils'
import { pomodoroRemainingMs, useTimerStore } from '../store/timerStore'

/**
 * Compact timer chip for the header. Visible whenever a session is running
 * or paused mid-way, on every page, so the timer is never lost.
 */
export function MiniTimer() {
  const p = useTimerStore((s) => s.pomodoro)
  const pomoStart = useTimerStore((s) => s.pomoStart)
  const pomoPause = useTimerStore((s) => s.pomoPause)
  const location = useLocation()
  useIntervalTick(p.running ? 1000 : 60_000)

  const active = p.running || p.everStarted || p.justCompleted != null
  if (!active) return null

  const remaining = pomodoroRemainingMs(p)
  const onFocusPage = location.pathname === '/focus'

  const tone =
    p.phase === 'focus'
      ? 'border-lime-400/50 text-lime-300'
      : 'border-cyan-400/50 text-cyan-300'

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 rounded-full border bg-surface py-1 pl-3 pr-1',
        tone,
      )}
    >
      <Link
        to="/focus"
        className="flex items-center gap-2 text-xs font-medium"
        title="Open Focus"
      >
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            p.running
              ? p.phase === 'focus'
                ? 'animate-pulse bg-lime-400'
                : 'animate-pulse bg-cyan-400'
              : 'bg-zinc-500',
          )}
          aria-hidden
        />
        <span className="hidden sm:inline">{phaseLabel(p.phase)}</span>
        <span className="font-mono text-sm font-semibold tabular-nums">
          {formatClock(remaining)}
        </span>
      </Link>
      <button
        type="button"
        onClick={p.running ? pomoPause : pomoStart}
        className="flex h-7 w-7 items-center justify-center rounded-full text-zinc-300 hover:bg-surface-2 hover:text-zinc-50"
        aria-label={p.running ? 'Pause timer' : 'Resume timer'}
      >
        {p.running ? <PauseIcon /> : <PlayIcon />}
      </button>
      {!onFocusPage ? (
        <span className="sr-only">Timer running — open Focus page for controls</span>
      ) : null}
    </div>
  )
}

export function PlayIcon(props: { className?: string }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={props.className}
    >
      <path d="M8 5.14v13.72c0 .8.87 1.3 1.56.9l11-6.86a1.05 1.05 0 0 0 0-1.8l-11-6.86c-.69-.4-1.56.1-1.56.9Z" />
    </svg>
  )
}

export function PauseIcon(props: { className?: string }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={props.className}
    >
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  )
}
