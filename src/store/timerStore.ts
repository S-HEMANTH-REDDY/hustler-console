import { create } from 'zustand'

const STOPWATCH_KEY = 'hustler.stopwatch.v1'
const POMODORO_KEY = 'hustler.pomodoro.v1'

export interface StopwatchLap {
  id: number
  /** Elapsed ms at the moment of the lap (cumulative from start). */
  atMs: number
}

interface StopwatchPersist {
  running: boolean
  /** Cumulative elapsed ms accumulated across previous runs. */
  baseMs: number
  /** Timestamp (Date.now()) when the current run started, or null if paused. */
  runStartedAt: number | null
  laps: StopwatchLap[]
  lapSeq: number
}

export type PomodoroPhase = 'focus' | 'shortBreak' | 'longBreak'

interface PomodoroPersist {
  running: boolean
  phase: PomodoroPhase
  /** ms remaining at the time the run started/paused. */
  remainingMs: number
  /** Date.now() at last start, or null if paused. */
  runStartedAt: number | null
  /** Completed focus sessions in this cycle (0..longEvery-1, rolls over). */
  completed: number
  focusMin: number
  shortBreakMin: number
  longBreakMin: number
  /** Every Nth focus session leads into a long break. */
  longEvery: number
  autoStartBreak: boolean
  autoStartFocus: boolean
}

interface TimerState {
  stopwatch: StopwatchPersist
  pomodoro: PomodoroPersist

  swStart: () => void
  swPause: () => void
  swReset: () => void
  swLap: () => void

  pomoStart: () => void
  pomoPause: () => void
  pomoReset: () => void
  pomoSkip: () => void
  pomoSetSettings: (s: {
    focusMin: number
    shortBreakMin: number
    longBreakMin: number
    longEvery: number
    autoStartBreak: boolean
    autoStartFocus: boolean
  }) => void
}

function loadStopwatch(): StopwatchPersist {
  if (typeof window === 'undefined') return defaultStopwatch()
  try {
    const raw = window.localStorage.getItem(STOPWATCH_KEY)
    if (!raw) return defaultStopwatch()
    const parsed = JSON.parse(raw) as Partial<StopwatchPersist>
    return {
      ...defaultStopwatch(),
      ...parsed,
      laps: Array.isArray(parsed.laps) ? parsed.laps : [],
    }
  } catch {
    return defaultStopwatch()
  }
}

function defaultStopwatch(): StopwatchPersist {
  return {
    running: false,
    baseMs: 0,
    runStartedAt: null,
    laps: [],
    lapSeq: 0,
  }
}

function loadPomodoro(): PomodoroPersist {
  if (typeof window === 'undefined') return defaultPomodoro()
  try {
    const raw = window.localStorage.getItem(POMODORO_KEY)
    if (!raw) return defaultPomodoro()
    const parsed = JSON.parse(raw) as Partial<PomodoroPersist>
    return { ...defaultPomodoro(), ...parsed }
  } catch {
    return defaultPomodoro()
  }
}

function defaultPomodoro(): PomodoroPersist {
  return {
    running: false,
    phase: 'focus',
    remainingMs: 25 * 60_000,
    runStartedAt: null,
    completed: 0,
    focusMin: 25,
    shortBreakMin: 5,
    longBreakMin: 15,
    longEvery: 4,
    autoStartBreak: false,
    autoStartFocus: false,
  }
}

function persistStopwatch(s: StopwatchPersist) {
  try {
    window.localStorage.setItem(STOPWATCH_KEY, JSON.stringify(s))
  } catch {
    // ignore quota / private mode failures
  }
}

function persistPomodoro(p: PomodoroPersist) {
  try {
    window.localStorage.setItem(POMODORO_KEY, JSON.stringify(p))
  } catch {
    // ignore quota / private mode failures
  }
}

