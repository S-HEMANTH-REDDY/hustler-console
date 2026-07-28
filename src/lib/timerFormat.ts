import type { PomodoroPhase } from '../store/timerStore'

export function phaseLabel(p: PomodoroPhase): string {
  switch (p) {
    case 'focus':
      return 'Focus'
    case 'shortBreak':
      return 'Short Break'
    case 'longBreak':
      return 'Long Break'
  }
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n))
  return `${pad(m)}:${pad(s)}`
}
