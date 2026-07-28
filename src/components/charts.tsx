import { cn } from '../lib/utils'

export function HeatStrip(props: {
  cells: { date: string; count: number }[]
  dailyMin: number
  dailyMax: number
}) {
  const { cells, dailyMin, dailyMax } = props
  const max = Math.max(dailyMax, ...cells.map((c) => c.count), 1)

  return (
    <div className="flex flex-wrap gap-1">
      {cells.map((c) => {
        let bg: string
        let border: string
        if (c.count === 0) {
          bg = 'var(--color-well)'
          border = '#1f1f24'
        } else if (c.count < dailyMin) {
          const t = c.count / Math.max(1, dailyMin)
          bg = `rgba(220, 38, 38, ${(0.2 + t * 0.5).toFixed(2)})`
          border = '#7f1d1d80'
        } else if (c.count <= dailyMax) {
          const t = (c.count - dailyMin) / Math.max(1, dailyMax - dailyMin)
          bg = `rgba(132, 204, 22, ${(0.45 + t * 0.5).toFixed(2)})`
          border = '#65a30d80'
        } else {
          const t = Math.min(1, (c.count - dailyMax) / Math.max(1, max - dailyMax))
          bg = `rgba(245, 158, 11, ${(0.55 + t * 0.4).toFixed(2)})`
          border = '#b4530980'
        }
        return (
          <div
            key={c.date}
            className="group relative h-4 w-4 shrink-0 rounded-sm"
            style={{ backgroundColor: bg, boxShadow: `inset 0 0 0 1px ${border}` }}
            title={`${c.date} · ${c.count}`}
          >
            <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded border border-edge bg-base px-2 py-1 font-mono text-xs text-zinc-200 shadow-lg group-hover:block">
              {c.date} · {c.count}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function HeatLegend(props: { dailyMin: number; dailyMax: number }) {
  return (
    <div className="flex items-center gap-3 font-mono text-xs text-zinc-400">
      <Swatch color="#20232c" border="#1f1f24" /> 0
      <Swatch color="rgba(220,38,38,0.55)" border="#7f1d1d80" /> &lt; {props.dailyMin}
      <Swatch color="rgba(132,204,22,0.7)" border="#65a30d80" />{' '}
      {props.dailyMin}–{props.dailyMax}
      <Swatch color="rgba(245,158,11,0.7)" border="#b4530980" /> &gt;{' '}
      {props.dailyMax}
    </div>
  )
}

function Swatch(props: { color: string; border: string }) {
  return (
    <span
      className="inline-block h-2.5 w-2.5 rounded-sm"
      style={{ backgroundColor: props.color, boxShadow: `inset 0 0 0 1px ${props.border}` }}
    />
  )
}

export interface MiniBarItem {
  key: string
  label: string
  count: number
  color?: string
  href?: string
}

export function MiniBars(props: {
  items: MiniBarItem[]
  emptyLabel?: string
  countWidth?: string
}) {
  const max = Math.max(1, ...props.items.map((i) => i.count))
  if (props.items.length === 0) {
    return (
      <p className="text-xs text-zinc-400">{props.emptyLabel ?? 'No data'}</p>
    )
  }
  return (
    <div className="space-y-1.5">
      {props.items.map((it) => (
        <div key={it.key} className="flex items-center gap-2 font-mono text-xs">
          <span className="w-20 shrink-0 truncate text-zinc-400">{it.label}</span>
          <div className="relative h-3 flex-1 overflow-hidden rounded-sm bg-surface-3">
            <div
              className="absolute inset-y-0 left-0 rounded-sm"
              style={{
                width: `${(it.count / max) * 100}%`,
                backgroundColor: it.color ?? '#84cc16',
                opacity: 0.85,
              }}
            />
          </div>
          <span
            className="shrink-0 text-right text-zinc-300 tabular-nums"
            style={{ width: props.countWidth ?? '2.25rem' }}
          >
            {it.count}
          </span>
        </div>
      ))}
    </div>
  )
}

export function Sparkline(props: {
  values: number[]
  width?: number
  height?: number
  color?: string
  fill?: string
}) {
  const w = props.width ?? 120
  const h = props.height ?? 28
  const max = Math.max(1, ...props.values)
  if (props.values.length === 0) {
    return <svg width={w} height={h} aria-hidden />
  }
  const stepX = props.values.length > 1 ? w / (props.values.length - 1) : 0
  const points = props.values.map((v, i) => {
    const x = i * stepX
    const y = h - (v / max) * (h - 2) - 1
    return `${x.toFixed(2)},${y.toFixed(2)}`
  })
  const linePath = `M ${points.join(' L ')}`
  const areaPath = `${linePath} L ${w},${h} L 0,${h} Z`
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <path d={areaPath} fill={props.fill ?? 'rgba(132,204,22,0.18)'} />
      <path
        d={linePath}
        fill="none"
        stroke={props.color ?? '#84cc16'}
        strokeWidth={1.25}
      />
    </svg>
  )
}

export function FunnelMini(props: {
  stages: { label: string; count: number; color: string }[]
}) {
  const max = Math.max(1, ...props.stages.map((s) => s.count))
  return (
    <div className="space-y-1.5">
      {props.stages.map((s, i) => {
        const next = props.stages[i + 1]
        const rate =
          next && s.count > 0
            ? `${Math.round((next.count / s.count) * 1000) / 10}%`
            : null
        const w = `${(s.count / max) * 100}%`
        return (
          <div key={s.label} className="space-y-0.5">
            <div className="flex items-center justify-between gap-2 font-mono text-xs text-zinc-400">
              <span className="uppercase tracking-wider">{s.label}</span>
              <span className="tabular-nums text-zinc-200">{s.count}</span>
            </div>
            <div className="relative h-2 overflow-hidden rounded-sm bg-surface-3">
              <div
                className="absolute inset-y-0 left-0 rounded-sm opacity-90"
                style={{ width: w, backgroundColor: s.color }}
              />
            </div>
            {rate ? (
              <div
                className={cn(
                  'pl-1 font-mono text-xs',
                  s.count > 0 ? 'text-zinc-400' : 'text-zinc-700',
                )}
              >
                ↳ {rate}
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