export const useTimerStore = create<TimerState>((set, get) => ({
  stopwatch: loadStopwatch(),
  pomodoro: loadPomodoro(),

  swStart: () => {
    const sw = get().stopwatch
    if (sw.running) return
    const next: StopwatchPersist = {
      ...sw,
      running: true,
      runStartedAt: Date.now(),
    }
    persistStopwatch(next)
    set({ stopwatch: next })
  },
  swPause: () => {
    const sw = get().stopwatch
    if (!sw.running || sw.runStartedAt == null) return
    const next: StopwatchPersist = {
      ...sw,
      running: false,
      baseMs: sw.baseMs + (Date.now() - sw.runStartedAt),
      runStartedAt: null,
    }
    persistStopwatch(next)
    set({ stopwatch: next })
  },
  swReset: () => {
    const next = defaultStopwatch()
    persistStopwatch(next)
    set({ stopwatch: next })
  },
  swLap: () => {
    const sw = get().stopwatch
    const total =
      sw.baseMs +
      (sw.running && sw.runStartedAt != null
        ? Date.now() - sw.runStartedAt
        : 0)
    const id = sw.lapSeq + 1
    const next: StopwatchPersist = {
      ...sw,
      lapSeq: id,
      laps: [{ id, atMs: total }, ...sw.laps].slice(0, 50),
    }
    persistStopwatch(next)
    set({ stopwatch: next })
  },

  pomoStart: () => {
    const p = get().pomodoro
    if (p.running) return
    const next: PomodoroPersist = {
      ...p,
      running: true,
      runStartedAt: Date.now(),
    }
    persistPomodoro(next)
    set({ pomodoro: next })
  },
  pomoPause: () => {
    const p = get().pomodoro
    if (!p.running || p.runStartedAt == null) return
    const elapsed = Date.now() - p.runStartedAt
    const next: PomodoroPersist = {
      ...p,
      running: false,
      runStartedAt: null,
      remainingMs: Math.max(0, p.remainingMs - elapsed),
    }
    persistPomodoro(next)
    set({ pomodoro: next })
  },
  pomoReset: () => {
    const p = get().pomodoro
    const phaseMin =
      p.phase === 'focus'
        ? p.focusMin
        : p.phase === 'shortBreak'
          ? p.shortBreakMin
          : p.longBreakMin
    const next: PomodoroPersist = {
      ...p,
      running: false,
      runStartedAt: null,
      remainingMs: phaseMin * 60_000,
    }
    persistPomodoro(next)
    set({ pomodoro: next })
  },
  pomoSkip: () => {
    const p = get().pomodoro
    const advanced = advancePhase(p)
    persistPomodoro(advanced)
    set({ pomodoro: advanced })
  },
  pomoSetSettings: (s) => {
    const p = get().pomodoro
    const focusMin = clamp(s.focusMin, 1, 120)
    const shortBreakMin = clamp(s.shortBreakMin, 1, 60)
    const longBreakMin = clamp(s.longBreakMin, 1, 90)
    const longEvery = clamp(s.longEvery, 2, 12)
    const phaseMin =
      p.phase === 'focus'
        ? focusMin
        : p.phase === 'shortBreak'
          ? shortBreakMin
          : longBreakMin
    const next: PomodoroPersist = {
      ...p,
      focusMin,
      shortBreakMin,
      longBreakMin,
      longEvery,
      autoStartBreak: s.autoStartBreak,
      autoStartFocus: s.autoStartFocus,
      remainingMs: p.running ? p.remainingMs : phaseMin * 60_000,
    }
    persistPomodoro(next)
    set({ pomodoro: next })
  },
}))

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min
  return Math.min(max, Math.max(min, Math.round(n)))
}

/** Move to the next phase based on what just completed. Resets timer state. */
export function advancePhase(p: PomodoroPersist): PomodoroPersist {
  if (p.phase === 'focus') {
    const completed = p.completed + 1
    const shouldLong = completed % p.longEvery === 0
    const nextPhase: PomodoroPhase = shouldLong ? 'longBreak' : 'shortBreak'
    const nextMin = shouldLong ? p.longBreakMin : p.shortBreakMin
    return {
      ...p,
      phase: nextPhase,
      completed,
      remainingMs: nextMin * 60_000,
      running: p.autoStartBreak,
      runStartedAt: p.autoStartBreak ? Date.now() : null,
    }
  }
  return {
    ...p,
    phase: 'focus',
    remainingMs: p.focusMin * 60_000,
    running: p.autoStartFocus,
    runStartedAt: p.autoStartFocus ? Date.now() : null,
  }
}

/** Live ms remaining without mutating state. */
export function pomodoroRemainingMs(p: PomodoroPersist): number {
  if (p.running && p.runStartedAt != null) {
    return Math.max(0, p.remainingMs - (Date.now() - p.runStartedAt))
  }
  return p.remainingMs
}

/** Live elapsed ms for stopwatch. */
export function stopwatchElapsedMs(s: StopwatchPersist): number {
  return (
    s.baseMs + (s.running && s.runStartedAt != null ? Date.now() - s.runStartedAt : 0)
  )
}
