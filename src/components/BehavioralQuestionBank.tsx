import { useMemo, useState, type ChangeEvent } from 'react'
import { useBehavioralAttachmentsHybrid } from '../cloud/hybridData'
import type { BehavioralCategory } from '../db/types'
import { BEHAVIORAL_CATEGORIES } from '../lib/constants'
import {
  BEHAVIORAL_ACCEPT,
  attachBehavioralFile,
  deleteBehavioralFile,
  downloadBehavioralFile,
  humanBytes,
  openBehavioralFileInNewTab,
} from '../lib/behavioralFiles'
import {
  AMAZON_LEADERSHIP_PRINCIPLES,
  BEHAVIORAL_EXPERIENCE_LABELS,
  BEHAVIORAL_PREP_TIPS,
  BEHAVIORAL_QUESTIONS,
  BUILTIN_BEHAVIORAL_GUIDES,
  behavioralGuideUrl,
  filterBehavioralQuestions,
  getEssentialQuestions,
  pickRandomQuestion,
  type AmazonLeadershipPrinciple,
  type BehavioralExperienceLevel,
  type BehavioralQuestion,
} from '../lib/behavioralQuestions'
import { ResumeInlinePreview } from './ResumePreview'
import { cn } from '../lib/utils'
import { useUiStore } from '../store/uiStore'

type ExperienceFilter = BehavioralExperienceLevel | 'all'

