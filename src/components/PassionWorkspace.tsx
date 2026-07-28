import {
  Component,
  type ChangeEvent,
  type ErrorInfo,
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  addPassionIdeaRow,
  creditPassionThinkSession,
  deletePassionIdeaCascade,
  fetchPassionIdeaRow,
  patchPassionIdeaRow,
} from '../cloud/mutations'
import { usePassionAttachmentsHybrid, usePassionIdeasHybrid } from '../cloud/hybridData'
import type {
  PassionAttachment,
  PassionIdea,
  PassionLink,
  PassionTag,
} from '../db/types'
import { docxBlobToHtml, isDocxFile, isLegacyDocFile } from '../lib/docx'
import { useIntervalTick } from '../hooks/useIntervalTick'
import { PassionScheduleSection } from './PassionScheduleSection'
import {
  PASSION_ACCEPT,
  PASSION_TAGS,
  PASSION_TAG_COLORS,
  attachPassionFile,
  deletePassionFile,
  downloadPassionFile,
  getPassionAttachmentById,
  humanBytes,
  isYoutubeLink,
  linkHost,
  makePassionLink,
  newIdea,
  openPassionFileInNewTab,
  parseYoutubeId,
  youtubeEmbedUrl,
  youtubeThumbnailUrl,
} from '../lib/passion'
import { cn } from '../lib/utils'
import {
  thinkRemainingMs,
  useTimerStore,
  type ThinkTimerPersist,
} from '../store/timerStore'
import { useUiStore } from '../store/uiStore'

class PassionScheduleErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true }
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error('PassionSchedule', err, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Your timetable could not load (browser storage or sync issue).
          Ideas and timers below still work; try a refresh, or clear site data if
          this persists.
        </div>
      )
    }
    return this.props.children
  }
}

