import { Fragment, useMemo, useRef, useState } from 'react'
import {
  deleteApplicationAndResume,
  patchApplicationFields,
} from '../cloud/mutations'
import {
  useApplicationsHybrid,
  useResumeFilesHybrid,
} from '../cloud/hybridData'
import { LocalDataImportBanner } from '../components/CloudImportPrompt'
import { QuickApplicationForm } from '../components/QuickApplicationForm'
import type {
  Application,
  ApplicationSource,
  ApplicationStatus,
  ResumeAttachment,
  TaskPriority,
} from '../db/types'
import {
  APPLICATION_SOURCES,
  APPLICATION_STATUSES,
  FUNNEL_STATUSES,
  statusPillClass,
} from '../lib/constants'
import {
  detachResume,
  downloadResume,
  humanBytes,
  openResumeInNewTab,
  replaceResume,
  RESUME_ACCEPT,
} from '../lib/resume'
import { cn } from '../lib/utils'
import { useUiStore } from '../store/uiStore'
import { ResumeInlinePreview } from '../components/ResumePreview'

const EMPTY_APPS: Application[] = []

export function ApplicationsPage() {
  const raw = useApplicationsHybrid('byCreated')
  const resumeRows = useResumeFilesHybrid()
  const resumeIndex = useMemo(() => {
    const m = new Map<string, ResumeAttachment>()
    for (const r of resumeRows) m.set(r.id, r)
    return m
  }, [resumeRows])
  const rows = raw.length ? raw : EMPTY_APPS
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all'>(
    'all',
  )
  const [fileFilter, setFileFilter] = useState<'all' | 'with' | 'without'>(
    'all',
  )
  const [previewRow, setPreviewRow] = useState<string | null>(null)
  const pushToast = useUiStore((s) => s.pushToast)

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase()
    return rows.filter((r) => {
      const okStatus = statusFilter === 'all' || r.status === statusFilter
      const okFile =
        fileFilter === 'all'
          ? true
          : fileFilter === 'with'
            ? Boolean(r.resumeFileId)
            : !r.resumeFileId
      const okQ =
        !qq ||
        r.company.toLowerCase().includes(qq) ||
        r.role.toLowerCase().includes(qq) ||
        (r.resumeFileId
          ? (resumeIndex.get(r.resumeFileId)?.fileName ?? '')
              .toLowerCase()
              .includes(qq)
          : false)
      return okStatus && okQ && okFile
    })
  }, [rows, q, statusFilter, fileFilter, resumeIndex])

  const attachedCount = useMemo(
    () => rows.filter((r) => Boolean(r.resumeFileId)).length,
    [rows],
  )

  const funnel = useMemo(() => {
    const by: Record<string, number> = {}
    for (const s of APPLICATION_STATUSES) by[s] = 0
    for (const r of rows) by[r.status] = (by[r.status] ?? 0) + 1
    const funnelCounts = FUNNEL_STATUSES.map((s) => ({ stage: s, n: by[s] ?? 0 }))
    const pairs: { from: string; to: string; rate: string }[] = []
    for (let i = 0; i < funnelCounts.length - 1; i++) {
      const a = funnelCounts[i].n
      const b = funnelCounts[i + 1].n
      const rate = a === 0 ? '—' : `${Math.round((b / a) * 1000) / 10}%`
      pairs.push({
        from: funnelCounts[i].stage,
        to: funnelCounts[i + 1].stage,
        rate,
      })
    }
    return { funnelCounts, pairs, rejected: by['Rejected'] ?? 0, ghosted: by['Ghosted'] ?? 0 }
  }, [rows])

  async function patch(id: string, partial: Partial<Application>) {
    await patchApplicationFields(id, partial)
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this application row?')) return
    await deleteApplicationAndResume(id)
    pushToast('delete', 'Deleted')
  }

  async function onPickFile(appId: string, file: File | null) {
    if (!file) return
    try {
      await replaceResume(appId, file)
      pushToast('save', `Attached ${file.name}`)
    } catch (err) {
      pushToast(
        'info',
        err instanceof Error ? err.message : 'Resume attach failed',
      )
    }
  }

  async function onDetach(appId: string) {
    if (!window.confirm('Remove the attached resume file?')) return
    await detachResume(appId)
    pushToast('delete', 'File detached')
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 animate-fade-in">
      <LocalDataImportBanner />
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <input
            className="field sm:w-64"
            placeholder="Search company / role / file"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className="field sm:w-40"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as ApplicationStatus | 'all')
            }
          >
            <option value="all">All statuses</option>
            {APPLICATION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            className="field sm:w-40"
            value={fileFilter}
            onChange={(e) =>
              setFileFilter(e.target.value as 'all' | 'with' | 'without')
            }
            title="Filter by resume file"
          >
            <option value="all">Any file</option>
            <option value="with">With file ({attachedCount})</option>
            <option value="without">No file</option>
          </select>
        </div>
      </div>


      <QuickApplicationForm />

      <section className="card p-5">
        <h2 className="text-base font-semibold text-zinc-100 mb-3">
          Funnel · Applied → Offer
        </h2>
        <div className="flex flex-wrap gap-3">
          {funnel.funnelCounts.map((s, i) => (
            <div
              key={s.stage}
              className="flex items-center gap-2 font-mono text-sm"
            >
              <span
                className={cn(
                  'rounded-xl border px-2 py-0.5 text-xs',
                  statusPillClass(s.stage as ApplicationStatus),
                )}
              >
                {s.stage}
              </span>
              <span className="text-zinc-200">{s.n}</span>
              {i < funnel.funnelCounts.length - 1 ? (
                <span className="text-zinc-400">→</span>
              ) : null}
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-2.5 font-mono text-xs text-zinc-400 sm:grid-cols-2 lg:grid-cols-4">
          {funnel.pairs.map((p) => (
            <div key={p.from + p.to} className="rounded-xl border border-edge p-2">
              {p.from}→{p.to}: <span className="text-lime-300">{p.rate}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-6 text-sm font-mono text-zinc-400">
          <span>
            Rejected: <span className="text-red-300">{funnel.rejected}</span>
          </span>
          <span>
            Ghosted: <span className="text-zinc-400">{funnel.ghosted}</span>
          </span>
        </div>
      </section>

      <div className="overflow-x-auto card">
        <table className="min-w-[960px] w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-edge bg-surface text-xs uppercase text-zinc-400">
              <th className="px-2 py-2">Date</th>
              <th className="px-2 py-2">Company</th>
              <th className="px-2 py-2">Role</th>
              <th className="px-2 py-2">Source</th>
              <th className="px-2 py-2">Resume</th>
              <th className="px-2 py-2">File</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2">Pri</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const att = r.resumeFileId
                ? resumeIndex.get(r.resumeFileId) ?? null
                : null
              const isPreview = previewRow === r.id
              return (
              <Fragment key={r.id}>
              <tr className="border-b border-edge/80 hover:bg-surface-2/30">
                <td className="px-1 py-1 align-middle">
                  <input
                    type="date"
                    className="field font-mono text-xs"
                    value={r.date}
                    onChange={(e) => patch(r.id, { date: e.target.value })}
                  />
                </td>
                <td className="px-1 py-1 align-middle">
                  <input
                    className="field"
                    value={r.company}
                    onChange={(e) => patch(r.id, { company: e.target.value })}
                  />
                </td>
                <td className="px-1 py-1 align-middle">
                  <input
                    className="field"
                    value={r.role}
                    onChange={(e) => patch(r.id, { role: e.target.value })}
                  />
                </td>
                <td className="px-1 py-1 align-middle">
                  <select
                    className="field"
                    value={r.source}
                    onChange={(e) =>
                      patch(r.id, { source: e.target.value as ApplicationSource })
                    }
                  >
                    {APPLICATION_SOURCES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-1 py-1 align-middle">
                  <input
                    className="field font-mono text-xs"
                    value={r.resumeVersion}
                    onChange={(e) =>
                      patch(r.id, { resumeVersion: e.target.value })
                    }
                  />
                </td>
                <td className="px-1 py-1 align-middle">
                  <ResumeFileCell
                    appId={r.id}
                    file={att}
                    expanded={isPreview}
                    onTogglePreview={() =>
                      setPreviewRow((p) => (p === r.id ? null : r.id))
                    }
                    onPick={(f) => onPickFile(r.id, f)}
                    onDetach={() => onDetach(r.id)}
                  />
                </td>
                <td className="px-1 py-1 align-middle">
                  <select
                    className={cn(
                      'field text-xs',
                      statusPillClass(r.status),
                    )}
                    value={r.status}
                    onChange={(e) =>
                      patch(r.id, { status: e.target.value as ApplicationStatus })
                    }
                  >
                    {APPLICATION_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-1 py-1 align-middle">
                  <select
                    className="field text-xs"
                    value={r.priority}
                    onChange={(e) =>
                      patch(r.id, { priority: e.target.value as TaskPriority })
                    }
                  >
                    <option value="low">low</option>
                    <option value="mid">mid</option>
                    <option value="high">high</option>
                  </select>
                </td>
                <td className="px-1 py-1 align-middle text-right">
                  <button
                    type="button"
                    className="rounded-xl border border-red-900/60 px-2 py-1 text-xs text-red-300 hover:bg-red-950/40"
                    onClick={() => remove(r.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
              {att && isPreview ? (
                <tr className="border-b border-edge/80 bg-well">
                  <td colSpan={9} className="px-3 py-3">
                    <ResumeInlinePreview attachment={att} height={420} />
                  </td>
                </tr>
              ) : null}
              </Fragment>
            )})}
          </tbody>
        </table>
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-zinc-400">No rows found</div>
        ) : null}
      </div>
    </div>
  )
}

function ResumeFileCell(props: {
  appId: string
  file: ResumeAttachment | null
  expanded: boolean
  onTogglePreview: () => void
  onPick: (file: File | null) => void
  onDetach: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  if (!props.file) {
    return (
      <label className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-edge bg-well px-2 py-1 text-xs text-zinc-400 hover:border-lime-500/40 hover:text-lime-300">
        <PaperclipIcon />
        <span>Attach…</span>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={RESUME_ACCEPT}
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null
            props.onPick(f)
            if (inputRef.current) inputRef.current.value = ''
          }}
        />
      </label>
    )
  }
  const f = props.file
  return (
    <div className="flex flex-wrap items-center gap-1">
      <button
        type="button"
        onClick={props.onTogglePreview}
        aria-expanded={props.expanded}
        className={cn(
          'inline-flex max-w-[180px] items-center gap-1 truncate rounded-xl border px-2 py-1 text-xs transition-colors',
          props.expanded
            ? 'border-lime-500/60 bg-lime-500/15 text-lime-100'
            : 'border-lime-700/40 bg-lime-500/5 text-lime-200 hover:bg-lime-500/10',
        )}
        title={`${f.fileName} · ${humanBytes(f.fileSize)} · ${props.expanded ? 'hide' : 'preview'}`}
      >
        <PaperclipIcon />
        <span className="truncate font-mono">{f.fileName}</span>
      </button>
      <button
        type="button"
        onClick={() => void downloadResume(f.id)}
        className="rounded-xl border border-edge px-1.5 py-1 text-xs text-zinc-400 hover:border-lime-500/40 hover:text-lime-300"
        title="Download"
      >
        ↓
      </button>
      <button
        type="button"
        onClick={() => void openResumeInNewTab(f.id)}
        className="rounded-xl border border-edge px-1.5 py-1 text-xs text-zinc-400 hover:border-lime-500/40 hover:text-lime-300"
        title="Open in new tab"
      >
        ↗
      </button>
      <label
        className="cursor-pointer rounded-xl border border-edge px-1.5 py-1 text-xs text-zinc-400 hover:text-lime-300"
        title="Replace file"
      >
        ↺
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={RESUME_ACCEPT}
          onChange={(e) => {
            const f2 = e.target.files?.[0] ?? null
            props.onPick(f2)
            if (inputRef.current) inputRef.current.value = ''
          }}
        />
      </label>
      <button
        type="button"
        className="rounded-xl border border-edge px-1.5 py-1 text-xs text-zinc-400 hover:border-red-900/60 hover:text-red-300"
        title="Detach file"
        onClick={() => props.onDetach()}
      >
        ×
      </button>
    </div>
  )
}

function PaperclipIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 17.99 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.49" />
    </svg>
  )
}
