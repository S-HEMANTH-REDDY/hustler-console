import { useEffect, useMemo } from 'react'
import { PassionWorkspace } from '../components/PassionWorkspace'
import { useIntervalTick } from '../hooks/useIntervalTick'
import { cn } from '../lib/utils'
import { stopwatchElapsedMs, useTimerStore } from '../store/timerStore'

export function PassionPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PassionWorkspace />

      <StopwatchCard />
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
  useIntervalTick(sw.running ? 100 : 1000)
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
    <section className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">Stopwatch</h3>
          <p className="mt-0.5 text-xs text-zinc-500">
            Time individual problems · Space to start/pause
          </p>
        </div>
        <span
          className={cn(
            'rounded-full border px-2 py-0.5 text-xs',
            sw.running
              ? 'border-lime-400/50 bg-lime-500/10 text-lime-300'
              : 'border-edge text-zinc-500',
          )}
        >
          {sw.running ? 'Running' : sw.baseMs > 0 ? 'Paused' : 'Idle'}
        </span>
      </div>

      <div className="mt-4 flex items-baseline gap-1 font-mono tabular-nums">
        <span className="text-5xl font-semibold text-zinc-50">
          {formatStopwatch(elapsed)}
        </span>
        <span className="text-xl text-zinc-500">.{formatCentis(elapsed)}</span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {sw.running ? (
          <button
            type="button"
            onClick={swPause}
            className="rounded-lg border border-amber-400/50 bg-amber-500/15 px-4 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-500/20"
          >
            Pause
          </button>
        ) : (
          <button
            type="button"
            onClick={swStart}
            className="btn-primary rounded-lg px-4 py-2 text-sm"
          >
            {sw.baseMs > 0 ? 'Resume' : 'Start'}
          </button>
        )}
        <button
          type="button"
          onClick={swLap}
          disabled={!sw.running && sw.baseMs === 0}
          className="btn-quiet px-4 py-2"
        >
          Lap
        </button>
        <button
          type="button"
          onClick={swReset}
          disabled={sw.baseMs === 0 && !sw.running && sw.laps.length === 0}
          className="btn-quiet px-4 py-2"
        >
          Reset
        </button>
      </div>

      {sw.laps.length > 0 ? (
        <ol className="mt-4 max-h-56 overflow-y-auto rounded-lg border border-edge">
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
                className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-edge-soft px-3 py-2 last:border-b-0"
              >
                <span className="font-mono text-xs text-zinc-500">
                  Lap {sw.laps.length - idx}
                </span>
                <span className="font-mono text-sm tabular-nums text-zinc-100">
                  {formatStopwatch(lap.atMs)}.
                  <span className="text-zinc-500">{formatCentis(lap.atMs)}</span>
                </span>
                <span
                  className={cn(
                    'font-mono text-xs tabular-nums',
                    isFastest
                      ? 'text-lime-300'
                      : isSlowest
                        ? 'text-amber-300'
                        : 'text-zinc-500',
                  )}
                >
                  +{formatStopwatch(delta)}.{formatCentis(delta)}
                </span>
              </li>
            )
          })}
        </ol>
      ) : null}
    </section>
  )
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
