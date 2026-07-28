import { useEffect, useState } from 'react'
import { usePassionScheduleHybrid } from '../cloud/hybridData'
import { persistPassionSchedule } from '../cloud/mutations'
import type { PassionScheduleDoc } from '../db/types'
import { cn, newId } from '../lib/utils'
import { useAuthStore } from '../store/authStore'

export function PassionScheduleSection() {
  const uid = useAuthStore((s) => s.user?.id ?? 'local')
  const schedule = usePassionScheduleHybrid()
  const [draft, setDraft] = useState<PassionScheduleDoc | null>(null)

  useEffect(() => {
    setDraft(null)
  }, [uid])

  useEffect(() => {
    if (!schedule) return
    setDraft((prev) => (prev === null ? schedule : prev))
  }, [schedule, uid])

  useEffect(() => {
    if (!draft) return
    const t = window.setTimeout(() => {
      void persistPassionSchedule(draft).catch(() => undefined)
    }, 650)
    return () => window.clearTimeout(t)
  }, [draft])

  if (!schedule) {
    return (
      <div className="relative mt-6 rounded-lg border border-edge bg-well/40 px-4 py-6 text-sm text-zinc-400">
        Loading schedule…
      </div>
    )
  }

  if (!draft) {
    return (
      <div className="relative mt-6 rounded-lg border border-edge bg-well/40 px-4 py-6 text-sm text-zinc-400">
        Preparing editor…
      </div>
    )
  }

  return (
    <div className="relative mt-6 space-y-8">
      <p className="text-xs text-zinc-400">
        Your timetables are private: each account only sees their own rows (
        stored per user when signed in). Others start with empty tables they can
        fill in.
      </p>

      <section>
        <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
          <h3
            className="font-mono text-xs uppercase tracking-wider text-zinc-400"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            Daily schedule
          </h3>
          <button
            type="button"
            onClick={() =>
              setDraft((d) =>
                !d
                  ? d
                  : {
                      ...d,
                      dailyRows: [
                        ...d.dailyRows,
                        {
                          id: newId(),
                          timeRange: '',
                          activity: '',
                          duration: '',
                        },
                      ],
                    },
              )
            }
            className="rounded border border-edge bg-surface px-2 py-1 font-mono text-[11px] text-zinc-300 hover:border-lime-500/40 hover:text-lime-200"
          >
            + Row
          </button>
        </div>
        <div className="overflow-x-auto rounded-lg border border-edge">
          <table className="w-full min-w-[520px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-edge bg-base font-mono uppercase tracking-wider text-zinc-500">
                <th className="px-2 py-2">Time</th>
                <th className="px-2 py-2">Activity</th>
                <th className="px-2 py-2">Duration</th>
                <th className="w-10 px-1 py-2" aria-hidden />
              </tr>
            </thead>
            <tbody>
              {draft.dailyRows.map((row) => (
                <tr key={row.id} className="border-b border-edge/60">
                  <td className="p-1 align-top">
                    <input
                      value={row.timeRange}
                      onChange={(e) => {
                        const v = e.target.value
                        setDraft((d) =>
                          !d
                            ? d
                            : {
                                ...d,
                                dailyRows: d.dailyRows.map((x) =>
                                  x.id === row.id
                                    ? { ...x, timeRange: v }
                                    : x,
                                ),
                              },
                        )
                      }}
                      placeholder="e.g. 6:00 AM – 7:00 AM"
                      className="field w-full font-mono text-[11px]"
                    />
                  </td>
                  <td className="p-1 align-top">
                    <input
                      value={row.activity}
                      onChange={(e) => {
                        const v = e.target.value
                        setDraft((d) =>
                          !d
                            ? d
                            : {
                                ...d,
                                dailyRows: d.dailyRows.map((x) =>
                                  x.id === row.id
                                    ? { ...x, activity: v }
                                    : x,
                                ),
                              },
                        )
                      }}
                      placeholder="Activity"
                      className="field w-full text-[11px]"
                    />
                  </td>
                  <td className="p-1 align-top">
                    <input
                      value={row.duration}
                      onChange={(e) => {
                        const v = e.target.value
                        setDraft((d) =>
                          !d
                            ? d
                            : {
                                ...d,
                                dailyRows: d.dailyRows.map((x) =>
                                  x.id === row.id
                                    ? { ...x, duration: v }
                                    : x,
                                ),
                              },
                        )
                      }}
                      placeholder="e.g. 1 HOUR"
                      className="field w-full font-mono text-[11px]"
                    />
                  </td>
                  <td className="p-1 align-top">
                    <button
                      type="button"
                      disabled={draft.dailyRows.length <= 1}
                      onClick={() =>
                        setDraft((d) =>
                          !d || d.dailyRows.length <= 1
                            ? d
                            : {
                                ...d,
                                dailyRows: d.dailyRows.filter(
                                  (x) => x.id !== row.id,
                                ),
                              },
                        )
                      }
                      className={cn(
                        'rounded border px-1.5 py-0.5 font-mono text-[10px]',
                        draft.dailyRows.length <= 1
                          ? 'cursor-not-allowed border-edge text-zinc-600'
                          : 'border-edge text-zinc-400 hover:border-red-900/60 hover:text-red-300',
                      )}
                      aria-label="Remove row"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
          <h3
            className="font-mono text-xs uppercase tracking-wider text-zinc-400"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            RA / weekend
          </h3>
          <button
            type="button"
            onClick={() =>
              setDraft((d) =>
                !d
                  ? d
                  : {
                      ...d,
                      weekendRows: [
                        ...d.weekendRows,
                        {
                          id: newId(),
                          day: '',
                          session: '',
                          duration: '',
                        },
                      ],
                    },
              )
            }
            className="rounded border border-edge bg-surface px-2 py-1 font-mono text-[11px] text-zinc-300 hover:border-lime-500/40 hover:text-lime-200"
          >
            + Row
          </button>
        </div>
        <div className="overflow-x-auto rounded-lg border border-edge">
          <table className="w-full min-w-[420px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-edge bg-base font-mono uppercase tracking-wider text-zinc-500">
                <th className="px-2 py-2">Day</th>
                <th className="px-2 py-2">Session</th>
                <th className="px-2 py-2">Duration</th>
                <th className="w-10 px-1 py-2" aria-hidden />
              </tr>
            </thead>
            <tbody>
              {draft.weekendRows.map((row) => (
                <tr key={row.id} className="border-b border-edge/60">
                  <td className="p-1 align-top">
                    <input
                      value={row.day}
                      onChange={(e) => {
                        const v = e.target.value
                        setDraft((d) =>
                          !d
                            ? d
                            : {
                                ...d,
                                weekendRows: d.weekendRows.map((x) =>
                                  x.id === row.id ? { ...x, day: v } : x,
                                ),
                              },
                        )
                      }}
                      placeholder="e.g. Friday"
                      className="field w-full text-[11px]"
                    />
                  </td>
                  <td className="p-1 align-top">
                    <input
                      value={row.session}
                      onChange={(e) => {
                        const v = e.target.value
                        setDraft((d) =>
                          !d
                            ? d
                            : {
                                ...d,
                                weekendRows: d.weekendRows.map((x) =>
                                  x.id === row.id
                                    ? { ...x, session: v }
                                    : x,
                                ),
                              },
                        )
                      }}
                      placeholder="e.g. Morning"
                      className="field w-full text-[11px]"
                    />
                  </td>
                  <td className="p-1 align-top">
                    <input
                      value={row.duration}
                      onChange={(e) => {
                        const v = e.target.value
                        setDraft((d) =>
                          !d
                            ? d
                            : {
                                ...d,
                                weekendRows: d.weekendRows.map((x) =>
                                  x.id === row.id
                                    ? { ...x, duration: v }
                                    : x,
                                ),
                              },
                        )
                      }}
                      placeholder="e.g. 2 HOURS"
                      className="field w-full font-mono text-[11px]"
                    />
                  </td>
                  <td className="p-1 align-top">
                    <button
                      type="button"
                      disabled={draft.weekendRows.length <= 1}
                      onClick={() =>
                        setDraft((d) =>
                          !d || d.weekendRows.length <= 1
                            ? d
                            : {
                                ...d,
                                weekendRows: d.weekendRows.filter(
                                  (x) => x.id !== row.id,
                                ),
                              },
                        )
                      }
                      className={cn(
                        'rounded border px-1.5 py-0.5 font-mono text-[10px]',
                        draft.weekendRows.length <= 1
                          ? 'cursor-not-allowed border-edge text-zinc-600'
                          : 'border-edge text-zinc-400 hover:border-red-900/60 hover:text-red-300',
                      )}
                      aria-label="Remove row"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
