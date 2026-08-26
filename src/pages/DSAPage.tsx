import { addDays, format, startOfDay } from 'date-fns'
import { useMemo, type FormEvent, type KeyboardEvent } from 'react'
import {
  addDsaProblem,
  deleteDsaById,
  patchDsaFields,
} from '../cloud/mutations'
import { useDsaProblemsHybrid } from '../cloud/hybridData'
import type {
  DsaDifficulty,
  DsaProblem,
  DsaTopic,
} from '../db/types'
import { DSA_TOPICS } from '../lib/constants'
import { dayKey } from '../lib/dates'
import { newId } from '../lib/utils'
import { useUiStore } from '../store/uiStore'

const HEAT_DAYS = 91

export function DSAPage() {
  const problems = useDsaProblemsHybrid()
  const pushToast = useUiStore((s) => s.pushToast)

  const byDay = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of problems) {
      m.set(p.date, (m.get(p.date) ?? 0) + 1)
    }
    return m
  }, [problems])

  const totals = useMemo(() => {
    let e = 0,
      m = 0,
      h = 0
    for (const p of problems) {
      if (p.difficulty === 'easy') e++
      else if (p.difficulty === 'medium') m++
      else h++
    }
    return { e, m, h, total: problems.length }
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

  async function addProblem(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const title = String(fd.get('title') ?? '').trim()
    if (!title) {
      pushToast('info', 'Title required')
      return
    }
    const p: DsaProblem = {
      id: newId(),
      date: dayKey(),
      title,
      topic: (fd.get('topic') as DsaTopic) || 'Arrays',
      difficulty: (fd.get('difficulty') as DsaDifficulty) || 'medium',
      confidence: Number(fd.get('confidence')) as 1 | 2 | 3 | 4 | 5,
      minutes: Number(fd.get('minutes') ?? 0) || 0,
      createdAt: Date.now(),
    }
    await addDsaProblem(p)
    pushToast('save', 'Problem logged')
    e.currentTarget.reset()
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <section className="card p-4">
        <div className="section-label mb-3">
          13×7 heat · problems / day
        </div>
        <div
          className="grid w-max gap-1"
          style={{
            gridTemplateColumns: 'repeat(13, minmax(14px, 1fr))',
          }}
        >
          {heatCells.cells.map((c) => {
            const intensity =
              c.count === 0 ? 0 : 0.25 + (c.count / heatCells.max) * 0.75
            return (
              <div
                key={c.date}
                className="group relative h-4 rounded-sm border border-edge"
                style={{
                  backgroundColor:
                    c.count === 0
                      ? 'var(--color-surface-3)'
                      : `rgba(132, 204, 22, ${intensity.toFixed(2)})`,
                }}
                title={`${c.date}: ${c.count}`}
              >
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded border border-edge bg-pit px-2 py-1 text-xs text-zinc-200 group-hover:block">
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

      <section className="grid gap-3 sm:grid-cols-4">
        {[
          { k: 'total', v: totals.total },
          { k: 'easy', v: totals.e },
          { k: 'medium', v: totals.m },
          { k: 'hard', v: totals.h },
        ].map((x) => (
          <div key={x.k} className="card p-3">
            <div className="text-xs uppercase text-zinc-400">{x.k}</div>
            <div className="font-mono text-2xl text-zinc-100">{x.v}</div>
          </div>
        ))}
      </section>

      <section className="card p-4">
        <h2 className="section-label mb-3">Log problem</h2>
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
          <label className="col-span-2 block space-y-1">
            <span className="text-xs text-zinc-400">Title</span>
            <input name="title" className="field" required />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-zinc-400">Topic</span>
            <select name="topic" className="field">
              {DSA_TOPICS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-zinc-400">Difficulty</span>
            <select name="difficulty" className="field" defaultValue="medium">
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
            <input name="minutes" type="number" min={0} className="field" defaultValue={30} />
          </label>
          <div className="col-span-full flex justify-end">
            <button
              type="submit"
              className="btn-primary rounded-lg px-4 py-2 text-sm"
            >
              Add problem
            </button>
          </div>
        </form>
      </section>

      <div className="overflow-x-auto card">
        <table className="min-w-[900px] w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-edge bg-surface text-xs uppercase text-zinc-400">
              <th className="px-2 py-2">Date</th>
              <th className="px-2 py-2">Title</th>
              <th className="px-2 py-2">Topic</th>
              <th className="px-2 py-2">Diff</th>
              <th className="px-2 py-2">Conf</th>
              <th className="px-2 py-2">Min</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {problems
              .slice()
              .sort((a, b) => b.createdAt - a.createdAt)
              .map((p) => (
                <tr key={p.id} className="border-b border-edge/70 hover:bg-surface-3">
                  <td className="px-1 py-1 align-middle">
                    <input
                      type="date"
                      className="field font-mono text-xs"
                      value={p.date}
                      onChange={(e) => {
                        void patchDsaFields(p.id, { date: e.target.value })
                      }}
                    />
                  </td>
                  <td className="px-1 py-1 align-middle">
                    <input
                      className="field"
                      value={p.title}
                      onChange={(e) => {
                        void patchDsaFields(p.id, { title: e.target.value })
                      }}
                    />
                  </td>
                  <td className="px-1 py-1 align-middle">
                    <select
                      className="field text-xs"
                      value={p.topic}
                      onChange={(e) => {
                        void patchDsaFields(p.id, {
                          topic: e.target.value as DsaTopic,
                        })
                      }}
                    >
                      {DSA_TOPICS.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-1 py-1 align-middle">
                    <select
                      className="field text-xs"
                      value={p.difficulty}
                      onChange={(e) => {
                        void patchDsaFields(p.id, {
                          difficulty: e.target.value as DsaDifficulty,
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
                        void patchDsaFields(p.id, {
                          confidence: Number(e.target.value) as 1 | 2 | 3 | 4 | 5,
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
                        void patchDsaFields(p.id, {
                          minutes: Number(e.target.value) || 0,
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
                        void deleteDsaById(p.id)
                        pushToast('delete', 'Deleted')
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {problems.length === 0 ? (
          <div className="p-6 text-center text-zinc-400">No problems yet</div>
        ) : null}
      </div>
    </div>
  )
}
