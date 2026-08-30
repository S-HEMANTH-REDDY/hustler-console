import { useEffect, useState } from 'react'
import { useTasksHybrid } from '../cloud/hybridData'
import { CycleDots } from '../components/CycleDots'
import { formatClock, phaseLabel } from '../lib/timerFormat'
import { useIntervalTick } from '../hooks/useIntervalTick'
import { isRecurrenceComplete } from '../lib/dates'
import { cn } from '../lib/utils'
import {
  TIMER_PRESETS,
  matchPreset,
  pomodoroRemainingMs,
  useTimerStore,
} from '../store/timerStore'
import { useUiStore } from '../store/uiStore'

const DIAL_R = 94
const DIAL_C = 2 * Math.PI * DIAL_R

/**
 * Circular progress dial that frames the timer. The ring itself carries the
 * progress, so no separate bar is needed.
 */
function TimerDial(props: {
  progress: number
  isFocus: boolean
  zenMode: boolean
  label: string
  children: React.ReactNode
}) {
  const pct = Math.min(1, Math.max(0, props.progress))
  const stroke = props.isFocus ? '#84cc16' : '#22d3ee'
  const gradId = props.isFocus ? 'dial-focus' : 'dial-break'

  return (
    <div
      className={cn(
        // overflow-hidden keeps the rotating ring's square bounding box from
        // widening the page; the ring itself is a circle, so nothing visible
        // gets clipped.
        'relative mt-6 flex aspect-square w-full items-center justify-center overflow-hidden',
        props.zenMode ? 'max-w-[30rem]' : 'max-w-[24rem]',
      )}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct * 100)}
      aria-label={props.label}
    >
      {/* Ambient halo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-[12%] animate-glow-pulse rounded-full"
        style={{
          background: `radial-gradient(circle, ${stroke}1f 0%, ${stroke}08 45%, transparent 70%)`,
        }}
      />
      {/* Rotating dashed halo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 animate-orbit rounded-full border border-dashed"
        style={{ borderColor: `${stroke}2e` }}
      />
      {/* Progress ring */}
      <svg
        aria-hidden
        viewBox="0 0 200 200"
        className="pointer-events-none absolute inset-[5%] -rotate-90"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={props.isFocus ? '#d9f99d' : '#a5f3fc'} />
            <stop offset="60%" stopColor={stroke} />
            <stop offset="100%" stopColor={props.isFocus ? '#22d3ee' : '#84cc16'} />
          </linearGradient>
        </defs>
        <circle
          cx="100"
          cy="100"
          r={DIAL_R}
          fill="none"
          stroke="var(--color-edge)"
          strokeWidth="2"
        />
        <circle
          cx="100"
          cy="100"
          r={DIAL_R}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={DIAL_C}
          strokeDashoffset={DIAL_C * (1 - pct)}
          style={{
            transition: 'stroke-dashoffset 500ms linear',
            filter: `drop-shadow(0 0 6px ${stroke}99)`,
          }}
        />
      </svg>
      <div className="relative flex flex-col items-center">{props.children}</div>
    </div>
  )
}

