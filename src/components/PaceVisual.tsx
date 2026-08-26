import type { PaceComputation, PaceState } from '../lib/pace'
import { sweetSpot } from '../lib/pace'
import { cn } from '../lib/utils'

function stateColors(state: PaceState): {
  fill: string
  text: string
  bar: string
} {
  switch (state) {
    case 'idle':
      return {
        fill: '#71717a',
        text: 'text-zinc-400',
        bar: 'bg-zinc-600',
      }
    case 'onPace':
      return {
        fill: '#84cc16',
        text: 'text-lime-400',
        bar: 'bg-lime-400',
      }
    case 'behind':
      return {
        fill: '#f59e0b',
        text: 'text-amber-300',
        bar: 'bg-amber-400',
      }
    case 'pastMax':
      return {
        fill: '#dc2626',
        text: 'text-red-300',
        bar: 'bg-red-500',
      }
  }
}

export function PaceBar(props: {
  pace: PaceComputation
  dailyMin: number
  dailyMax: number
}) {
  const { pace, dailyMin, dailyMax } = props
  // Auto-extend scale if today's count exceeds max so the bar stays informative.
  const headroom = Math.max(dailyMax + 5, Math.ceil(pace.todayCount * 1.05))
  const scaleMax = headroom
  const idealStartPct = (dailyMin / scaleMax) * 100
  const idealEndPct = (dailyMax / scaleMax) * 100
  const sweet = sweetSpot(dailyMin, dailyMax)
  const sweetStartPct = (sweet.min / scaleMax) * 100
  const sweetEndPct = (sweet.max / scaleMax) * 100
  const actualPct = Math.min(100, (pace.todayCount / scaleMax) * 100)
  const nowPct = Math.min(100, (pace.expectedNow / scaleMax) * 100)
  const colors = stateColors(pace.state)

  // Tick marks at every 10
  const ticks: number[] = []
  for (let v = 10; v < scaleMax; v += 10) ticks.push(v)

  return (
    <div className="space-y-1.5">
      <div className="relative h-12 w-full overflow-hidden rounded-lg border border-edge bg-pit">
        {/* ideal band */}
        <div
          className="absolute inset-y-0 bg-lime-500/15"
          style={{
            left: `${idealStartPct}%`,
            width: `${Math.max(0, idealEndPct - idealStartPct)}%`,
          }}
        />
        {/* sweet spot (brighter band within the ideal band) */}
        <div
          className="absolute inset-y-0 bg-lime-400/30"
          style={{
            left: `${sweetStartPct}%`,
            width: `${Math.max(0, sweetEndPct - sweetStartPct)}%`,
          }}
          title={`Sweet spot ${sweet.min}–${sweet.max}`}
        />
        {/* tick marks */}
        {ticks.map((v) => (
          <div
            key={v}
            className="absolute top-0 h-2 w-px bg-edge-strong"
            style={{ left: `${(v / scaleMax) * 100}%` }}
          />
        ))}
        {ticks.map((v) => (
          <div
            key={`b-${v}`}
            className="absolute bottom-0 h-2 w-px bg-edge-strong"
            style={{ left: `${(v / scaleMax) * 100}%` }}
          />
        ))}
        {/* tick labels (sparse) */}
        {[dailyMin, dailyMax].map((v) => (
          <div
            key={`lab-${v}`}
            className="pointer-events-none absolute -bottom-0 z-10 -translate-x-1/2 font-mono text-[9px] text-zinc-400"
            style={{ left: `${(v / scaleMax) * 100}%`, top: 1 }}
          >
            {v}
          </div>
        ))}
        {/* actual fill */}
        <div
          className={cn('absolute inset-y-0 left-0 opacity-90', colors.bar)}
          style={{ width: `${actualPct}%` }}
        />
        {/* now marker */}
        <div
          className="absolute top-0 bottom-0 w-px bg-white/90"
          style={{ left: `${nowPct}%` }}
          title="Expected pace"
        />
        <div
          className="absolute -top-0.5 h-2 w-2 -translate-x-1/2 rotate-45 border border-white/80 bg-surface"
          style={{ left: `${nowPct}%` }}
        />
        {/* current count number floating on the bar */}
        <div
          className="pointer-events-none absolute top-1 -translate-x-1/2 rounded bg-base/80 px-1.5 font-mono text-xs text-zinc-200 ring-1 ring-edge"
          style={{ left: `${Math.min(100, Math.max(0, actualPct))}%` }}
        >
          {pace.todayCount}
        </div>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
        <span>
          Scale 0–{scaleMax} · Band{' '}
          <span className="font-medium text-lime-400/90">
            {dailyMin}–{dailyMax}
          </span>{' '}
          · Sweet spot{' '}
          <span className="font-medium text-lime-300">
            {sweet.min}–{sweet.max}
          </span>
        </span>
        <span>
          Expected{' '}
          <span className="font-medium text-zinc-300">{pace.expectedNow.toFixed(1)}</span>{' '}
          · Actual <span className={cn('font-medium', colors.text)}>{pace.todayCount}</span> · Δ{' '}
          <span className={cn('font-medium', colors.text)}>
            {pace.delta >= 0 ? '+' : ''}
            {pace.delta}
          </span>
        </span>
      </div>
    </div>
  )
}

export function PaceHeroNumber(props: { count: number; state: PaceState }) {
  const colors = stateColors(props.state)
  return (
    <div
      className="font-mono text-7xl font-semibold tabular-nums tracking-tighter sm:text-8xl"
      style={{
        fontFamily: 'var(--font-mono)',
        color: colors.fill,
        textShadow: `0 0 60px ${colors.fill}33`,
      }}
    >
      {props.count}
    </div>
  )
}
