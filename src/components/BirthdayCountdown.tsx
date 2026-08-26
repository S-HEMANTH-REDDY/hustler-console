import { useSecondsTick } from '../hooks/useIntervalTick'

const BIRTHDAY_MONTH = 10 // November (0-indexed)
const BIRTHDAY_DAY = 7

function getNextBirthday(now: Date): Date {
  const year = now.getFullYear()
  const thisYear = new Date(year, BIRTHDAY_MONTH, BIRTHDAY_DAY)
  if (now < thisYear) return thisYear
  return new Date(year + 1, BIRTHDAY_MONTH, BIRTHDAY_DAY)
}

function isBirthday(now: Date): boolean {
  return now.getMonth() === BIRTHDAY_MONTH && now.getDate() === BIRTHDAY_DAY
}

export function BirthdayCountdown() {
  const now = useSecondsTick()
  const birthday = isBirthday(now)

  if (birthday) {
    return (
      <div className="card overflow-hidden p-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden>🎂</span>
          <div>
            <p className="text-sm font-semibold text-zinc-100">Happy Birthday!</p>
            <p className="text-xs text-zinc-400">Make it count.</p>
          </div>
        </div>
      </div>
    )
  }

  const next = getNextBirthday(now)
  const diffMs = next.getTime() - now.getTime()
  const totalSeconds = Math.max(0, Math.floor(diffMs / 1000))
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return (
    <div className="card overflow-hidden p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="section-label">Next birthday</p>
        <p className="text-[0.625rem] text-zinc-600">Nov 7</p>
      </div>
      <div className="mt-2.5 grid grid-cols-4 gap-2">
        <Unit value={days} label="days" />
        <Unit value={hours} label="hrs" />
        <Unit value={minutes} label="min" />
        <Unit value={seconds} label="sec" />
      </div>
    </div>
  )
}

function Unit(props: { value: number; label: string }) {
  return (
    <div className="text-center">
      <span className="block font-mono text-lg font-semibold tabular-nums text-zinc-100">
        {String(props.value).padStart(2, '0')}
      </span>
      <span className="text-[0.5625rem] uppercase tracking-wider text-zinc-500">
        {props.label}
      </span>
    </div>
  )
}