export function BehavioralQuestionBank() {
  const pushToast = useUiStore((s) => s.pushToast)
  const uploads = useBehavioralAttachmentsHybrid()
  const [experience, setExperience] = useState<ExperienceFilter>('all')
  const [category, setCategory] = useState<BehavioralCategory | 'all'>('all')
  const [lp, setLp] = useState<AmazonLeadershipPrinciple | 'all'>('all')
  const [essentialOnly, setEssentialOnly] = useState(false)
  const [sdeOnly, setSdeOnly] = useState(false)
  const [query, setQuery] = useState('')
  const [randomQ, setRandomQ] = useState<BehavioralQuestion | null>(null)
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [uploadBusy, setUploadBusy] = useState(false)

  const essentials = useMemo(() => getEssentialQuestions(), [])

  const filtered = useMemo(
    () =>
      filterBehavioralQuestions(BEHAVIORAL_QUESTIONS, {
        experience,
        category,
        lp,
        essentialOnly,
        sdeOnly,
        query,
      }),
    [experience, category, lp, essentialOnly, sdeOnly, query],
  )

  async function onUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploadBusy(true)
    try {
      await attachBehavioralFile(file)
      pushToast('save', `Attached ${file.name}`)
    } catch (err) {
      pushToast(
        'info',
        err instanceof Error ? err.message : 'Upload failed',
      )
    } finally {
      setUploadBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded border border-edge bg-surface/80 p-4">
        <h2 className="text-sm font-semibold text-zinc-200">Study guides</h2>
        <p className="mt-1 text-xs text-zinc-400">
          Built-in PDFs from your AZ prep folder — open in a new tab or download.
          Use them to build STAR stories below.
        </p>
        <ul className="mt-3 space-y-2">
          {BUILTIN_BEHAVIORAL_GUIDES.map((g) => (
            <li
              key={g.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded border border-edge bg-pit px-3 py-2"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-zinc-100">{g.title}</div>
                <div className="text-xs text-zinc-400">{g.description}</div>
              </div>
              <div className="flex shrink-0 gap-1">
                <a
                  href={behavioralGuideUrl(g.fileName)}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded border border-edge px-2 py-1 font-mono text-xs text-zinc-300 hover:border-lime-500/40 hover:text-lime-300"
                >
                  Open
                </a>
                <a
                  href={behavioralGuideUrl(g.fileName)}
                  download={g.fileName}
                  className="rounded border border-edge px-2 py-1 font-mono text-xs text-zinc-300 hover:border-lime-500/40 hover:text-lime-300"
                >
                  ↓
                </a>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded border border-edge bg-surface/80 p-4">
        <h2 className="text-sm font-semibold text-zinc-200">
          Amazon behavioral prep
        </h2>
        <p className="mt-1 text-xs text-zinc-400">
          Key tips from ex-Amazon Bar Raisers — use with the question bank below.
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {BEHAVIORAL_PREP_TIPS.map((tip) => (
            <li
              key={tip.title}
              className="rounded border border-edge bg-pit px-3 py-2"
            >
              <div className="text-xs font-semibold text-lime-200/90">
                {tip.title}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                {tip.body}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded border border-lime-700/30 bg-lime-500/5 p-4">
        <h2 className="text-sm font-semibold text-lime-200">
          Top questions to prep first
        </h2>
        <p className="mt-1 text-xs text-zinc-400">
          Most common across Amazon roles — start here if you are short on time.
        </p>
        <ul className="mt-3 space-y-2">
          {essentials.map((q, i) => (
            <li
              key={q.id}
              className="rounded border border-edge bg-pit/80 px-3 py-2 text-sm text-zinc-200"
            >
              <span className="mr-2 font-mono text-[10px] text-lime-400/80">
                {i + 1}.
              </span>
              {q.text}
              {q.lp ? (
                <span className="mt-1.5 block font-mono text-[10px] text-zinc-500">
                  {q.lp}
                  {q.sde ? ' · SDE priority' : ''}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded border border-edge bg-surface/80 p-4">
        <h2 className="text-sm font-semibold text-zinc-200">Your guides</h2>
        <p className="mt-1 text-xs text-zinc-400">
          Attach your own PDF or Word docs — private to your account in cloud mode.
        </p>
        <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded border border-edge bg-well px-3 py-1.5 text-xs text-zinc-300 hover:border-lime-500/40 hover:text-lime-300">
          <span>{uploadBusy ? 'Uploading…' : 'Attach PDF / DOC'}</span>
          <input
            type="file"
            className="hidden"
            accept={BEHAVIORAL_ACCEPT}
            disabled={uploadBusy}
            onChange={(e) => void onUpload(e)}
          />
        </label>
        {uploads.length === 0 ? (
          <p className="mt-3 text-xs text-zinc-500">No uploads yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {uploads.map((f) => (
              <li
                key={f.id}
                className="rounded border border-edge bg-pit px-3 py-2"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewId(previewId === f.id ? null : f.id)
                    }
                    className={cn(
                      'rounded border px-2 py-0.5 font-mono text-xs',
                      previewId === f.id
                        ? 'border-lime-500/60 bg-lime-500/10 text-lime-200'
                        : 'border-edge text-zinc-300 hover:text-lime-300',
                    )}
                  >
                    {previewId === f.id ? 'Hide' : 'Preview'}
                  </button>
                  <span className="min-w-0 flex-1 truncate text-sm text-zinc-100">
                    {f.fileName}
                  </span>
                  <span className="font-mono text-[10px] text-zinc-400">
                    {humanBytes(f.fileSize)}
                  </span>
                  <button
                    type="button"
                    onClick={() => void downloadBehavioralFile(f.id)}
                    className="rounded border border-edge px-1.5 py-0.5 font-mono text-[10px] text-zinc-300 hover:text-lime-300"
                    title="Download"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => void openBehavioralFileInNewTab(f.id)}
                    className="rounded border border-edge px-1.5 py-0.5 font-mono text-[10px] text-zinc-300 hover:text-lime-300"
                    title="Open"
                  >
                    ↗
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!window.confirm('Remove this file?')) return
                      void deleteBehavioralFile(f.id)
                      if (previewId === f.id) setPreviewId(null)
                      pushToast('delete', 'File removed')
                    }}
                    className="rounded border border-edge px-1.5 py-0.5 font-mono text-[10px] text-zinc-400 hover:text-red-300"
                  >
                    ×
                  </button>
                </div>
                {previewId === f.id ? (
                  <ResumeInlinePreview attachment={f} height={360} />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded border border-edge bg-surface/80 p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-200">
              Practice questions
            </h2>
            <p className="mt-1 text-xs text-zinc-400">
              100+ questions from your study guides and Amazon interview bank ·
              filter by Leadership Principle, SDE focus, or experience level.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setRandomQ(pickRandomQuestion(filtered))}
            className="rounded bg-lime-500 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-lime-400"
          >
            Random question
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {(
            [
              'all',
              'no-experience',
              'experienced',
            ] as ExperienceFilter[]
          ).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setExperience(level)}
              className={cn(
                'rounded border px-2.5 py-1 font-mono text-xs transition-colors',
                experience === level
                  ? 'border-lime-500/60 bg-lime-500/10 text-lime-200'
                  : 'border-edge text-zinc-400 hover:text-zinc-200',
              )}
            >
              {BEHAVIORAL_EXPERIENCE_LABELS[level]}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setEssentialOnly((v) => !v)}
            className={cn(
              'rounded border px-2.5 py-1 font-mono text-xs transition-colors',
              essentialOnly
                ? 'border-lime-500/60 bg-lime-500/10 text-lime-200'
                : 'border-edge text-zinc-400 hover:text-zinc-200',
            )}
          >
            Top essentials only
          </button>
          <button
            type="button"
            onClick={() => setSdeOnly((v) => !v)}
            className={cn(
              'rounded border px-2.5 py-1 font-mono text-xs transition-colors',
              sdeOnly
                ? 'border-lime-500/60 bg-lime-500/10 text-lime-200'
                : 'border-edge text-zinc-400 hover:text-zinc-200',
            )}
          >
            SDE focus
          </button>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block space-y-1">
            <span className="text-xs text-zinc-400">Leadership Principle</span>
            <select
              className="field font-mono text-xs"
              value={lp}
              onChange={(e) =>
                setLp(e.target.value as AmazonLeadershipPrinciple | 'all')
              }
            >
              <option value="all">All principles</option>
              {AMAZON_LEADERSHIP_PRINCIPLES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-zinc-400">Category</span>
            <select
              className="field font-mono text-xs"
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as BehavioralCategory | 'all')
              }
            >
              <option value="all">All categories</option>
              {BEHAVIORAL_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 sm:col-span-2 lg:col-span-1">
            <span className="text-xs text-zinc-400">Search</span>
            <input
              className="field font-mono text-xs"
              placeholder="Filter questions…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </div>

        {randomQ ? (
          <div className="mt-4 rounded border border-lime-700/40 bg-lime-500/5 p-4">
            <div className="font-mono text-xs uppercase tracking-wider text-lime-300/80">
              Practice this
            </div>
            <p className="mt-2 text-sm leading-relaxed text-zinc-100">
              {randomQ.text}
            </p>
            <p className="mt-2 font-mono text-xs text-zinc-400">
              {randomQ.category} ·{' '}
              {BEHAVIORAL_EXPERIENCE_LABELS[randomQ.experience]}
              {randomQ.lp ? ` · ${randomQ.lp}` : ''}
              {randomQ.essential ? ' · essential' : ''}
              {randomQ.sde ? ' · SDE' : ''}
            </p>
          </div>
        ) : null}

        <p className="mt-4 font-mono text-xs text-zinc-500">
          {filtered.length} question{filtered.length === 1 ? '' : 's'}
        </p>
        <ul className="mt-2 max-h-[420px] space-y-2 overflow-y-auto pr-1">
          {filtered.map((q) => (
            <li
              key={q.id}
              className="rounded border border-edge bg-pit px-3 py-2 text-sm text-zinc-200"
            >
              <p>{q.text}</p>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[10px] text-zinc-500">
                <span>
                  {q.category} · {BEHAVIORAL_EXPERIENCE_LABELS[q.experience]}
                </span>
                {q.lp ? (
                  <span className="rounded border border-edge px-1.5 py-0.5 text-zinc-400">
                    {q.lp}
                  </span>
                ) : null}
                {q.essential ? (
                  <span className="rounded border border-lime-700/40 px-1.5 py-0.5 text-lime-400/90">
                    essential
                  </span>
                ) : null}
                {q.sde ? (
                  <span className="rounded border border-sky-700/40 px-1.5 py-0.5 text-sky-400/90">
                    SDE
                  </span>
                ) : null}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
