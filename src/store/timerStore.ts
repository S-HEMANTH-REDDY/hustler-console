import { create } from 'zustand'

const STOPWATCH_KEY = 'hustler.stopwatch.v1'
const POMODORO_KEY = 'hustler.pomodoro.v1'
const THINK_KEY = 'hustler.thinkTimer.v1'

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

export interface PomodoroPersist {
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
  /** Task the user is focusing on (LifeTask id), if any. */
  taskId: string | null
  /** Phase that just finished, until the next start/reset. Drives the
      "Focus Complete!" tab title and in-app banner. */
  justCompleted: PomodoroPhase | null
  /** True once the user has ever interacted with this phase's countdown —
      distinguishes a fresh phase from a paused one for labels. */
  everStarted: boolean
}

export interface TimerPreset {
  id: string
  label: string
  hint: string
  focusMin: number
  shortBreakMin: number
  longBreakMin: number
  longEvery: number
}

export const TIMER_PRESETS: TimerPreset[] = [
  {
    id: 'pomodoro',
    label: 'Pomodoro',
    hint: '25 / 5',
    focusMin: 25,
    shortBreakMin: 5,
    longBreakMin: 15,
    longEvery: 4,
  },
  {
    id: 'deep',
    label: 'Deep Work',
    hint: '50 / 10',
    focusMin: 50,
    shortBreakMin: 10,
    longBreakMin: 20,
    longEvery: 3,
  },
  {
    id: 'sprint',
    label: 'Quick Sprint',
    hint: '15 / 5',
    focusMin: 15,
    shortBreakMin: 5,
    longBreakMin: 15,
    longEvery: 4,
  },
]

/** Which preset matches the current settings, or 'custom'. */
export function matchPreset(p: {
  focusMin: number
  shortBreakMin: number
  longBreakMin: number
  longEvery: number
}): string {
  const hit = TIMER_PRESETS.find(
    (t) =>
      t.focusMin === p.focusMin &&
      t.shortBreakMin === p.shortBreakMin &&
      t.longBreakMin === p.longBreakMin &&
      t.longEvery === p.longEvery,
  )
  return hit?.id ?? 'custom'
}

/**
 * Standalone countdown timer for "deep thinking" research sessions — sits
 * alongside the Pomodoro but with a longer default (45 min) and a notion of
 * which Passion idea it's currently bound to.
 */
export interface ThinkTimerPersist {
  running: boolean
  /** ms remaining at the time the run started/paused. */
  remainingMs: number
  /** Date.now() at last start, or null if paused. */
  runStartedAt: number | null
  /** Default & configured session length in minutes (1..240). */
  durationMin: number
  /** Which Passion idea is currently the focus of this session. */
  ideaId: string | null
  /** Date.now() of the most recently completed session (chime fired). */
  lastCompletedAt: number
  /** Total focused minutes accumulated across all completed sessions. */
  totalMinutes: number
  /** Count of completed sessions ever. */
  sessionsCompleted: number
}

interface TimerState {
  stopwatch: StopwatchPersist
  pomodoro: PomodoroPersist
  think: ThinkTimerPersist

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
  pomoApplyPreset: (presetId: string) => void
  pomoSetTask: (taskId: string | null) => void
  /** Called by the engine when a phase hits zero. */
  pomoAdvance: () => void