export function PassionWorkspace() {
  const ideas = usePassionIdeasHybrid()
  const attachments = usePassionAttachmentsHybrid()
  const pushToast = useUiStore((s) => s.pushToast)
  const think = useTimerStore((s) => s.think)
  const thinkSetIdea = useTimerStore((s) => s.thinkSetIdea)

  const [activeId, setActiveId] = useState<string | null>(null)

  // Pick a sensible default active idea — the one bound to the think timer,
  // else the most-recently-updated idea.
  useEffect(() => {
    if (ideas.length === 0) {
      if (activeId !== null) setActiveId(null)
      return
    }
    if (activeId && ideas.some((i) => i.id === activeId)) return
    const preferred =
      (think.ideaId && ideas.find((i) => i.id === think.ideaId)) || ideas[0]
    setActiveId(preferred.id)
  }, [ideas, activeId, think.ideaId])

  // Keep the timer's bound idea in sync with the active selection.
  useEffect(() => {
    if (activeId && think.ideaId !== activeId) {
      thinkSetIdea(activeId)
    }
  }, [activeId, think.ideaId, thinkSetIdea])

  const active = useMemo(
    () => ideas.find((i) => i.id === activeId) ?? null,
    [ideas, activeId],
  )

  const attachmentsById = useMemo(() => {
    const m = new Map<string, PassionAttachment>()
    for (const a of attachments) m.set(a.id, a)
    return m
  }, [attachments])

  async function createIdea() {
    const idea = newIdea({ title: 'New idea' })
    await addPassionIdeaRow(idea)
    setActiveId(idea.id)
    pushToast('save', 'Idea created · start thinking')
  }

  async function patch(id: string, partial: Partial<PassionIdea>) {
    await patchPassionIdeaRow(id, partial)
  }

  async function removeIdea(id: string) {
    const idea = await fetchPassionIdeaRow(id)
    if (!idea) return
    if (
      !window.confirm(
        `Delete "${idea.title}"? Notes, links, and attached files are removed.`,
      )
    ) {
      return
    }
    // Cascade-delete attachments owned by this idea.
    await deletePassionIdeaCascade(id)
    pushToast('delete', 'Idea deleted')
  }

  return (
    <section className="surface-glossy relative overflow-hidden rounded-xl p-5 md:p-7">
      <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />
      <header className="relative flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p
            className="font-mono text-xs uppercase tracking-wider text-zinc-400"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            Passion · research mode
          </p>
          <h2 className="mt-1 text-xl font-semibold text-zinc-50">
            Think deeply about ideas you care about
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-zinc-300">
            One 45-minute timer for one big question. Capture notes, link
            YouTube talks &amp; papers, and attach PDFs for your own ideas,
            startups, innovation moonshots and AGI research. Everything stays
            local in your browser.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void createIdea()}
          className="btn-primary rounded-md px-4 py-2 text-sm font-semibold"
        >
          + New idea
        </button>
      </header>

      <PassionScheduleErrorBoundary>
        <PassionScheduleSection />
      </PassionScheduleErrorBoundary>

      <IdeaTabs
        ideas={ideas}
        activeId={activeId}
        onSelect={setActiveId}
        onCreate={() => void createIdea()}
      />

      {active ? (
        <div className="relative mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <ThinkTimerPanel idea={active} think={think} onComplete={pushToast} />
          <IdeaEditor
            idea={active}
            attachments={active.attachmentIds.map((id) =>
              attachmentsById.get(id) ?? null,
            )}
            onPatch={(partial) => void patch(active.id, partial)}
            onDelete={() => void removeIdea(active.id)}
            onAttach={async (file) => {
              try {
                const aid = await attachPassionFile(file)
                await patch(active.id, {
                  attachmentIds: [aid, ...active.attachmentIds],
                })
                pushToast('save', `Attached ${file.name}`)
              } catch (err) {
                pushToast(
                  'info',
                  err instanceof Error ? err.message : 'Attach failed',
                )
              }
            }}
            onDetach={async (attId) => {
              await deletePassionFile(attId)
              await patch(active.id, {
                attachmentIds: active.attachmentIds.filter((x) => x !== attId),
              })
              pushToast('delete', 'File detached')
            }}
            onAddLink={async (url, label) => {
              const link = makePassionLink(url, label)
              if (!link.url) {
                pushToast('info', 'Enter a URL first')
                return
              }
              await patch(active.id, {
                links: [link, ...active.links],
              })
              pushToast(
                'save',
                link.youtubeId ? 'YouTube video linked' : 'Link added',
              )
            }}
            onRemoveLink={async (linkId) => {
              await patch(active.id, {
                links: active.links.filter((l) => l.id !== linkId),
              })
              pushToast('delete', 'Link removed')
            }}
          />
        </div>
      ) : (
        <EmptyState onCreate={() => void createIdea()} />
      )}
    </section>
  )
}

/* ----------------------- Tabs (one per idea) ----------------------- */

function IdeaTabs(props: {
  ideas: PassionIdea[]
  activeId: string | null
  onSelect: (id: string) => void
  onCreate: () => void
}) {
  if (props.ideas.length === 0) return null
  return (
    <div className="relative mt-5 flex flex-wrap items-center gap-2">
      {props.ideas.map((idea) => {
        const active = idea.id === props.activeId
        const dot = PASSION_TAG_COLORS[idea.tag] ?? '#84cc16'
        return (
          <button
            key={idea.id}
            type="button"
            onClick={() => props.onSelect(idea.id)}
            className={cn(
              'group inline-flex max-w-[18rem] items-center gap-2 truncate rounded-full border px-3 py-1.5 font-mono text-xs transition-colors',
              active
                ? 'border-lime-500/60 bg-lime-500/10 text-lime-100'
                : 'border-edge bg-surface text-zinc-300 hover:border-zinc-700 hover:text-zinc-100',
            )}
            title={`${idea.title} · ${idea.tag}`}
          >
            <span
              className="inline-block h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: dot }}
              aria-hidden
            />
            <span className="truncate">{idea.title || 'Untitled'}</span>
            <span className="shrink-0 text-zinc-400">
              · {idea.sessionsCompleted}×
            </span>
          </button>
        )
      })}
      <button
        type="button"
        onClick={props.onCreate}
        className="inline-flex items-center gap-1 rounded-full border border-dashed border-edge px-3 py-1.5 font-mono text-xs text-zinc-400 hover:border-lime-500/40 hover:text-lime-300"
      >
        + idea
      </button>
    </div>
  )
}

