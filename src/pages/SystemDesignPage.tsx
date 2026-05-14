import { addDays, format, startOfDay } from 'date-fns'
import {
  useMemo,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import {
  addSystemDesign,
  deleteSystemDesignById,
  patchSystemDesignFields,
} from '../cloud/mutations'
import { useSystemDesignHybrid } from '../cloud/hybridData'
import type {
  SystemDesignDifficulty,
  SystemDesignKind,
  SystemDesignProblem,
  SystemDesignTopic,
} from '../db/types'
import {
  SD_HLD_TOPICS,
  SD_LLD_TOPICS,
  SD_KIND_LABEL,
  sdTopicsFor,
} from '../lib/constants'
import { dayKey } from '../lib/dates'
import { cn, newId } from '../lib/utils'
import { useUiStore } from '../store/uiStore'

const HEAT_DAYS = 91

type KindFilter = 'all' | SystemDesignKind

export function SystemDesignPage() {
  const problems = useSystemDesignHybrid()
  const pushToast = useUiStore((s) => s.pushToast)
  const [filter, setFilter] = useState<KindFilter>('all')
  const [formKind, setFormKind] = useState<SystemDesignKind>('hld')

  const visible = useMemo(() => {
    if (filter === 'all') return problems
    return problems.filter((p) => (p.kind ?? 'hld') === filter)
  }, [problems, filter])

  const byDay = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of visible) m.set(p.date, (m.get(p.date) ?? 0) + 1)
    return m
  }, [visible])

  const totals = useMemo(() => {
    let e = 0,
      m = 0,
      h = 0,
      hld = 0,
      lld = 0
    for (const p of problems) {
      if (p.difficulty === 'easy') e++
      else if (p.difficulty === 'medium') m++
      else h++
      if ((p.kind ?? 'hld') === 'hld') hld++
      else lld++
    }
    return { e, m, h, hld, lld, total: problems.length }
  }, [problems])

  const heatCells = useMemo(() => {
    const now = new Date()
    const start = startOfDay(addDays(now, -HEAT_DAYS + 1))
    const cells: { date: string; count: number }[] = []
    for (let i = 0; i < HEAT_DAYS; i++) {
      const d = addDays(start, i)
      const key = format(d, 'yyyy-MM-dd')
      cells.push({ date: key, count: byDay.get(key) ?? 0 })
    }
    const max = Math.max(1, ...cells.map((c) => c.count))
    return { cells, max }
  }, [byDay])

  const hldCoverage = useMemo(
    () =>
      SD_HLD_TOPICS.map((t) => ({
        topic: t,
        count: problems.filter(
          (p) => (p.kind ?? 'hld') === 'hld' && p.topic === t,
        ).length,
      })),
    [problems],
  )

  const lldCoverage = useMemo(
    () =>
      SD_LLD_TOPICS.map((t) => ({
        topic: t,
        count: problems.filter((p) => p.kind === 'lld' && p.topic === t).length,
      })),
    [problems],
  )

  const hldGaps = hldCoverage.filter((c) => c.count === 0).length
  const lldGaps = lldCoverage.filter((c) => c.count === 0).length

  async function addProblem(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const title = String(fd.get('title') ?? '').trim()
    if (!title) {
      pushToast('info', 'Title required')
      return
    }
    const kind = (fd.get('kind') as SystemDesignKind) || formKind
    const allowed = sdTopicsFor(kind)
    const topicRaw = String(fd.get('topic') ?? '')
    const topic = (
      allowed.includes(topicRaw as SystemDesignTopic)
        ? (topicRaw as SystemDesignTopic)
        : allowed[0]
    ) as SystemDesignTopic
    const p: SystemDesignProblem = {
      id: newId(),
      date: dayKey(),
      title,
      kind,
      topic,
      difficulty:
        (fd.get('difficulty') as SystemDesignDifficulty) || 'medium',
      confidence: Number(fd.get('confidence')) as 1 | 2 | 3 | 4 | 5,
      minutes: Number(fd.get('minutes') ?? 0) || 0,
      notes: String(fd.get('notes') ?? '').trim(),
      createdAt: Date.now(),
    }
    await addSystemDesign(p)
    pushToast(
      'save',
      kind === 'hld' ? 'HLD problem logged' : 'LLD problem logged',
    )
    e.currentTarget.reset()
    setFormKind(kind)
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1
            className="text-xl font-semibold text-zinc-50"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            System Design
          </h1>
          <p className="text-sm text-zinc-400">
            HLD + LLD volume · 91-day matrix · topic coverage per kind
          </p>
        </div>
        <KindFilterTabs value={filter} onChange={setFilter} />
      </div>

      <section className="rounded border border-[#3d4150] bg-[#262934] p-4">
        <div className="mb-3 flex items-center justify-between text-xs font-mono uppercase text-zinc-400">
          <span>
            13×7 heat ·{' '}
            {filter === 'all'
              ? 'all problems'
              : filter === 'hld'
                ? 'HLD only'
                : 'LLD only'}
          </span>
          <span>
            {totals.hld} HLD · {totals.lld} LLD
          </span>
        </div>
        <div
          className="grid w-max gap-1"
          style={{ gridTemplateColumns: 'repeat(13, minmax(14px, 1fr))' }}
        >
          {heatCells.cells.map((c) => {
            const intensity =
              c.count === 0 ? 0 : 0.25 + (c.count / heatCells.max) * 0.75
            return (
              <div
                key={c.date}
                className="group relative h-4 rounded-sm border border-[#3d4150]"
                style={{
                  backgroundColor:
                    c.count === 0
                      ? '#262934'
                      : `rgba(132, 204, 22, ${intensity.toFixed(2)})`,
                }}
                title={`${c.date}: ${c.count}`}
              >
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded border border-[#3d4150] bg-[#1c1f27] px-2 py-1 text-xs text-zinc-200 group-hover:block">
                  {c.date} · {c.count} problems
                </div>
              </div>
            )
          })}
        </div>
        <p className="mt-2 text-xs text-zinc-400">
          13-week columns × 7 weekday rows · older left, newer right.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { k: 'total', v: totals.total },
          { k: 'HLD', v: totals.hld, accent: 'text-lime-300' },
          { k: 'LLD', v: totals.lld, accent: 'text-cyan-300' },
          { k: 'easy', v: totals.e },
          { k: 'medium', v: totals.m },
          { k: 'hard', v: totals.h },
        ].map((x) => (
          <div
            key={x.k}
            className="rounded border border-[#3d4150] bg-[#262934] p-3"
          >
            <div className="text-xs uppercase text-zinc-400">{x.k}</div>
            <div
              className={cn(
                'font-mono text-2xl text-zinc-100',
                x.accent,
              )}
            >
              {x.v}
            </div>
          </div>
        ))}
      </section>

      <CoverageSection
        title="HLD topic coverage"
        subtitle={`${SD_HLD_TOPICS.length - hldGaps}/${SD_HLD_TOPICS.length} touched`}
        accentText="text-lime-300"
        coverage={hldCoverage}
      />

      <CoverageSection
        title="LLD topic coverage"
        subtitle={`${SD_LLD_TOPICS.length - lldGaps}/${SD_LLD_TOPICS.length} touched`}
        accentText="text-cyan-300"
        coverage={lldCoverage}
      />

      <section className="rounded border border-[#3d4150] bg-[#262934]/80 p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-200">
          Log system-design problem
        </h2>
        <form
          className="grid gap-3 md:grid-cols-3 lg:grid-cols-6"
          onSubmit={addProblem}
          onKeyDown={(e: KeyboardEvent<HTMLFormElement>) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              e.currentTarget.requestSubmit()
            }
          }}
        >
          <label className="block space-y-1">
            <span className="text-xs text-zinc-400">Kind</span>
            <select
              name="kind"
              className="field"
              value={formKind}
              onChange={(e) =>
                setFormKind(e.target.value as SystemDesignKind)
              }
            >
              <option value="hld">{SD_KIND_LABEL.hld}</option>
              <option value="lld">{SD_KIND_LABEL.lld}</option>
            </select>
          </label>
          <label className="col-span-2 block space-y-1">
            <span className="text-xs text-zinc-400">Title</span>
            <input name="title" className="field" required />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-zinc-400">Topic</span>
            <select name="topic" className="field" key={formKind}>
              {sdTopicsFor(formKind).map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-zinc-400">Difficulty</span>
            <select
              name="difficulty"
              className="field"
              defaultValue="medium"
            >
              <option value="easy">easy</option>
              <option value="medium">medium</option>
              <option value="hard">hard</option>
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-zinc-400">Confidence 1–5</span>
            <select name="confidence" className="field" defaultValue="3">
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-zinc-400">Minutes</span>
            <input
              name="minutes"
              type="number"
              min={0}
              className="field"
              defaultValue={formKind === 'lld' ? 30 : 45}
            />
          </label>
          <label className="col-span-full block space-y-1">
            <span className="text-xs text-zinc-400">Notes</span>
            <textarea
              name="notes"
              className="field min-h-[60px] resize-y font-mono text-xs"
              placeholder={
                formKind === 'lld'
                  ? 'classes, relationships, design patterns…'
                  : 'key trade-offs, datastores, capacity, sketches…'
              }
            />
          </label>
          <div className="col-span-full flex justify-end">
            <button
              type="submit"
              className="rounded bg-lime-500 px-4 py-2 text-sm font-semibold text-zinc-950"
            >
              Add {formKind === 'lld' ? 'LLD' : 'HLD'} problem
            </button>
          </div>
        </form>
      </section>

      <div className="overflow-x-auto rounded border border-[#3d4150]">
        <table className="min-w-[960px] w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[#3d4150] bg-[#262934] text-xs uppercase text-zinc-400">
              <th className="px-2 py-2">Date</th>
              <th className="px-2 py-2">Kind</th>
              <th className="px-2 py-2">Title</th>
              <th className="px-2 py-2">Topic</th>
              <th className="px-2 py-2">Diff</th>
              <th className="px-2 py-2">Conf</th>
              <th className="px-2 py-2">Min</th>
              <th className="px-2 py-2">Notes</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {visible
              .slice()
              .sort((a, b) => b.createdAt - a.createdAt)
              .map((p) => {
                const kind = (p.kind ?? 'hld') as SystemDesignKind
                const topicOptions = sdTopicsFor(kind)
                return (
                  <tr
                    key={p.id}
                    className="border-b border-[#3d4150]/70 hover:bg-[#323540]"
                  >
                    <td className="px-1 py-1 align-middle">
                      <input
                        type="date"
                        className="field font-mono text-xs"
                        value={p.date}
                        onChange={(e) => {
                          void patchSystemDesignFields(p.id, {
                            date: e.target.value,
                          })
                        }}
                      />
                    </td>
                    <td className="px-1 py-1 align-middle">
                      <select
                        className="field text-xs"
                        value={kind}
                        onChange={(e) => {
                          const next = e.target
                            .value as SystemDesignKind
                          const opts = sdTopicsFor(next)
                          void patchSystemDesignFields(p.id, {
                            kind: next,
                            topic: opts.includes(p.topic)
                              ? p.topic
                              : opts[0],
                          })
                        }}
                      >
                        <option value="hld">HLD</option>
                        <option value="lld">LLD</option>
                      </select>
                    </td>
                    <td className="px-1 py-1 align-middle">
                      <input
                        className="field"
                        value={p.title}
                        onChange={(e) => {
                          void patchSystemDesignFields(p.id, {
                            title: e.target.value,
                          })
                        }}
                      />
                    </td>
                    <td className="px-1 py-1 align-middle">
                      <select
                        className="field text-xs"
                        value={p.topic}
                        onChange={(e) => {
                          void patchSystemDesignFields(p.id, {
                            topic: e.target.value as SystemDesignTopic,
                          })
                        }}
                      >
                        {topicOptions.map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-1 py-1 align-middle">
                      <select
                        className="field text-xs"
                        value={p.difficulty}
                        onChange={(e) => {
                          void patchSystemDesignFields(p.id, {
                            difficulty: e.target
                              .value as SystemDesignDifficulty,
                          })
                        }}
                      >
                        <option value="easy">easy</option>
                        <option value="medium">medium</option>
                        <option value="hard">hard</option>
                      </select>
                    </td>
                    <td className="px-1 py-1 align-middle">
                      <select
                        className="field text-xs"
                        value={p.confidence}
                        onChange={(e) => {
                          void patchSystemDesignFields(p.id, {
                            confidence: Number(e.target.value) as
                              | 1
                              | 2
                              | 3
                              | 4
                              | 5,
                          })
                        }}
                      >
                        {[1, 2, 3, 4, 5].map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-1 py-1 align-middle">
                      <input
                        type="number"
                        min={0}
                        className="field font-mono text-xs"
                        value={p.minutes}
                        onChange={(e) => {
                          void patchSystemDesignFields(p.id, {
                            minutes: Number(e.target.value) || 0,
                          })
                        }}
                      />
                    </td>
                    <td className="px-1 py-1 align-middle">
                      <input
                        className="field font-mono text-xs"
                        value={p.notes}
                        onChange={(e) => {
                          void patchSystemDesignFields(p.id, {
                            notes: e.target.value,
                          })
                        }}
                      />
                    </td>
                    <td className="px-1 py-1 align-middle text-right">
                      <button
                        type="button"
                        className="rounded border border-red-900/60 px-2 py-1 text-xs text-red-300"
                        onClick={() => {
                          if (!window.confirm('Delete this problem?')) return
                          void deleteSystemDesignById(p.id)
                          pushToast('delete', 'Deleted')
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                )
              })}
          </tbody>
        </table>
        {visible.length === 0 ? (
          <div className="p-6 text-center text-zinc-400">
            {filter === 'all'
              ? 'No problems yet · log your first one above'
              : `No ${filter.toUpperCase()} problems yet · pick ${filter.toUpperCase()} above and log one`}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function KindFilterTabs(props: {
  value: KindFilter
  onChange: (v: KindFilter) => void
}) {
  const opts: { id: KindFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'hld', label: 'HLD' },
    { id: 'lld', label: 'LLD' },
  ]
  return (
    <div
      role="tablist"
      aria-label="Filter by kind"
      className="inline-flex overflow-hidden rounded-md border border-[#3d4150] bg-[#1c1f27] p-0.5"
    >
      {opts.map((o) => {
        const active = props.value === o.id
        return (
          <button
            key={o.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => props.onChange(o.id)}
            className={cn(
              'rounded px-3 py-1.5 text-xs font-medium font-mono uppercase tracking-wider transition-colors',
              active
                ? 'bg-[#3d4150] text-zinc-50'
                : 'text-zinc-400 hover:text-zinc-200',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function CoverageSection(props: {
  title: string
  subtitle: string
  accentText: string
  coverage: { topic: string; count: number }[]
}) {
  return (
    <section className="rounded border border-[#3d4150] bg-[#262934] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-mono uppercase tracking-wider text-zinc-400">
          {props.title}
        </h2>
        <span
          className={cn(
            'font-mono text-xs tracking-wider',
            props.accentText,
          )}
        >
          {props.subtitle}
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {props.coverage.map((t) => (
          <div
            key={t.topic}
            className={
              t.count === 0
                ? 'rounded border border-amber-700/40 bg-amber-950/20 px-3 py-2'
                : 'rounded border border-[#3d4150] bg-[#1c1f27] px-3 py-2'
            }
          >
            <div className="font-mono text-xs uppercase tracking-wider text-zinc-400">
              {t.topic}
            </div>
            <div
              className={
                t.count === 0
                  ? 'font-mono text-base text-amber-300'
                  : 'font-mono text-base text-zinc-100'
              }
            >
              {t.count}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
