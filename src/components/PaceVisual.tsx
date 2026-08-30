import type { PaceComputation, PaceState } from '../lib/pace'
import { sweetSpot } from '../lib/pace'
import { cn } from '../lib/utils'

function stateColors(state: PaceState): {
  fill: string
  text: string
  bar: string
  glow: string
} {
  switch (state) {
    case 'idle':
      return {
        fill: '#71717a',
        text: 'text-zinc-400',
        bar: 'bg-zinc-600',
        glow: '',
      }
    case 'onPace':
      return {
        fill: '#84cc16',
        text: 'text-lime-400',
        bar: 'bg-lime-400',
        glow: 'glow-lime',
      }
    case 'behind':
      return {
        fill: '#f59e0b',
        text: 'text-amber-300',
        bar: 'bg-amber-400',
        glow: 'glow-amber',
      }
    case 'pastMax':
      return {
        fill: '#dc2626',
        text: 'text-red-300',
        bar: 'bg-red-500',
        glow: '',
      }
  }
}

export function PaceBar(props: {
  pace: PaceComputation
  dailyMin: number
  dailyMax: number
}) {
  const { pace, dailyMin, dailyMax } = props
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

  const ticks: number[] = []
  for (let v = 10; v < scaleMax; v += 10) ticks.push(v)

  return (
    <div className="space-y-2">
      <div className="relative h-14 w-full overflow-hidden rounded-xl border border-edge bg-pit">
        {/* ideal band */}
        <div
          className="absolute inset-y-0 bg-lime-500/10"
          style={{
            left: `${idealStartPct}%`,
            width: `${Math.max(0, idealEndPct - idealStartPct)}%`,
          }}
        />
        {/* sweet spot */}
        <div
          className="absolute inset-y-0"
          style={{
            left: `${sweetStartPct}%`,
            width: `${Math.max(0, sweetEndPct - sweetStartPct)}%`,
            background: 'linear-gradient(180deg, rgba(132,204,22,0.2) 0%, rgba(132,204,22,0.1) 100%)',
          }}
          title={`Sweet spot ${sweet.min}–${sweet.max}`}
        />
        {/* tick marks */}
        {ticks.map((v) => (
          <div
            key={v}
            className="absolute top-0 h-2.5 w-px bg-edge-strong/60"
            style={{ left: `${(v / scaleMax) * 100}%` }}
          />
        ))}
        {ticks.map((v) => (
          <div
            key={`b-${v}`}
            className="absolute bottom-0 h-2.5 w-px bg-edge-strong/60"
            style={{ left: `${(v / scaleMax) * 100}%` }}
          />
        ))}
        {/* tick labels */}
        {[dailyMin, dailyMax].map((v) => (
          <div
            key={`lab-${v}`}
            className="pointer-events-none absolute z-10 -translate-x-1/2 font-mono text-[9px] text-zinc-500"
            style={{ left: `${(v / scaleMax) * 100}%`, top: 2 }}
          >
            {v}
          </div>
        ))}
        {/* actual fill with gradient */}
        <div
          className="absolute inset-y-0 left-0"
          style={{
            width: `${actualPct}%`,
            background: pace.state === 'onPace'
              ? 'linear-gradient(90deg, rgba(132,204,22,0.6) 0%, rgba(163,230,53,0.8) 100%)'
              : pace.state === 'behind'
                ? 'linear-gradient(90deg, rgba(245,158,11,0.6) 0%, rgba(245,158,11,0.8) 100%)'
                : pace.state === 'pastMax'
                  ? 'linear-gradient(90deg, rgba(220,38,38,0.6) 0%, rgba(220,38,38,0.8) 100%)'
                  : 'linear-gradient(90deg, rgba(113,113,122,0.4) 0%, rgba(113,113,122,0.6) 100%)',
          }}
        />
        {/* now marker with glow */}
        <div
          className="absolute top-0 bottom-0 w-px"
          style={{
            left: `${nowPct}%`,
            background: 'rgba(255,255,255,0.8)',
            boxShadow: '0 0 6px rgba(255,255,255,0.3)',
          }}
          title="Expected pace"
        />
        <div
          className="absolute -top-0.5 h-2.5 w-2.5 -translate-x-1/2 rotate-45 border border-white/80 bg-surface"
          style={{ left: `${nowPct}%` }}
        />
        {/* current count floating label */}
        <div
          className="pointer-events-none absolute top-1.5 -translate-x-1/2 rounded-lg bg-base/90 px-2 py-0.5 font-mono text-xs font-medium text-zinc-200 ring-1 ring-edge"
          style={{ left: `${Math.min(95, Math.max(5, actualPct))}%` }}
        >
          {pace.todayCount}
        </div>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-zinc-500">
        <span>
          Band{' '}
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
    <div className="orbit-frame" style={{ color: colors.fill }}>
      <span aria-hidden="true" className="orbit-ring orbit-ring-outer" />
      <span aria-hidden="true" className="orbit-ring orbit-ring-inner" />
      <span aria-hidden="true" className="orbit-node" />
      <div
        className={cn(
          'numeric-display relative px-3 text-8xl sm:text-9xl',
          colors.glow,
        )}
      >
        {props.count}
      </div>
    </div>
  )
}
