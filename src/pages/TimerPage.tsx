import { useCallback, useEffect, useMemo, useState } from 'react'
import { useIntervalTick } from '../hooks/useIntervalTick'
import { cn } from '../lib/utils'
import { PassionWorkspace } from '../components/PassionWorkspace'
import {
  advancePhase,
  pomodoroRemainingMs,
  stopwatchElapsedMs,
  useTimerStore,
  type PomodoroPhase,
} from '../store/timerStore'
import { useUiStore } from '../store/uiStore'

const TICK_MS = 100

export function TimerPage() {
  const [howToOpen, setHowToOpen] = useState(false)

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1
            className="text-2xl font-semibold tracking-tight text-zinc-50"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Passion
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Research mode for your own ideas, startups, innovation and AGI
            work — a 45-minute think timer with notes, YouTube links and PDF
            attachments. The DSA stopwatch and general Pomodoro are right
            below; all three keep running while you navigate the app.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setHowToOpen(true)}
          className="rounded-md border border-[#3d4150] bg-[#262934] px-3 py-2 text-sm text-zinc-200 transition-colors hover:border-[#4a4e5b] hover:bg-[#2c2f3a]"
        >
          How to use Pomodoro
        </button>
      </header>

      <PassionWorkspace />

      <div className="flex items-center gap-3">
        <span
          className="font-mono text-xs uppercase tracking-wider text-zinc-400"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          Execution timers · stopwatch + pomodoro
        </span>
        <span className="h-px flex-1 bg-[#3d4150]" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <StopwatchCard />
        <PomodoroCard onShowHelp={() => setHowToOpen(true)} />
      </div>

      <TipsCard />

      {howToOpen ? <PomodoroHowTo onClose={() => setHowToOpen(false)} /> : null}
    </div>
  )
}