  thinkStart: () => void
  thinkPause: () => void
  thinkReset: () => void
  thinkSetDuration: (min: number) => void
  thinkSetIdea: (ideaId: string | null) => void
  /** Mark current session complete (called by UI when remaining hits 0). */
  thinkComplete: () => { idea: string | null; minutes: number }
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
    taskId: null,
    justCompleted: null,
    everStarted: false,
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

function defaultThink(): ThinkTimerPersist {
  return {
    running: false,
    remainingMs: 45 * 60_000,
    runStartedAt: null,
    durationMin: 45,
    ideaId: null,
    lastCompletedAt: 0,
    totalMinutes: 0,
    sessionsCompleted: 0,
  }
}

function loadThink(): ThinkTimerPersist {
  if (typeof window === 'undefined') return defaultThink()
  try {
    const raw = window.localStorage.getItem(THINK_KEY)
    if (!raw) return defaultThink()
    const parsed = JSON.parse(raw) as Partial<ThinkTimerPersist>
    return { ...defaultThink(), ...parsed }
  } catch {
    return defaultThink()
  }
}

function persistThink(t: ThinkTimerPersist) {
  try {
    window.localStorage.setItem(THINK_KEY, JSON.stringify(t))
  } catch {
    // ignore quota / private mode failures
  }
}

export const useTimerStore = create<TimerState>((set, get) => ({
  stopwatch: loadStopwatch(),
  pomodoro: loadPomodoro(),
  think: loadThink(),

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
      justCompleted: null,
      everStarted: true,
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
      justCompleted: null,
      everStarted: false,
    }
    persistPomodoro(next)
    set({ pomodoro: next })
  },
  pomoSkip: () => {
    const p = get().pomodoro
    const advanced = { ...advancePhase(p), justCompleted: null }
    persistPomodoro(advanced)
    set({ pomodoro: advanced })
  },
  pomoAdvance: () => {
    const p = get().pomodoro
    const advanced: PomodoroPersist = {
      ...advancePhase(p),
      justCompleted: p.phase,
    }
    persistPomodoro(advanced)
    set({ pomodoro: advanced })
  },
  pomoApplyPreset: (presetId) => {
    const preset = TIMER_PRESETS.find((t) => t.id === presetId)
    if (!preset) return
    const p = get().pomodoro
    const next: PomodoroPersist = {
      ...p,
      focusMin: preset.focusMin,
      shortBreakMin: preset.shortBreakMin,
      longBreakMin: preset.longBreakMin,
      longEvery: preset.longEvery,
      // Re-arm the current phase when idle so the change is visible.
      remainingMs: p.running
        ? p.remainingMs
        : (p.phase === 'focus'
            ? preset.focusMin
            : p.phase === 'shortBreak'
              ? preset.shortBreakMin
              : preset.longBreakMin) * 60_000,
      everStarted: p.running ? p.everStarted : false,
    }
    persistPomodoro(next)
    set({ pomodoro: next })
  },
  pomoSetTask: (taskId) => {
    const p = get().pomodoro
    if (p.taskId === taskId) return
    const next: PomodoroPersist = { ...p, taskId }
    persistPomodoro(next)
    set({ pomodoro: next })
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

  thinkStart: () => {
    const t = get().think
    if (t.running) return
    // If the previous session ran to completion, start fresh; otherwise resume.
    const remainingMs =
      t.remainingMs > 0 ? t.remainingMs : t.durationMin * 60_000
    const next: ThinkTimerPersist = {
      ...t,
      running: true,
      remainingMs,
      runStartedAt: Date.now(),
    }
    persistThink(next)
    set({ think: next })
  },
  thinkPause: () => {
    const t = get().think
    if (!t.running || t.runStartedAt == null) return
    const elapsed = Date.now() - t.runStartedAt
    const next: ThinkTimerPersist = {
      ...t,
      running: false,
      runStartedAt: null,
      remainingMs: Math.max(0, t.remainingMs - elapsed),
    }
    persistThink(next)
    set({ think: next })
  },
  thinkReset: () => {
    const t = get().think
    const next: ThinkTimerPersist = {
      ...t,
      running: false,
      runStartedAt: null,
      remainingMs: t.durationMin * 60_000,
    }
    persistThink(next)
    set({ think: next })
  },
  thinkSetDuration: (min) => {
    const t = get().think
    const durationMin = clamp(min, 1, 240)
    const next: ThinkTimerPersist = {
      ...t,
      durationMin,
      // Only re-arm the displayed remaining time when idle. Don't disturb an
      // in-flight countdown.
      remainingMs: t.running ? t.remainingMs : durationMin * 60_000,
    }
    persistThink(next)
    set({ think: next })
  },
  thinkSetIdea: (ideaId) => {
    const t = get().think
    if (t.ideaId === ideaId) return
    const next: ThinkTimerPersist = { ...t, ideaId }
    persistThink(next)
    set({ think: next })
  },
  thinkComplete: () => {
    const t = get().think
    const minutes = t.durationMin
    const next: ThinkTimerPersist = {
      ...t,
      running: false,
      runStartedAt: null,
      remainingMs: t.durationMin * 60_000,
      lastCompletedAt: Date.now(),
      totalMinutes: t.totalMinutes + minutes,
      sessionsCompleted: t.sessionsCompleted + 1,
    }
    persistThink(next)
    set({ think: next })
    return { idea: t.ideaId, minutes }
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
      everStarted: p.autoStartBreak,
    }
  }
  return {
    ...p,
    phase: 'focus',
    remainingMs: p.focusMin * 60_000,
    running: p.autoStartFocus,
    runStartedAt: p.autoStartFocus ? Date.now() : null,
    everStarted: p.autoStartFocus,
  }
}

/** Live ms remaining without mutating state. */
export function pomodoroRemainingMs(p: PomodoroPersist): number {
  if (p.running && p.runStartedAt != null) {
    return Math.max(0, p.remainingMs - (Date.now() - p.runStartedAt))
  }
  return p.remainingMs
}

/** Live ms remaining for the Think (research) timer. */
export function thinkRemainingMs(t: ThinkTimerPersist): number {
  if (t.running && t.runStartedAt != null) {
    return Math.max(0, t.remainingMs - (Date.now() - t.runStartedAt))
  }
  return t.remainingMs
}

/** Live elapsed ms for stopwatch. */
export function stopwatchElapsedMs(s: StopwatchPersist): number {
  return (
    s.baseMs + (s.running && s.runStartedAt != null ? Date.now() - s.runStartedAt : 0)
  )
}