export function FocusPage() {
  const p = useTimerStore((s) => s.pomodoro)
  const pomoStart = useTimerStore((s) => s.pomoStart)
  const pomoPause = useTimerStore((s) => s.pomoPause)
  const pomoReset = useTimerStore((s) => s.pomoReset)
  const pomoSkip = useTimerStore((s) => s.pomoSkip)
  const pomoSetTask = useTimerStore((s) => s.pomoSetTask)
  const pomoApplyPreset = useTimerStore((s) => s.pomoApplyPreset)
  const pomoSetSettings = useTimerStore((s) => s.pomoSetSettings)
  const zenMode = useUiStore((s) => s.zenMode)
  const setZenMode = useUiStore((s) => s.setZenMode)
  const tasks = useTasksHybrid()
  const now = useIntervalTick(p.running ? 500 : 2000)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => () => setZenMode(false), [setZenMode])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && useUiStore.getState().zenMode) {
        setZenMode(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setZenMode])

  const remaining = pomodoroRemainingMs(p)
  const phaseMin =
    p.phase === 'focus'
      ? p.focusMin
      : p.phase === 'shortBreak'
        ? p.shortBreakMin
        : p.longBreakMin
  const totalMs = phaseMin * 60_000
  const progress = totalMs > 0 ? 1 - remaining / totalMs : 0

  const openTasks = tasks.filter(
    (t) => !isRecurrenceComplete(t.lastCompletedAt, t.recurrence, now),
  )
  const currentTask = tasks.find((t) => t.id === p.taskId) ?? null
  const activePreset = matchPreset(p)

  const isFocus = p.phase === 'focus'

  function requestNotifyPermissionIfNeeded() {
    if (typeof Notification === 'undefined') return
    if (Notification.permission === 'default') {
      void Notification.requestPermission()
    }
  }

  return (
    <div
      className={cn(
        'mx-auto flex w-full max-w-2xl flex-col items-center animate-fade-in',
        zenMode && 'min-h-full justify-center px-4 py-10',
      )}
    >
      {/* Phase badge */}
      <div className="relative flex items-center gap-2.5">
        <span
          className={cn(
            'rounded-xl border px-4 py-1.5 text-xs font-semibold uppercase tracking-wider',
            isFocus
              ? 'border-lime-400/30 bg-lime-500/10 text-lime-400'
              : 'border-cyan-400/30 bg-cyan-500/10 text-cyan-300',
          )}
        >
          {phaseLabel(p.phase)}
        </span>
        {p.justCompleted ? (
          <span className="rounded-xl border border-edge bg-surface px-3 py-1.5 text-xs text-zinc-400">
            {p.justCompleted === 'focus'
              ? 'Focus complete — take your break'
              : 'Break over — ready when you are'}
          </span>
        ) : null}
      </div>

      {/* Timer dial */}
      <TimerDial
        progress={progress}
        isFocus={isFocus}
        zenMode={zenMode}
        label={`${phaseLabel(p.phase)} progress`}
      >
        <p
          className={cn(
            'numeric-display text-zinc-50',
            zenMode
              ? 'text-[clamp(4rem,18vw,9rem)]'
              : 'text-[clamp(3.5rem,15vw,7rem)]',
            isFocus ? 'glow-lime' : 'glow-cyan',
          )}
        >
          {formatClock(remaining)}
        </p>
        <div className="mt-4">
          <CycleDots completed={p.completed % p.longEvery} total={p.longEvery} />
        </div>
      </TimerDial>

      {/* Task selector */}
      {!zenMode ? (
        <div className="mt-6 w-full max-w-md">
          <label className="block">
            <span className="text-xs text-zinc-500">Working on</span>
            <select
              className="field mt-1.5"
              value={p.taskId ?? ''}
              onChange={(e) => pomoSetTask(e.target.value || null)}
            >
              <option value="">No task selected</option>
              {openTasks.map((t) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          </label>
        </div>
      ) : currentTask ? (
        <p className="mt-6 max-w-md truncate text-sm text-zinc-500">
          Working on <span className="text-zinc-300">{currentTask.title}</span>
        </p>
      ) : null}

      {/* Action buttons */}
      <div className="mt-8 flex items-center gap-3">
        <button type="button" onClick={pomoSkip} className="btn-quiet h-11 rounded-xl px-5 text-sm" title="Skip to next session">
          Skip
        </button>
        {p.running ? (
          <button
            type="button"
            onClick={pomoPause}
            className="h-13 min-w-40 rounded-xl border border-amber-400/40 bg-amber-500/15 px-7 text-sm font-semibold text-amber-200 transition-all hover:bg-amber-500/20 hover:shadow-[0_0_20px_-4px_rgba(245,158,11,0.3)]"
          >
            Pause
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              requestNotifyPermissionIfNeeded()
              pomoStart()
            }}
            className="btn-primary h-13 min-w-40 rounded-xl px-7 text-sm"
          >
            {p.everStarted && remaining < totalMs ? 'Resume' : 'Start'}
          </button>
        )}
        <button type="button" onClick={pomoReset} className="btn-quiet h-11 rounded-xl px-5 text-sm" title="Reset this session">
          Reset
        </button>
      </div>

      {/* Zen toggle */}
      <button
        type="button"
        onClick={() => setZenMode(!zenMode)}
        className="mt-5 text-xs text-zinc-600 underline-offset-4 transition-colors hover:text-zinc-400 hover:underline"
      >
        {zenMode ? 'Exit fullscreen (Esc)' : 'Distraction-free mode'}
      </button>

      {/* Presets + Settings */}
      {!zenMode ? (
        <>
          <div className="mt-8 w-full max-w-md">
            <p className="text-xs text-zinc-500">Preset</p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {TIMER_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => pomoApplyPreset(preset.id)}
                  className={cn(
                    'rounded-xl border px-3 py-2.5 text-center transition-all',
                    activePreset === preset.id
                      ? 'border-lime-400/40 bg-lime-500/10 shadow-[0_0_16px_-4px_rgba(132,204,22,0.2)]'
                      : 'border-edge bg-surface hover:border-edge-strong hover:bg-surface-2',
                  )}
                  aria-pressed={activePreset === preset.id}
                >
                  <span className={cn('block text-sm font-medium', activePreset === preset.id ? 'text-lime-400' : 'text-zinc-200')}>
                    {preset.label}
                  </span>
                  <span className="block font-mono text-[0.75rem] text-zinc-500">{preset.hint}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSettingsOpen((v) => !v)}
                className={cn(
                  'rounded-xl border px-3 py-2.5 text-center transition-all',
                  activePreset === 'custom'
                    ? 'border-lime-400/40 bg-lime-500/10 shadow-[0_0_16px_-4px_rgba(132,204,22,0.2)]'
                    : 'border-edge bg-surface hover:border-edge-strong hover:bg-surface-2',
                )}
                aria-expanded={settingsOpen}
              >
                <span className={cn('block text-sm font-medium', activePreset === 'custom' ? 'text-lime-400' : 'text-zinc-200')}>
                  Custom
                </span>
                <span className="block font-mono text-[0.75rem] text-zinc-500">{p.focusMin} / {p.shortBreakMin}</span>
              </button>
            </div>
          </div>

          <div className="mt-4 w-full max-w-md">
            <button
              type="button"
              onClick={() => setSettingsOpen((v) => !v)}
              className="flex w-full items-center justify-between rounded-xl border border-edge bg-surface px-4 py-2.5 text-sm text-zinc-400 transition-all hover:border-edge-strong hover:bg-surface-2"
              aria-expanded={settingsOpen}
            >
              <span>Timer settings</span>
              <span className={cn('text-zinc-600 transition-transform duration-200', settingsOpen && 'rotate-180')} aria-hidden>▾</span>
            </button>
            {settingsOpen ? (
              <div className="card mt-2 animate-slide-up space-y-3 p-4">
                <div className="grid grid-cols-2 gap-3">
                  <NumberField label="Focus (min)" value={p.focusMin} min={1} max={120} onChange={(v) => pomoSetSettings({ ...settingsOf(p), focusMin: v })} />
                  <NumberField label="Short break (min)" value={p.shortBreakMin} min={1} max={60} onChange={(v) => pomoSetSettings({ ...settingsOf(p), shortBreakMin: v })} />
                  <NumberField label="Long break (min)" value={p.longBreakMin} min={1} max={90} onChange={(v) => pomoSetSettings({ ...settingsOf(p), longBreakMin: v })} />
                  <NumberField label="Long break after" value={p.longEvery} min={2} max={12} onChange={(v) => pomoSetSettings({ ...settingsOf(p), longEvery: v })} suffix="sessions" />
                </div>
                <label className="flex items-center gap-2.5 text-sm text-zinc-400">
                  <input type="checkbox" checked={p.autoStartBreak} onChange={(e) => pomoSetSettings({ ...settingsOf(p), autoStartBreak: e.target.checked })} className="h-4 w-4 accent-lime-500" />
                  Start breaks automatically
                </label>
                <label className="flex items-center gap-2.5 text-sm text-zinc-400">
                  <input type="checkbox" checked={p.autoStartFocus} onChange={(e) => pomoSetSettings({ ...settingsOf(p), autoStartFocus: e.target.checked })} className="h-4 w-4 accent-lime-500" />
                  Start focus automatically after breaks
                </label>
                <p className="border-t border-edge-soft pt-3 text-xs leading-relaxed text-zinc-500">
                  {p.focusMin}m focus → {p.shortBreakMin}m break. After {p.longEvery} sessions, {p.longBreakMin}m long break.
                </p>
              </div>
            ) : null}
          </div>

          <p className={cn('mt-6 text-xs', isFocus ? 'text-lime-400/40' : 'text-cyan-400/40')}>
            Timer runs on every page — watch it in the tab title or header.
          </p>
        </>
      ) : null}
    </div>
  )
}

function settingsOf(p: {
  focusMin: number
  shortBreakMin: number
  longBreakMin: number
  longEvery: number
  autoStartBreak: boolean
  autoStartFocus: boolean
}) {
  return {
    focusMin: p.focusMin,
    shortBreakMin: p.shortBreakMin,
    longBreakMin: p.longBreakMin,
    longEvery: p.longEvery,
    autoStartBreak: p.autoStartBreak,
    autoStartFocus: p.autoStartFocus,
  }
}

function NumberField(props: {
  label: string
  value: number
  min: number
  max: number
  onChange: (v: number) => void
  suffix?: string
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs text-zinc-500">{props.label}</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          className="field font-mono"
          value={props.value}
          min={props.min}
          max={props.max}
          onChange={(e) => props.onChange(Number(e.target.value) || props.min)}
        />
        {props.suffix ? <span className="text-xs text-zinc-500">{props.suffix}</span> : null}
      </div>
    </label>
  )
}