function StopwatchCard() {
  const sw = useTimerStore((s) => s.stopwatch)
  const swStart = useTimerStore((s) => s.swStart)
  const swPause = useTimerStore((s) => s.swPause)
  const swReset = useTimerStore((s) => s.swReset)
  const swLap = useTimerStore((s) => s.swLap)
  // Tick frequently for centisecond display while running, slow otherwise.
  useIntervalTick(sw.running ? TICK_MS : 1000)
  const elapsed = stopwatchElapsedMs(sw)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLElement &&
        (e.target.tagName === 'INPUT' ||
          e.target.tagName === 'TEXTAREA' ||
          e.target.isContentEditable)
      )
        return
      if (e.code !== 'Space') return
      e.preventDefault()
      if (sw.running) swPause()
      else swStart()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sw.running, swStart, swPause])

  const lastLapAt = sw.laps[0]?.atMs ?? 0
  const lapDeltas = useMemo(() => {
    const out: number[] = []
    for (let i = 0; i < sw.laps.length; i++) {
      const cur = sw.laps[i].atMs
      const prev = sw.laps[i + 1]?.atMs ?? 0
      out.push(cur - prev)
    }
    return out
  }, [sw.laps])

  return (
    <section className="surface-glossy rounded-xl p-5 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-zinc-400">
            Stopwatch · DSA practice
          </p>
          <h2 className="text-lg font-semibold text-zinc-100">
            Count up · save laps
          </h2>
        </div>
        <span
          className={cn(
            'rounded-full border px-2 py-0.5 font-mono text-xs uppercase tracking-wider',
            sw.running
              ? 'border-lime-500/60 bg-lime-500/10 text-lime-300'
              : 'border-[#3d4150] text-zinc-400',
          )}
        >
          {sw.running ? 'Running' : sw.baseMs > 0 ? 'Paused' : 'Idle'}
        </span>
      </div>

      <div className="mt-5 flex items-baseline gap-2 font-mono tabular-nums">
        <span
          className="text-6xl font-semibold text-zinc-50"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {formatStopwatch(elapsed)}
        </span>
        <span className="text-2xl text-zinc-400">
          .{formatCentis(elapsed)}
        </span>
      </div>
      {lastLapAt > 0 ? (
        <p className="mt-2 font-mono text-xs text-zinc-400">
          Last lap: +{formatStopwatch(elapsed - lastLapAt)}
        </p>
      ) : (
        <p className="mt-2 font-mono text-xs text-zinc-400">
          Press <KbdSpace /> to start or pause
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        {sw.running ? (
          <button
            type="button"
            onClick={swPause}
            className="rounded-md border border-amber-500/60 bg-amber-500/15 px-4 py-2 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/20"
          >
            Pause
          </button>
        ) : (
          <button
            type="button"
            onClick={swStart}
            className="btn-primary rounded-md px-4 py-2 text-sm"
          >
            {sw.baseMs > 0 ? 'Resume' : 'Start'}
          </button>
        )}
        <button
          type="button"
          onClick={swLap}
          disabled={!sw.running && sw.baseMs === 0}
          className="rounded-md border border-[#3d4150] bg-[#262934] px-4 py-2 text-sm text-zinc-200 transition-colors hover:bg-[#2c2f3a] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Lap
        </button>
        <button
          type="button"
          onClick={swReset}
          disabled={sw.baseMs === 0 && !sw.running && sw.laps.length === 0}
          className="rounded-md border border-[#3d4150] bg-[#262934] px-4 py-2 text-sm text-zinc-200 transition-colors hover:bg-[#2c2f3a] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Reset
        </button>
      </div>

      {sw.laps.length > 0 ? (
        <div className="mt-6">
          <p className="font-mono text-xs uppercase tracking-wider text-zinc-400">
            Laps
          </p>
          <ol className="mt-2 max-h-64 overflow-y-auto rounded-md border border-[#3d4150]">
            {sw.laps.map((lap, idx) => {
              const delta = lapDeltas[idx]
              const isFastest =
                lapDeltas.length > 1 &&
                delta === Math.min(...lapDeltas.filter((d) => d > 0))
              const isSlowest =
                lapDeltas.length > 1 && delta === Math.max(...lapDeltas)
              return (
                <li
                  key={lap.id}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-[#2f3340] px-3 py-2 last:border-b-0"
                >
                  <span className="font-mono text-xs text-zinc-400">
                    Lap {sw.laps.length - idx}
                  </span>
                  <span className="font-mono text-sm tabular-nums text-zinc-100">
                    {formatStopwatch(lap.atMs)}.
                    <span className="text-zinc-400">
                      {formatCentis(lap.atMs)}
                    </span>
                  </span>
                  <span
                    className={cn(
                      'font-mono text-xs tabular-nums',
                      isFastest
                        ? 'text-lime-300'
                        : isSlowest
                          ? 'text-amber-300'
                          : 'text-zinc-400',
                    )}
                  >
                    +{formatStopwatch(delta)}.{formatCentis(delta)}
                  </span>
                </li>
              )
            })}
          </ol>
        </div>
      ) : null}
    </section>
  )
}

function PomodoroCard(props: { onShowHelp: () => void }) {
  const p = useTimerStore((s) => s.pomodoro)
  const pomoStart = useTimerStore((s) => s.pomoStart)
  const pomoPause = useTimerStore((s) => s.pomoPause)
  const pomoReset = useTimerStore((s) => s.pomoReset)
  const pomoSkip = useTimerStore((s) => s.pomoSkip)
  const pomoSetSettings = useTimerStore((s) => s.pomoSetSettings)
  const pushToast = useUiStore((s) => s.pushToast)

  useIntervalTick(p.running ? 250 : 2000)
  const remaining = pomodoroRemainingMs(p)

  // When the phase ends, advance + chime.
  useEffect(() => {
    if (!p.running) return
    if (remaining > 0) return
    chime()
    try {
      const label =
        p.phase === 'focus' ? 'Focus block complete' : 'Break complete'
      pushToast('save', label)
      if (
        typeof Notification !== 'undefined' &&
        Notification.permission === 'granted'
      ) {
        new Notification(label, {
          body:
            p.phase === 'focus'
              ? 'Time for a break.'
              : 'Back to focused work.',
          silent: false,
        })
      }
    } catch {
      // best effort
    }
    useTimerStore.setState({ pomodoro: advancePhase(p) })
  }, [p, remaining, pushToast])

  const phaseMin =
    p.phase === 'focus'
      ? p.focusMin
      : p.phase === 'shortBreak'
        ? p.shortBreakMin
        : p.longBreakMin
  const totalMs = phaseMin * 60_000
  const pct = totalMs > 0 ? 1 - remaining / totalMs : 0
  const cyclePos = p.completed % p.longEvery
  const phaseLabel = phaseTitle(p.phase)

  function requestNotifyPermissionIfNeeded() {
    if (typeof Notification === 'undefined') return
    if (Notification.permission === 'default') {
      void Notification.requestPermission()
    }
  }

  return (
    <section
      className={cn(
        'rounded-xl border p-5 transition-colors md:p-6',
        p.phase === 'focus'
          ? 'border-lime-500/30 bg-gradient-to-b from-lime-500/[0.04] to-transparent'
          : p.phase === 'shortBreak'
            ? 'border-cyan-500/30 bg-gradient-to-b from-cyan-500/[0.04] to-transparent'
            : 'border-indigo-500/30 bg-gradient-to-b from-indigo-500/[0.05] to-transparent',
      )}
      style={{ backgroundColor: '#20232c' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-zinc-400">
            Pomodoro · any focused work · {p.focusMin}/{p.shortBreakMin}/
            {p.longBreakMin}
          </p>
          <h2 className="text-lg font-semibold text-zinc-100">{phaseLabel}</h2>
        </div>
        <button
          type="button"
          onClick={props.onShowHelp}
          className="rounded-full border border-[#3d4150] px-2.5 py-0.5 font-mono text-xs text-zinc-300 hover:border-[#4a4e5b]"
          aria-label="How does the Pomodoro technique work?"
        >
          ? How
        </button>
      </div>

      <div className="mt-5 flex items-baseline gap-3 font-mono tabular-nums">
        <span
          className="text-7xl font-semibold text-zinc-50"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {formatPomodoro(remaining)}
        </span>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full border border-[#3d4150] bg-[#2f3340]">
        <div
          className={cn(
            'h-full transition-[width] duration-300',
            p.phase === 'focus'
              ? 'bg-lime-400'
              : p.phase === 'shortBreak'
                ? 'bg-cyan-400'
                : 'bg-indigo-400',
          )}
          style={{ width: `${Math.min(100, Math.max(0, pct * 100))}%` }}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 font-mono text-xs text-zinc-400">
        <span>Cycle</span>
        {Array.from({ length: p.longEvery }).map((_, i) => (
          <span
            key={i}
            className={cn(
              'h-2.5 w-2.5 rounded-full border',
              i < cyclePos
                ? 'border-lime-500 bg-lime-500'
                : 'border-[#4a4e5b] bg-[#2f3340]',
            )}
            aria-hidden
          />
        ))}
        <span className="ml-2">
          {p.completed} focus session{p.completed === 1 ? '' : 's'} today-ish
        </span>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {p.running ? (
          <button
            type="button"
            onClick={pomoPause}
            className="rounded-md border border-amber-500/60 bg-amber-500/15 px-4 py-2 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/20"
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
            className="btn-primary rounded-md px-4 py-2 text-sm"
          >
            {remaining < totalMs ? 'Resume' : `Start ${phaseLabel.toLowerCase()}`}
          </button>
        )}
        <button
          type="button"
          onClick={pomoSkip}
          className="rounded-md border border-[#3d4150] bg-[#262934] px-4 py-2 text-sm text-zinc-200 transition-colors hover:bg-[#2c2f3a]"
        >
          Skip →
        </button>
        <button
          type="button"
          onClick={pomoReset}
          className="rounded-md border border-[#3d4150] bg-[#262934] px-4 py-2 text-sm text-zinc-200 transition-colors hover:bg-[#2c2f3a]"
        >
          Reset
        </button>
      </div>

      <details className="mt-5 rounded-md border border-[#3d4150] bg-[#1c1f27]/60 px-3 py-2">
        <summary className="cursor-pointer select-none text-sm text-zinc-200">
          Settings
        </summary>
        <PomodoroSettings
          focusMin={p.focusMin}
          shortBreakMin={p.shortBreakMin}
          longBreakMin={p.longBreakMin}
          longEvery={p.longEvery}
          autoStartBreak={p.autoStartBreak}
          autoStartFocus={p.autoStartFocus}
          onChange={pomoSetSettings}
        />
      </details>
    </section>
  )
}

function PomodoroSettings(props: {
  focusMin: number
  shortBreakMin: number
  longBreakMin: number
  longEvery: number
  autoStartBreak: boolean
  autoStartFocus: boolean
  onChange: (s: {
    focusMin: number
    shortBreakMin: number
    longBreakMin: number
    longEvery: number
    autoStartBreak: boolean
    autoStartFocus: boolean
  }) => void
}) {
  const update = useCallback(
    (partial: Partial<{
      focusMin: number
      shortBreakMin: number
      longBreakMin: number
      longEvery: number
      autoStartBreak: boolean
      autoStartFocus: boolean
    }>) => {
      props.onChange({
        focusMin: props.focusMin,
        shortBreakMin: props.shortBreakMin,
        longBreakMin: props.longBreakMin,
        longEvery: props.longEvery,
        autoStartBreak: props.autoStartBreak,
        autoStartFocus: props.autoStartFocus,
        ...partial,
      })
    },
    [props],
  )

  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      <NumberField
        label="Focus (min)"
        value={props.focusMin}
        min={1}
        max={120}
        onChange={(v) => update({ focusMin: v })}
      />
      <NumberField
        label="Short break (min)"
        value={props.shortBreakMin}
        min={1}
        max={60}
        onChange={(v) => update({ shortBreakMin: v })}
      />
      <NumberField
        label="Long break (min)"
        value={props.longBreakMin}
        min={1}
        max={90}
        onChange={(v) => update({ longBreakMin: v })}
      />
      <NumberField
        label="Long break every"
        value={props.longEvery}
        min={2}
        max={12}
        onChange={(v) => update({ longEvery: v })}
        suffix="focus blocks"
      />
      <label className="flex items-center gap-2 text-sm text-zinc-300 sm:col-span-1">
        <input
          type="checkbox"
          checked={props.autoStartBreak}
          onChange={(e) => update({ autoStartBreak: e.target.checked })}
          className="accent-lime-400"
        />
        Auto-start breaks
      </label>
      <label className="flex items-center gap-2 text-sm text-zinc-300 sm:col-span-1">
        <input
          type="checkbox"
          checked={props.autoStartFocus}
          onChange={(e) => update({ autoStartFocus: e.target.checked })}
          className="accent-lime-400"
        />
        Auto-start focus
      </label>
    </div>
  )
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
      <span className="text-xs text-zinc-400">{props.label}</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          className="field font-mono"
          value={props.value}
          min={props.min}
          max={props.max}
          onChange={(e) =>
            props.onChange(Number(e.target.value) || props.min)
          }
        />
        {props.suffix ? (
          <span className="text-xs text-zinc-400">{props.suffix}</span>
        ) : null}
      </div>
    </label>
  )
}

function TipsCard() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section className="rounded-xl border border-[#3d4150] bg-[#20232c]/60 p-5 md:p-6">
        <p className="font-mono text-xs uppercase tracking-wider text-zinc-400">
          Stopwatch
        </p>
        <h2 className="text-lg font-semibold text-zinc-100">
          DSA practice tips
        </h2>
        <ul className="mt-3 grid gap-2 text-sm text-zinc-300">
          <li>
            <span className="font-mono text-lime-300">Easy</span>: target
            10–15 min per problem. Beat the clock to build pattern
            recognition.
          </li>
          <li>
            <span className="font-mono text-cyan-300">Medium</span>: aim for
            25–35 min. If you stall past 30, peek at the approach (not the
            code), then redo from scratch.
          </li>
          <li>
            <span className="font-mono text-indigo-300">Hard</span>: cap at
            45 min for an attempt; if blocked, study the solution, then code
            it end-to-end without referring back.
          </li>
          <li>
            Use Lap between problems to capture per-problem splits — fastest
            and slowest are colour-coded.
          </li>
        </ul>
      </section>

      <section className="rounded-xl border border-[#3d4150] bg-[#20232c]/60 p-5 md:p-6">
        <p className="font-mono text-xs uppercase tracking-wider text-zinc-400">
          Pomodoro
        </p>
        <h2 className="text-lg font-semibold text-zinc-100">
          How to use it for anything
        </h2>
        <ul className="mt-3 grid gap-2 text-sm text-zinc-300">
          <li>
            <span className="font-mono text-lime-300">Deep work</span>:
            writing a system-design doc, drafting a cover letter, reading a
            paper, refactoring a module — anything that needs continuous
            attention.
          </li>
          <li>
            <span className="font-mono text-cyan-300">Shallow batches</span>:
            inbox, APS, code review queue. Batch the small things
            into one focus block instead of context-switching all day.
          </li>
          <li>
            <span className="font-mono text-indigo-300">Study blocks</span>:
            one Pomodoro per chapter / lecture / behavioural story.
            Auto-start breaks if you tend to over-run.
          </li>
          <li>
            Two cycles (≈ 2 hours of focused output) is a great day. Don't
            chase six.
          </li>
        </ul>
      </section>
    </div>
  )
}

function PomodoroHowTo(props: { onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') props.onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [props])

  return (
    <div
      role="dialog"
      aria-label="How to use the Pomodoro technique"
      className="fixed inset-0 z-[120] flex items-start justify-center bg-black/60 px-4 pt-[8vh] backdrop-blur-sm"
      onClick={props.onClose}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-lg border border-[#3d4150] bg-[#20232c] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-[#3d4150] px-5 py-3">
          <h3
            className="text-lg font-semibold text-zinc-50"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            How to use the Pomodoro technique
          </h3>
          <button
            type="button"
            onClick={props.onClose}
            className="rounded-md border border-[#3d4150] px-2 py-1 font-mono text-xs text-zinc-300 hover:bg-[#262934]"
          >
            Esc
          </button>
        </header>
        <div className="space-y-4 px-5 py-4 text-sm text-zinc-300">
          <p>
            The Pomodoro technique breaks deep work into short, sustainable
            sprints. The classic recipe (and the one we ship as the default)
            is <strong className="text-zinc-100">25 / 5 / 15</strong>:
          </p>
          <ol className="space-y-2 pl-5 [list-style:decimal]">
            <li>
              <strong className="text-zinc-100">Pick one task.</strong> Any
              single thing that benefits from focus — writing, reading,
              coding, studying, drafting, planning. Multitasking destroys
              the effect.
            </li>
            <li>
              <strong className="text-zinc-100">Focus 25 minutes.</strong>{' '}
              Phone face-down, no Slack, no tabs you don't need. If a stray
              thought arrives, jot it on a scratch list and keep going.
            </li>
            <li>
              <strong className="text-zinc-100">Short break, 5 min.</strong>{' '}
              Stand up, walk, look at something 20 feet away. Do{' '}
              <em>not</em> open social feeds — they reset the focus state.
            </li>
            <li>
              <strong className="text-zinc-100">
                After 4 focus blocks, take a long break (15 min).
              </strong>{' '}
              This is when your brain consolidates — protect it.
            </li>
            <li>
              <strong className="text-zinc-100">Repeat.</strong> 4 blocks
              ≈ 2 hours of real focused output. Two cycles in a day is a
              great day.
            </li>
          </ol>
          <div className="rounded-md border border-[#3d4150] bg-[#1c1f27]/70 px-3 py-2">
            <p className="font-mono text-xs uppercase tracking-wider text-zinc-400">
              In this app
            </p>
            <ul className="mt-1 space-y-1 text-sm text-zinc-300 [&_kbd]:rounded [&_kbd]:border [&_kbd]:border-[#3d4150] [&_kbd]:bg-[#1c1f27] [&_kbd]:px-1.5 [&_kbd]:py-0.5 [&_kbd]:font-mono [&_kbd]:text-xs [&_kbd]:text-zinc-300">
              <li>
                Hit <kbd>Start</kbd> to begin a focus block — the timer keeps
                running while you switch pages.
              </li>
              <li>
                When the timer hits 0 we chime and flip into the next phase
                automatically. Toggle <em>Auto-start breaks / focus</em> in
                Settings to chain blocks without clicking.
              </li>
              <li>
                Every 4th focus block (configurable) becomes a long break.
                The four dots under the timer show where you are in the
                current cycle.
              </li>
              <li>
                <kbd>Skip →</kbd> jumps to the next phase, <kbd>Reset</kbd>{' '}
                restarts the current phase from full duration.
              </li>
            </ul>
          </div>
          <div className="rounded-md border border-lime-500/30 bg-lime-500/[0.06] px-3 py-2 text-sm text-lime-100">
            <strong className="font-semibold">Pomodoro is generic</strong> —
            use it for system-design write-ups, behavioural-story drafts,
            cover letters, reading, deep refactors, anything. The stopwatch
            on the left is the DSA-specific tool: start a Pomodoro focus
            block and use the stopwatch + laps inside it to time individual
            DSA problems.
          </div>
        </div>
      </div>
    </div>
  )
}

function KbdSpace() {
  return (
    <kbd className="rounded border border-[#3d4150] bg-[#1c1f27] px-1.5 py-0.5 font-mono text-xs text-zinc-300">
      Space
    </kbd>
  )
}

function phaseTitle(p: PomodoroPhase): string {
  switch (p) {
    case 'focus':
      return 'Focus'
    case 'shortBreak':
      return 'Short break'
    case 'longBreak':
      return 'Long break'
  }
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

function formatStopwatch(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return h > 0 ? `${h}:${pad2(m)}:${pad2(s)}` : `${pad2(m)}:${pad2(s)}`
}

function formatCentis(ms: number): string {
  const cs = Math.floor((Math.max(0, ms) % 1000) / 10)
  return pad2(cs)
}

function formatPomodoro(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${pad2(m)}:${pad2(s)}`
}

/** Short audible chime via the WebAudio API (no asset needed). */
function chime() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.45)
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6)
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.65)
    osc.onended = () => ctx.close()
  } catch {
    // ignore
  }
}
