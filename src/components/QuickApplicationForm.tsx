import { useLiveQuery } from 'dexie-react-hooks'
import type { FormEvent, KeyboardEvent, ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { db } from '../db/database'
import type {
  Application,
  ApplicationSource,
  ApplicationStatus,
  ResumeAttachment,
  TaskPriority,
} from '../db/types'
import { APPLICATION_SOURCES } from '../lib/constants'
import { dayKey } from '../lib/dates'
import { recentCompanies, recentResumes } from '../lib/insights'
import {
  attachResumeFromFile,
  humanBytes,
  RESUME_ACCEPT,
} from '../lib/resume'
import { newId } from '../lib/utils'
import { useUiStore } from '../store/uiStore'
import {
  ResumeInlinePreview,
  ResumePreviewToolbar,
} from './ResumePreview'

const EMPTY: Application[] = []

export function QuickApplicationForm() {
  const formRef = useRef<HTMLFormElement>(null)
  const companyRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const pushToast = useUiStore((s) => s.pushToast)
  const today = dayKey()
  const location = useLocation()
  const [pickedFile, setPickedFile] = useState<File | null>(null)
  const [lastLogged, setLastLogged] = useState<{
    app: Application
    attachment: ResumeAttachment | null
  } | null>(null)
  const [previewOpen, setPreviewOpen] = useState(true)

  const apps = useLiveQuery(() => db.applications.toArray(), []) ?? EMPTY
  const companies = recentCompanies(apps as Application[], 12)
  const resumes = recentResumes(apps as Application[], 8)

  useEffect(() => {
    if (location.hash === '#quick-log') {
      sectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
      requestAnimationFrame(() => companyRef.current?.focus())
    }
  }, [location])

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const company = String(fd.get('company') ?? '').trim()
    const role = String(fd.get('role') ?? '').trim()
    if (!company || !role) {
      pushToast('info', 'Company and role required')
      return
    }
    let resumeFileId: string | undefined
    if (pickedFile) {
      try {
        resumeFileId = await attachResumeFromFile(pickedFile)
      } catch (err) {
        pushToast(
          'info',
          err instanceof Error ? err.message : 'Resume attach failed',
        )
        return
      }
    }
    const app: Application = {
      id: newId(),
      date: today,
      company,
      role,
      source: (fd.get('source') as ApplicationSource) || 'Other',
      resumeVersion:
        String(fd.get('resumeVersion') ?? '').trim() ||
        (pickedFile ? pickedFile.name.replace(/\.[^.]+$/, '') : 'default'),
      resumeFileId: resumeFileId ?? null,
      status: (fd.get('status') as ApplicationStatus) || 'Applied',
      priority: (fd.get('priority') as TaskPriority) || 'mid',
      createdAt: Date.now(),
    }
    await db.applications.add(app)
    pushToast(
      'save',
      pickedFile ? `Logged ${company} · file attached` : `Logged ${company}`,
    )
    let attachment: ResumeAttachment | null = null
    if (resumeFileId) {
      attachment = (await db.resumeFiles.get(resumeFileId)) ?? null
    }
    setLastLogged({ app, attachment })
    setPreviewOpen(Boolean(attachment))
    e.currentTarget.reset()
    const statusEl = e.currentTarget.elements.namedItem(
      'status',
    ) as HTMLSelectElement | null
    if (statusEl) statusEl.value = 'Applied'
    setPickedFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    requestAnimationFrame(() => companyRef.current?.focus())
  }

  function onKeyDownForm(e: KeyboardEvent<HTMLFormElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      formRef.current?.requestSubmit()
    }
  }

  function submitOnEnter(e: KeyboardEvent<HTMLInputElement | HTMLSelectElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      formRef.current?.requestSubmit()
    }
  }

  return (
    <section
      id="quick-log"
      ref={sectionRef}
      className="scroll-mt-20 rounded-lg border border-[#232328] bg-[#131316]/80 p-5"
    >
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2
            className="text-sm font-semibold text-zinc-200"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Quick log
          </h2>
          <p
            className="mt-0.5 text-xs text-zinc-500"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            Enter submits · ⌘/Ctrl+Enter submits · A focuses this from anywhere
          </p>
        </div>
        <span className="font-mono text-xs text-zinc-500">
          {companies.length} cos · {resumes.length} resumes
        </span>
      </div>
      <form
        id="quick-app-form"
        ref={formRef}
        onSubmit={submit}
        onKeyDown={onKeyDownForm}
        className="grid gap-3 md:grid-cols-2 lg:grid-cols-3"
      >
        <Field label="Company">
          <input
            ref={companyRef}
            name="company"
            list="recent-companies"
            required
            className="field"
            autoComplete="off"
            spellCheck={false}
            onKeyDown={submitOnEnter}
          />
          <datalist id="recent-companies">
            {companies.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
        <Field label="Role">
          <input
            name="role"
            required
            className="field"
            spellCheck={false}
            onKeyDown={submitOnEnter}
          />
        </Field>
        <Field label="Source">
          <select
            name="source"
            className="field"
            defaultValue="LinkedIn"
            onKeyDown={submitOnEnter}
          >
            {APPLICATION_SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Resume">
          <input
            name="resumeVersion"
            list="recent-resumes"
            placeholder={resumes[0] ?? 'v1'}
            className="field"
            spellCheck={false}
            onKeyDown={submitOnEnter}
          />
          <datalist id="recent-resumes">
            {resumes.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </Field>
        <Field label="Status">
          <select
            name="status"
            className="field"
            defaultValue="Applied"
            onKeyDown={submitOnEnter}
          >
            <option>Applied</option>
            <option>OA</option>
            <option>Phone</option>
            <option>Onsite</option>
            <option>Offer</option>
            <option>Accepted</option>
            <option>Rejected</option>
            <option>Ghosted</option>
          </select>
        </Field>
        <Field label="Priority">
          <select
            name="priority"
            className="field"
            defaultValue="mid"
            onKeyDown={submitOnEnter}
          >
            <option value="low">low</option>
            <option value="mid">mid</option>
            <option value="high">high</option>
          </select>
        </Field>
        <div className="col-span-full">
          <label className="block space-y-1">
            <span className="font-mono text-xs uppercase tracking-wider text-zinc-500">
              Resume file (optional)
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded border border-[#232328] bg-[#0f0f12] px-3 py-1.5 text-xs text-zinc-300 hover:border-lime-500/40 hover:text-lime-300">
                <Paperclip />
                <span>{pickedFile ? 'Replace file' : 'Attach PDF / DOC'}</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept={RESUME_ACCEPT}
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null
                    setPickedFile(f)
                  }}
                />
              </label>
              {pickedFile ? (
                <span className="inline-flex items-center gap-2 rounded border border-lime-700/40 bg-lime-500/5 px-2 py-1 font-mono text-xs text-lime-200">
                  <span>{pickedFile.name}</span>
                  <span className="text-zinc-500">
                    · {humanBytes(pickedFile.size)}
                  </span>
                  <button
                    type="button"
                    aria-label="Remove file"
                    className="rounded px-1 text-zinc-500 hover:text-red-300"
                    onClick={() => {
                      setPickedFile(null)
                      if (fileInputRef.current) {
                        fileInputRef.current.value = ''
                      }
                    }}
                  >
                    ×
                  </button>
                </span>
              ) : (
                <span className="font-mono text-xs text-zinc-500">
                  stored locally · viewable from the Applications table
                </span>
              )}
            </div>
          </label>
        </div>
        <div className="col-span-full flex items-center justify-end gap-2 pt-1">
          <button
            type="submit"
            className="btn-primary rounded-md px-4 py-2 text-sm font-semibold text-zinc-950"
          >
            Log application
          </button>
        </div>
      </form>

      {lastLogged ? (
        <div className="mt-5 rounded-md border border-lime-700/30 bg-gradient-to-b from-lime-500/[0.06] to-transparent p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="min-w-0">
              <div className="font-mono text-xs uppercase tracking-wider text-lime-300/80">
                Just logged
              </div>
              <div className="truncate text-sm text-zinc-100">
                <span className="font-semibold">{lastLogged.app.company}</span>
                <span className="text-zinc-500"> · {lastLogged.app.role}</span>
              </div>
              <div className="font-mono text-xs text-zinc-500">
                {lastLogged.app.source} · resume{' '}
                <span className="text-zinc-300">
                  {lastLogged.app.resumeVersion}
                </span>
                {lastLogged.attachment ? null : ' · no file attached'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setLastLogged(null)}
              className="rounded border border-[#232328] px-2 py-0.5 font-mono text-xs text-zinc-500 hover:text-zinc-200"
            >
              Dismiss
            </button>
          </div>
          {lastLogged.attachment ? (
            <div className="mt-3">
              <ResumePreviewToolbar
                attachment={lastLogged.attachment}
                expanded={previewOpen}
                onToggle={() => setPreviewOpen((v) => !v)}
              />
              {previewOpen ? (
                <ResumeInlinePreview
                  attachment={lastLogged.attachment}
                  height={360}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

function Paperclip() {
  return (
    <svg
      width="12"
      height="12"
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

function Field(props: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span
        className="font-mono text-xs uppercase tracking-wider text-zinc-500"
      >
        {props.label}
      </span>
      {props.children}
    </label>
  )
}
