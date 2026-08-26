import { useSecondsTick } from '../hooks/useIntervalTick'

const BIRTHDAY_MONTH = 10
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
      <div className="card-glow relative overflow-hidden p-6">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, rgba(132,204,22,0.1) 0%, rgba(56,189,248,0.05) 50%, rgba(168,85,247,0.08) 100%)',
          }}
        />
        <div className="relative flex items-center gap-4">
          <span className="text-4xl" aria-hidden>🎂</span>
          <div>
            <p className="text-lg font-semibold text-zinc-50" style={{ fontFamily: 'var(--font-display)' }}>
              Happy Birthday!
            </p>
            <p className="mt-0.5 text-sm text-zinc-400">Make it count.</p>
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
    <div className="card relative overflow-hidden p-5">
      {/* Decorative gradient orb */}
      <div
        className="pointer-events-none absolute -bottom-8 -right-8 h-32 w-32 rounded-full animate-glow-pulse"
        style={{
          background: 'radial-gradient(circle, rgba(132,204,22,0.08) 0%, transparent 70%)',
        }}
      />
      <div
        className="pointer-events-none absolute -top-6 -left-6 h-24 w-24 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(56,189,248,0.05) 0%, transparent 70%)',
        }}
      />

      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <p className="section-label">Birthday</p>
          <p className="text-xs text-zinc-600">Nov 7</p>
        </div>
        <div className="mt-4 grid grid-cols-4 gap-3">
          <Unit value={days} label="days" />
          <Unit value={hours} label="hrs" />
          <Unit value={minutes} label="min" />
          <Unit value={seconds} label="sec" />
        </div>
      </div>
    </div>
  )
}

function Unit(props: { value: number; label: string }) {
  return (
    <div className="text-center">
      <span
        className="block text-2xl font-bold tabular-nums text-zinc-100"
        style={{
          fontFamily: 'var(--font-display)',
          textShadow: '0 0 20px rgba(132,204,22,0.15)',
        }}
      >
        {String(props.value).padStart(2, '0')}
      </span>
      <span className="mt-1 block text-[0.5625rem] font-medium uppercase tracking-widest text-zinc-500">
        {props.label}
      </span>
    </div>
  )
}