/* ----------------------- 45-minute Think timer ----------------------- */

function ThinkTimerPanel(props: {
  idea: PassionIdea
  think: ThinkTimerPersist
  onComplete: (kind: 'save', message: string) => void
}) {
  const t = props.think
  const start = useTimerStore((s) => s.thinkStart)
  const pause = useTimerStore((s) => s.thinkPause)
  const reset = useTimerStore((s) => s.thinkReset)
  const setDuration = useTimerStore((s) => s.thinkSetDuration)
  const complete = useTimerStore((s) => s.thinkComplete)

  // Tick fast while running so the seconds display stays smooth.
  useIntervalTick(t.running ? 250 : 2000)
  const remaining = thinkRemainingMs(t)
  const totalMs = t.durationMin * 60_000
  const pct = totalMs > 0 ? 1 - remaining / totalMs : 0

  // When countdown hits 0, chime, credit the idea, and bump session counter.
  useEffect(() => {
    if (!t.running) return
    if (remaining > 0) return
    chime()
    const { idea, minutes } = complete()
    // Credit the idea atomically inside the DB.
    if (idea) {
      void creditPassionThinkSession(idea, minutes).catch(() => undefined)
    }
    props.onComplete('save', `Think session complete · ${minutes}m logged`)
    try {
      if (
        typeof Notification !== 'undefined' &&
        Notification.permission === 'granted'
      ) {
        new Notification('Think session complete', {
          body: `${minutes} minutes deep work on "${props.idea.title}"`,
        })
      }
    } catch {
      // best effort
    }
  }, [t.running, remaining, complete, props])

  function requestNotifyIfNeeded() {
    if (typeof Notification === 'undefined') return
    if (Notification.permission === 'default') {
      void Notification.requestPermission()
    }
  }

  const presets = [25, 45, 60, 90]

  return (
    <div className="rounded-xl border border-violet-500/30 bg-gradient-to-b from-violet-500/[0.05] to-transparent p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-zinc-400">
            Think timer · countdown
          </p>
          <h3 className="text-base font-semibold text-zinc-100">
            {props.idea.title || 'Untitled idea'}
          </h3>
        </div>
        <span
          className={cn(
            'rounded-full border px-2 py-0.5 font-mono text-xs uppercase tracking-wider',
            t.running
              ? 'border-violet-400/70 bg-violet-500/15 text-violet-200'
              : remaining < totalMs
                ? 'border-amber-500/40 text-amber-200'
                : 'border-edge text-zinc-400',
          )}
        >
          {t.running ? 'Thinking' : remaining < totalMs ? 'Paused' : 'Idle'}
        </span>
      </div>

      <div className="mt-4 flex items-baseline gap-2 font-mono tabular-nums">
        <span
          className="text-6xl font-semibold text-zinc-50"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {formatThink(remaining)}
        </span>
        <span className="font-mono text-xs text-zinc-400">
          / {t.durationMin}m
        </span>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full border border-edge bg-edge-soft">
        <div
          className="h-full bg-violet-400 transition-[width] duration-300"
          style={{ width: `${Math.min(100, Math.max(0, pct * 100))}%` }}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {t.running ? (
          <button
            type="button"
            onClick={pause}
            className="rounded-md border border-amber-500/60 bg-amber-500/15 px-4 py-2 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/20"
          >
            Pause
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              requestNotifyIfNeeded()
              start()
            }}
            className="btn-primary rounded-md px-4 py-2 text-sm"
          >
            {remaining < totalMs && remaining > 0
              ? 'Resume'
              : `Start ${t.durationMin}m`}
          </button>
        )}
        <button
          type="button"
          onClick={reset}
          disabled={t.running || (remaining === totalMs && !t.running)}
          className="rounded-md border border-edge bg-surface px-4 py-2 text-sm text-zinc-200 transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Reset
        </button>
        <div className="ml-auto flex flex-wrap items-center gap-1">
          {presets.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setDuration(m)}
              className={cn(
                'rounded border px-2 py-1 font-mono text-xs transition-colors',
                t.durationMin === m
                  ? 'border-violet-400/70 bg-violet-500/15 text-violet-100'
                  : 'border-edge bg-well text-zinc-400 hover:border-violet-400/40 hover:text-violet-200',
              )}
            >
              {m}m
            </button>
          ))}
          <input
            type="number"
            min={1}
            max={240}
            value={t.durationMin}
            onChange={(e) => setDuration(Number(e.target.value) || 45)}
            className="field w-16 font-mono text-xs"
            aria-label="Custom think duration in minutes"
          />
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-edge/70 pt-3 font-mono text-xs text-zinc-400">
        <Stat
          label="Sessions"
          value={String(props.idea.sessionsCompleted)}
          accent="text-violet-200"
        />
        <Stat
          label="Time on idea"
          value={`${props.idea.thinkMinutesTotal}m`}
          accent="text-zinc-200"
        />
        <Stat
          label="All-idea sessions"
          value={String(t.sessionsCompleted)}
        />
      </dl>
      <p className="mt-3 text-xs text-zinc-400">
        Tip: phone face-down, one tab, one idea. When the timer rings, write
        down the single most interesting thought below.
      </p>
    </div>
  )
}

