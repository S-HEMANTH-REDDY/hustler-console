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

  // Leave zen mode when unmounting so other pages get their chrome back.
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
  const accentText = isFocus ? 'text-lime-300' : 'text-cyan-300'
  const accentBar = isFocus ? 'bg-lime-400' : 'bg-cyan-400'

  function requestNotifyPermissionIfNeeded() {
    if (typeof Notification === 'undefined') return
    if (Notification.permission === 'default') {
      void Notification.requestPermission()
    }
  }

  return (
    <div
      className={cn(
        'mx-auto flex w-full max-w-2xl flex-col items-center',
        zenMode && 'min-h-full justify-center px-4 py-10',
      )}
    >
      {/* Session type */}
      <div className="mt-2 flex items-center gap-2">
        <span
          className={cn(
            'rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider',
            isFocus
              ? 'border-lime-400/40 bg-lime-500/10 text-lime-300'
              : 'border-cyan-400/40 bg-cyan-500/10 text-cyan-300',
          )}
        >
          {phaseLabel(p.phase)}
        </span>
        {p.justCompleted ? (
          <span className="rounded-full border border-edge bg-surface px-3 py-1 text-xs text-zinc-300">
            {p.justCompleted === 'focus'
              ? 'Focus complete — take your break'
              : 'Break over — ready when you are'}
          </span>
        ) : null}
      </div>

      {/* Countdown */}
      <p
        className={cn(
          'mt-4 font-mono font-semibold tabular-nums leading-none text-zinc-50',
          zenMode ? 'text-[7rem] sm:text-[9rem]' : 'text-[5.5rem] sm:text-[7rem]',
        )}
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {formatClock(remaining)}
      </p>

      {/* Progress */}
      <div
        className="mt-5 h-1.5 w-full max-w-md overflow-hidden rounded-full bg-surface-3"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        aria-label={`${phaseLabel(p.phase)} progress`}
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-500', accentBar)}
          style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
        />
      </div>

      {/* Cycle */}
      <div className="mt-4">
        <CycleDots
          completed={p.completed % p.longEvery}
          total={p.longEvery}
        />
      </div>

      {/* Current task */}
      {!zenMode ? (
        <div className="mt-6 w-full max-w-md">
          <label className="block">
            <span className="text-xs text-zinc-500">Working on</span>
            <select
              className="field mt-1"
              value={p.taskId ?? ''}
              onChange={(e) => pomoSetTask(e.target.value || null)}
            >
              <option value="">No task selected</option>
              {openTasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : currentTask ? (
        <p className="mt-6 max-w-md truncate text-sm text-zinc-400">
          Working on <span className="text-zinc-200">{currentTask.title}</span>
        </p>
      ) : null}

      {/* Controls */}
      <div className="mt-7 flex items-center gap-3">
        <button
          type="button"
          onClick={pomoSkip}
          className="btn-quiet h-11 px-4 text-sm"
          title="Skip to the next session"
        >
          Skip
        </button>
        {p.running ? (
          <button
            type="button"
            onClick={pomoPause}
            className="h-14 min-w-40 rounded-xl border border-amber-400/50 bg-amber-500/15 px-8 text-base font-semibold text-amber-200 transition-colors hover:bg-amber-500/20"
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
            className="btn-primary h-14 min-w-40 rounded-xl px-8 text-base"
          >
            {p.everStarted && remaining < totalMs ? 'Resume' : 'Start'}
          </button>
        )}
        <button
          type="button"
          onClick={pomoReset}
          className="btn-quiet h-11 px-4 text-sm"
          title="Reset this session to full length"
        >
          Reset
        </button>
      </div>

      {/* Zen toggle */}
      <button
        type="button"
        onClick={() => setZenMode(!zenMode)}
        className="mt-5 text-xs text-zinc-500 underline-offset-4 hover:text-zinc-300 hover:underline"
      >
        {zenMode ? 'Exit fullscreen (Esc)' : 'Distraction-free mode'}
      </button>

      {!zenMode ? (
        <>
          {/* Presets */}
          <div className="mt-8 w-full max-w-md">
            <p className="text-xs text-zinc-500">Preset</p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {TIMER_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => pomoApplyPreset(preset.id)}
                  className={cn(
                    'rounded-lg border px-2 py-2 text-center transition-colors',
                    activePreset === preset.id
                      ? 'border-lime-400/60 bg-lime-500/10'
                      : 'border-edge bg-surface hover:border-edge-strong',
                  )}
                  aria-pressed={activePreset === preset.id}
                >
                  <span
                    className={cn(
                      'block text-xs font-semibold',
                      activePreset === preset.id
                        ? 'text-lime-300'
                        : 'text-zinc-200',
                    )}
                  >
                    {preset.label}
                  </span>
                  <span className="block font-mono text-[11px] text-zinc-500">
                    {preset.hint}
                  </span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSettingsOpen((v) => !v)}
                className={cn(
                  'rounded-lg border px-2 py-2 text-center transition-colors',
                  activePreset === 'custom'
                    ? 'border-lime-400/60 bg-lime-500/10'
                    : 'border-edge bg-surface hover:border-edge-strong',
                )}
                aria-expanded={settingsOpen}
              >
                <span
                  className={cn(
                    'block text-xs font-semibold',
                    activePreset === 'custom' ? 'text-lime-300' : 'text-zinc-200',
                  )}
                >
                  Custom
                </span>
                <span className="block font-mono text-[11px] text-zinc-500">
                  {p.focusMin} / {p.shortBreakMin}
                </span>
              </button>
            </div>
          </div>

          {/* Advanced settings */}
          <div className="mt-4 w-full max-w-md">
            <button
              type="button"
              onClick={() => setSettingsOpen((v) => !v)}
              className="flex w-full items-center justify-between rounded-lg border border-edge bg-surface px-3 py-2.5 text-sm text-zinc-300 hover:border-edge-strong"
              aria-expanded={settingsOpen}
            >
              <span>Timer settings</span>
              <span
                className={cn(
                  'text-zinc-500 transition-transform',
                  settingsOpen && 'rotate-180',
                )}
                aria-hidden
              >
                ▾
              </span>
            </button>
            {settingsOpen ? (
              <div className="card mt-2 space-y-3 p-4">
                <div className="grid grid-cols-2 gap-3">
                  <NumberField
                    label="Focus (min)"
                    value={p.focusMin}
                    min={1}
                    max={120}
                    onChange={(v) =>
                      pomoSetSettings({ ...settingsOf(p), focusMin: v })
                    }
                  />
                  <NumberField
                    label="Short break (min)"
                    value={p.shortBreakMin}
                    min={1}
                    max={60}
                    onChange={(v) =>
                      pomoSetSettings({ ...settingsOf(p), shortBreakMin: v })
                    }
                  />
                  <NumberField
                    label="Long break (min)"
                    value={p.longBreakMin}
                    min={1}
                    max={90}
                    onChange={(v) =>
                      pomoSetSettings({ ...settingsOf(p), longBreakMin: v })
                    }
                  />
                  <NumberField
                    label="Long break after"
                    value={p.longEvery}
                    min={2}
                    max={12}
                    onChange={(v) =>
                      pomoSetSettings({ ...settingsOf(p), longEvery: v })
                    }
                    suffix="sessions"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-zinc-300">
                  <input
                    type="checkbox"
                    checked={p.autoStartBreak}
                    onChange={(e) =>
                      pomoSetSettings({
                        ...settingsOf(p),
                        autoStartBreak: e.target.checked,
                      })
                    }
                    className="h-4 w-4 accent-lime-500"
                  />
                  Start breaks automatically
                </label>
                <label className="flex items-center gap-2 text-sm text-zinc-300">
                  <input
                    type="checkbox"
                    checked={p.autoStartFocus}
                    onChange={(e) =>
                      pomoSetSettings({
                        ...settingsOf(p),
                        autoStartFocus: e.target.checked,
                      })
                    }
                    className="h-4 w-4 accent-lime-500"
                  />
                  Start focus automatically after breaks
                </label>
                <p className="border-t border-edge-soft pt-3 text-xs leading-relaxed text-zinc-500">
                  Schedule: {p.focusMin} min focus → {p.shortBreakMin} min
                  break. After {p.longEvery} focus sessions, a {p.longBreakMin}{' '}
                  min long break.
                </p>
              </div>
            ) : null}
          </div>

          <p className={cn('mt-6 text-xs', accentText, 'opacity-70')}>
            The timer keeps running on every page — watch it in the tab title
            or the header.
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
    <label className="space-y-1">
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
        {props.suffix ? (
          <span className="text-xs text-zinc-500">{props.suffix}</span>
        ) : null}
      </div>
    </label>
  )
}