function Stat(props: { label: string; value: string; accent?: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-zinc-500">
        {props.label}
      </dt>
      <dd
        className={cn(
          'mt-0.5 font-mono text-base font-semibold tabular-nums',
          props.accent ?? 'text-zinc-100',
        )}
      >
        {props.value}
      </dd>
    </div>
  )
}

/* ----------------------- Idea editor ----------------------- */

function IdeaEditor(props: {
  idea: PassionIdea
  attachments: (PassionAttachment | null)[]
  onPatch: (partial: Partial<PassionIdea>) => void
  onDelete: () => void
  onAttach: (file: File) => Promise<void> | void
  onDetach: (attachmentId: string) => Promise<void> | void
  onAddLink: (url: string, label?: string) => Promise<void> | void
  onRemoveLink: (linkId: string) => Promise<void> | void
}) {
  const { idea } = props
  const [titleDraft, setTitleDraft] = useState(idea.title)
  const [notesDraft, setNotesDraft] = useState(idea.notes)
  const [expandedAtt, setExpandedAtt] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Re-hydrate local draft state when switching ideas.
  useEffect(() => {
    setTitleDraft(idea.title)
    setNotesDraft(idea.notes)
  }, [idea.id, idea.title, idea.notes])

  // Auto-save notes ~750ms after the user stops typing.
  useEffect(() => {
    if (notesDraft === idea.notes) return
    const handle = window.setTimeout(() => {
      props.onPatch({ notes: notesDraft })
    }, 750)
    return () => window.clearTimeout(handle)
    // We deliberately exclude `props` from deps to keep the timeout stable;
    // patch is identity-stable enough for the tiny re-renders here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notesDraft, idea.id, idea.notes])

  function commitTitle() {
    const next = titleDraft.trim() || 'Untitled idea'
    if (next !== idea.title) props.onPatch({ title: next })
  }

  function onFiles(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (f) void props.onAttach(f)
  }

  const knownAttachments = props.attachments.filter(
    (a): a is PassionAttachment => a !== null,
  )

  return (
    <div className="space-y-5 rounded-xl border border-edge bg-well/60 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-400">
              Idea
            </span>
            <input
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur()
              }}
              className="field mt-1 w-full text-base font-semibold text-zinc-50"
              placeholder="What are you thinking about?"
            />
          </label>
        </div>
        <div className="flex flex-col items-end gap-2">
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-400">
              Tag
            </span>
            <select
              value={idea.tag}
              onChange={(e) =>
                props.onPatch({ tag: e.target.value as PassionTag })
              }
              className="field mt-1 text-xs uppercase tracking-wider"
              style={{
                borderColor: `${PASSION_TAG_COLORS[idea.tag]}55`,
                color: PASSION_TAG_COLORS[idea.tag],
              }}
            >
              {PASSION_TAGS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={props.onDelete}
            className="rounded border border-red-900/60 px-2 py-1 text-xs text-red-300 hover:bg-red-950/30"
          >
            Delete idea
          </button>
        </div>
      </div>

      <label className="block">
        <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-400">
          Notes · auto-saves
        </span>
        <textarea
          value={notesDraft}
          onChange={(e) => setNotesDraft(e.target.value)}
          rows={9}
          placeholder={
            'Brain-dump anything: hypotheses, sketches, prior art, doubts, the next experiment. Markdown / bullet lists welcome.'
          }
          className="field mt-1 w-full resize-y font-mono text-sm leading-relaxed"
        />
      </label>

      <LinksSection
        links={idea.links}
        onAdd={(url, label) => void props.onAddLink(url, label)}
        onRemove={(id) => void props.onRemoveLink(id)}
      />

      <section>
        <div className="flex items-end justify-between">
          <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-400">
            Attachments · PDFs, docs, screenshots
          </p>
          <label className="inline-flex cursor-pointer items-center gap-1 rounded border border-edge bg-surface px-2 py-1 font-mono text-xs text-zinc-300 hover:border-lime-500/40 hover:text-lime-300">
            <Paperclip />
            <span>Attach file</span>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept={PASSION_ACCEPT}
              onChange={onFiles}
            />
          </label>
        </div>
        {knownAttachments.length === 0 ? (
          <p className="mt-2 text-xs text-zinc-400">
            No files yet. Drop in research PDFs, paper summaries, or
            architecture sketches.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {knownAttachments.map((a) => (
              <AttachmentRow
                key={a.id}
                attachment={a}
                expanded={expandedAtt === a.id}
                onToggle={() =>
                  setExpandedAtt((p) => (p === a.id ? null : a.id))
                }
                onRemove={() => void props.onDetach(a.id)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

/* ----------------------- Links sub-section ----------------------- */

function LinksSection(props: {
  links: PassionLink[]
  onAdd: (url: string, label?: string) => void
  onRemove: (id: string) => void
}) {
  const [url, setUrl] = useState('')
  const [label, setLabel] = useState('')

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = url.trim()
    if (!trimmed) return
    props.onAdd(trimmed, label)
    setUrl('')
    setLabel('')
  }

  const ytId = parseYoutubeId(url)

  return (
    <section>
      <div className="flex items-end justify-between">
        <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-400">
          Links · YouTube, papers, blogs
        </p>
        <span className="font-mono text-[10px] text-zinc-400">
          {props.links.length} saved
        </span>
      </div>
      <form
        onSubmit={onSubmit}
        className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto]"
      >
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://youtube.com/watch?v=… or any URL"
          className="field font-mono text-xs"
          spellCheck={false}
        />
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={ytId ? 'Optional title (auto-detected)' : 'Optional title'}
          className="field text-xs"
        />
        <button
          type="submit"
          className="btn-primary rounded-md px-3 py-2 text-xs font-semibold"
        >
          {ytId ? '+ YouTube' : '+ Link'}
        </button>
      </form>
      {props.links.length > 0 ? (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {props.links.map((link) =>
            isYoutubeLink(link) ? (
              <YoutubeCard
                key={link.id}
                link={link}
                onRemove={() => props.onRemove(link.id)}
              />
            ) : (
              <LinkRow
                key={link.id}
                link={link}
                onRemove={() => props.onRemove(link.id)}
              />
            ),
          )}
        </ul>
      ) : null}
    </section>
  )
}

function YoutubeCard(props: { link: PassionLink; onRemove: () => void }) {
  const [embed, setEmbed] = useState(false)
  const id = props.link.youtubeId
  if (!id) return null
  return (
    <li className="overflow-hidden rounded-md border border-edge bg-surface">
      {embed ? (
        <div className="relative aspect-video w-full bg-black">
          <iframe
            src={youtubeEmbedUrl(id)}
            title={props.link.label || 'YouTube video'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="absolute inset-0 h-full w-full"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEmbed(true)}
          className="group relative block aspect-video w-full overflow-hidden bg-black"
          aria-label="Play inline"
        >
          <img
            src={youtubeThumbnailUrl(id)}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
          />
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/70 text-white ring-2 ring-white/30 transition-transform group-hover:scale-105">
              <PlayIcon />
            </span>
          </span>
        </button>
      )}
      <div className="flex items-center justify-between gap-2 border-t border-edge px-3 py-2">
        <div className="min-w-0">
          <a
            href={props.link.url}
            target="_blank"
            rel="noreferrer"
            className="truncate text-xs font-medium text-zinc-200 hover:text-lime-300"
            title={props.link.url}
          >
            {props.link.label || 'YouTube video'}
          </a>
          <p className="truncate font-mono text-[10px] text-zinc-400">
            youtu.be/{id}
          </p>
        </div>
        <button
          type="button"
          onClick={props.onRemove}
          className="rounded border border-edge px-1.5 py-0.5 font-mono text-[10px] text-zinc-400 hover:border-red-900/60 hover:text-red-300"
          aria-label="Remove link"
        >
          ×
        </button>
      </div>
    </li>
  )
}

function LinkRow(props: { link: PassionLink; onRemove: () => void }) {
  return (
    <li className="flex items-center justify-between gap-2 rounded-md border border-edge bg-surface px-3 py-2">
      <div className="min-w-0">
        <a
          href={props.link.url}
          target="_blank"
          rel="noreferrer"
          className="truncate text-sm text-zinc-200 hover:text-lime-300"
          title={props.link.url}
        >
          {props.link.label || linkHost(props.link.url)}
        </a>
        <p className="truncate font-mono text-[10px] text-zinc-400">
          {linkHost(props.link.url)}
        </p>
      </div>
      <button
        type="button"
        onClick={props.onRemove}
        className="rounded border border-edge px-1.5 py-0.5 font-mono text-[10px] text-zinc-400 hover:border-red-900/60 hover:text-red-300"
        aria-label="Remove link"
      >
        ×
      </button>
    </li>
  )
}

/* ----------------------- Attachment row ----------------------- */

function AttachmentRow(props: {
  attachment: PassionAttachment
  expanded: boolean
  onToggle: () => void
  onRemove: () => void
}) {
  const { attachment } = props
  const lower = attachment.fileName.toLowerCase()
  const isPdf = attachment.fileType.includes('pdf') || lower.endsWith('.pdf')
  const isImage =
    attachment.fileType.startsWith('image/') ||
    /\.(png|jpe?g|gif|webp)$/i.test(attachment.fileName)
  const isText =
    attachment.fileType.startsWith('text/') ||
    lower.endsWith('.txt') ||
    lower.endsWith('.md')
  const isDocx = isDocxFile(attachment.fileType, attachment.fileName)
  const isLegacyDoc = isLegacyDocFile(attachment.fileType, attachment.fileName)

  const [url, setUrl] = useState<string | null>(null)
  const [docxHtml, setDocxHtml] = useState<string | null>(null)
  const [docxError, setDocxError] = useState<string | null>(null)

  useEffect(() => {
    if (!props.expanded) return
    let cancelled = false
    let objectUrl: string | null = null
    async function resolve() {
      let blob = attachment.data
      if (blob.size === 0) {
        const full = await getPassionAttachmentById(attachment.id)
        if (cancelled || !full) return
        blob = full.data
      }
      if (isDocx) {
        try {
          const html = await docxBlobToHtml(blob)
          if (!cancelled) setDocxHtml(html)
        } catch (err) {
          if (!cancelled) {
            setDocxError(
              err instanceof Error
                ? err.message
                : 'Could not parse Word document.',
            )
          }
        }
        return
      }
      objectUrl = URL.createObjectURL(blob)
      setUrl(objectUrl)
    }
    void resolve()
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      setUrl(null)
      setDocxHtml(null)
      setDocxError(null)
    }
  }, [props.expanded, attachment.id, attachment.data, isDocx])

  return (
    <li className="rounded-md border border-edge bg-surface">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={props.onToggle}
          aria-expanded={props.expanded}
          className={cn(
            'inline-flex items-center gap-1 rounded border px-2 py-0.5 font-mono text-xs transition-colors',
            props.expanded
              ? 'border-lime-500/60 bg-lime-500/10 text-lime-200'
              : 'border-edge bg-well text-zinc-300 hover:border-lime-500/40 hover:text-lime-300',
          )}
        >
          {props.expanded ? 'Hide' : 'Preview'}
        </button>
        <span className="min-w-0 flex-1 truncate text-sm text-zinc-100">
          {attachment.fileName}
        </span>
        <span className="font-mono text-[10px] text-zinc-400">
          {humanBytes(attachment.fileSize)}
        </span>
        <button
          type="button"
          onClick={() => void downloadPassionFile(attachment.id)}
          className="rounded border border-edge px-1.5 py-0.5 font-mono text-[10px] text-zinc-300 hover:border-lime-500/40 hover:text-lime-300"
          title="Download"
        >
          ↓
        </button>
        <button
          type="button"
          onClick={() => void openPassionFileInNewTab(attachment.id)}
          className="rounded border border-edge px-1.5 py-0.5 font-mono text-[10px] text-zinc-300 hover:border-lime-500/40 hover:text-lime-300"
          title="Open in new tab"
        >
          ↗
        </button>
        <button
          type="button"
          onClick={props.onRemove}
          className="rounded border border-edge px-1.5 py-0.5 font-mono text-[10px] text-zinc-400 hover:border-red-900/60 hover:text-red-300"
          title="Detach"
        >
          ×
        </button>
      </div>
      {props.expanded
        ? isDocx
          ? docxError ? (
              <div className="border-t border-edge px-3 py-4 text-xs text-amber-200">
                Could not render Word document: {docxError}
              </div>
            ) : docxHtml === null ? (
              <div className="border-t border-edge px-3 py-4 text-xs text-zinc-400">
                Rendering Word document…
              </div>
            ) : (
              <div
                className="docx-preview block w-full overflow-auto border-t border-edge bg-[#f8f7f3] px-6 py-5 text-sm text-zinc-900"
                style={{ maxHeight: 420 }}
                dangerouslySetInnerHTML={{ __html: docxHtml }}
              />
            )
          : isLegacyDoc ? (
            <div className="border-t border-edge px-3 py-4 text-xs text-zinc-400">
              Legacy <span className="text-zinc-200">.doc</span> files can&apos;t
              be previewed inline. Re-save as{' '}
              <span className="text-lime-300">.docx</span> or use Download /
              Open.
            </div>
          ) : url ? (
            isPdf || isText ? (
              <iframe
                src={url}
                title={attachment.fileName}
                className="block w-full border-t border-edge bg-base"
                style={{ height: 360 }}
              />
            ) : isImage ? (
              <img
                src={url}
                alt={attachment.fileName}
                className="block max-h-[420px] w-full border-t border-edge bg-black object-contain"
              />
            ) : (
              <div className="border-t border-edge px-3 py-4 text-xs text-zinc-400">
                Inline preview not supported for this type. Use Download / Open.
              </div>
            )
          ) : null
        : null}
    </li>
  )
}

/* ----------------------- Empty state ----------------------- */

function EmptyState(props: { onCreate: () => void }) {
  return (
    <div className="relative mt-5 rounded-xl border border-dashed border-edge bg-well/40 p-8 text-center">
      <p className="font-mono text-xs uppercase tracking-wider text-zinc-400">
        No ideas yet
      </p>
      <h3 className="mt-2 text-lg font-semibold text-zinc-100">
        Start your first 45 minutes of deep thinking
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-zinc-300">
        Create an idea thread for an original concept, a startup hypothesis,
        an innovation, or an AGI research direction. Each thread keeps its
        own notes, link library, and PDF attachments.
      </p>
      <button
        type="button"
        onClick={props.onCreate}
        className="btn-primary mt-4 rounded-md px-4 py-2 text-sm font-semibold"
      >
        + Create first idea
      </button>
    </div>
  )
}

/* ----------------------- helpers ----------------------- */

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

function formatThink(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return h > 0 ? `${h}:${pad2(m)}:${pad2(s)}` : `${pad2(m)}:${pad2(s)}`
}

function chime() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(660, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(330, ctx.currentTime + 0.5)
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.7)
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.75)
    osc.onended = () => ctx.close()
  } catch {
    // ignore
  }
}

function Paperclip() {
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

function PlayIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}
