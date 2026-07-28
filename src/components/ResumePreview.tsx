import { useEffect, useState } from 'react'
import type { ResumeAttachment } from '../db/types'
import { docxBlobToHtml, isDocxFile, isLegacyDocFile } from '../lib/docx'
import { downloadResume, getResume, humanBytes, openResumeInNewTab } from '../lib/resume'
import { useUiStore } from '../store/uiStore'
import { cn } from '../lib/utils'

export function ResumePreviewToolbar(props: {
  attachment: ResumeAttachment
  expanded: boolean
  onToggle: () => void
  compact?: boolean
}) {
  const { attachment, expanded, onToggle, compact } = props
  const pushToast = useUiStore((s) => s.pushToast)
  const [busy, setBusy] = useState<'download' | 'open' | null>(null)

  async function handle(
    action: 'download' | 'open',
    run: () => Promise<void>,
  ) {
    if (busy) return
    setBusy(action)
    try {
      await run()
    } catch (err) {
      pushToast(
        'info',
        err instanceof Error
          ? `${action === 'download' ? 'Download' : 'Open'} failed: ${err.message}`
          : 'Could not load resume file.',
      )
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className={cn(
          'inline-flex items-center gap-1 rounded border px-2 py-1 font-mono text-xs transition-colors',
          expanded
            ? 'border-lime-500/60 bg-lime-500/10 text-lime-200'
            : 'border-edge bg-well text-zinc-300 hover:border-lime-500/40 hover:text-lime-300',
        )}
        title={expanded ? 'Hide preview' : 'Preview inline'}
      >
        <EyeIcon />
        <span>{expanded ? 'Hide' : 'Preview'}</span>
      </button>
      <button
        type="button"
        disabled={busy !== null}
        onClick={() =>
          void handle('download', () => downloadResume(attachment.id))
        }
        className="inline-flex items-center gap-1 rounded border border-edge bg-well px-2 py-1 font-mono text-xs text-zinc-300 hover:border-lime-500/40 hover:text-lime-300 disabled:opacity-60"
        title="Download file"
      >
        <DownloadIcon />
        <span>{busy === 'download' ? '…' : 'Download'}</span>
      </button>
      {!compact ? (
        <button
          type="button"
          disabled={busy !== null}
          onClick={() =>
            void handle('open', () => openResumeInNewTab(attachment.id))
          }
          className="inline-flex items-center gap-1 rounded border border-edge bg-well px-2 py-1 font-mono text-xs text-zinc-300 hover:border-lime-500/40 hover:text-lime-300 disabled:opacity-60"
          title="Open in new tab"
        >
          <ExternalIcon />
          <span>{busy === 'open' ? '…' : 'Open'}</span>
        </button>
      ) : null}
      <span className="ml-1 truncate font-mono text-xs text-zinc-400">
        {attachment.fileName} · {humanBytes(attachment.fileSize)}
      </span>
    </div>
  )
}

export function ResumeInlinePreview(props: {
  attachment: ResumeAttachment
  /** Preview viewport height in px; defaults to 320 */
  height?: number
}) {
  const { attachment } = props
  const lower = attachment.fileName.toLowerCase()
  const isPdf = attachment.fileType.includes('pdf') || lower.endsWith('.pdf')
  const isText =
    attachment.fileType.startsWith('text/') ||
    lower.endsWith('.txt') ||
    lower.endsWith('.md')
  const isImage =
    attachment.fileType.startsWith('image/') ||
    /\.(png|jpe?g|gif|webp|avif)$/i.test(attachment.fileName)
  const isDocx = isDocxFile(attachment.fileType, attachment.fileName)
  const isLegacyDoc = isLegacyDocFile(attachment.fileType, attachment.fileName)

  const [url, setUrl] = useState<string | null>(null)
  const [docxHtml, setDocxHtml] = useState<string | null>(null)
  const [docxError, setDocxError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let objectUrl: string | null = null
    setLoadError(null)
    setDocxError(null)
    setDocxHtml(null)
    setUrl(null)
    async function resolve() {
      let blob = attachment.data
      // Cloud mode seeds attachment.data as an empty placeholder Blob; the
      // real bytes have to be fetched from Supabase storage on demand.
      if (blob.size === 0) {
        try {
          const full = await getResume(attachment.id)
          if (cancelled) return
          if (!full || full.data.size === 0) {
            setLoadError('File not found on server.')
            return
          }
          blob = full.data
        } catch (err) {
          if (!cancelled) {
            setLoadError(
              err instanceof Error ? err.message : 'Failed to load file.',
            )
          }
          return
        }
      }
      if (isDocx) {
        // .docx → HTML via mammoth (pure client, images inlined as data URIs)
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
      // Everything else (PDF, text, image) renders via an object URL.
      objectUrl = URL.createObjectURL(blob)
      setUrl(objectUrl)
    }
    void resolve()
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [attachment.id, attachment.data, isDocx])

  const height = props.height ?? 320
  const typeLabel = isPdf
    ? 'PDF'
    : isText
      ? 'TEXT'
      : isDocx
        ? 'DOCX'
        : isLegacyDoc
          ? 'DOC'
          : isImage
            ? 'IMG'
            : attachment.fileType.split('/').pop()?.toUpperCase() || 'FILE'

  return (
    <div className="mt-2 overflow-hidden rounded-md border border-edge bg-gradient-to-b from-base to-well shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]">
      <div className="flex items-center justify-between gap-2 border-b border-edge bg-well/80 px-3 py-1.5 font-mono text-xs text-zinc-400">
        <span className="truncate">
          {attachment.fileName} · {humanBytes(attachment.fileSize)}
        </span>
        <span className="uppercase tracking-wider">{typeLabel}</span>
      </div>
      {renderBody({
        attachment,
        height,
        isPdf,
        isText,
        isDocx,
        isLegacyDoc,
        isImage,
        url,
        docxHtml,
        docxError,
        loadError,
        lower,
      })}
    </div>
  )
}

function renderBody(args: {
  attachment: ResumeAttachment
  height: number
  isPdf: boolean
  isText: boolean
  isDocx: boolean
  isLegacyDoc: boolean
  isImage: boolean
  url: string | null
  docxHtml: string | null
  docxError: string | null
  loadError: string | null
  lower: string
}) {
  const {
    attachment,
    height,
    isPdf,
    isText,
    isDocx,
    isLegacyDoc,
    isImage,
    url,
    docxHtml,
    docxError,
    loadError,
    lower,
  } = args

  if (loadError) {
    return (
      <div
        className="px-6 py-10 text-center font-mono text-xs text-amber-200"
        style={{ minHeight: height }}
      >
        {loadError}
      </div>
    )
  }

  if (isDocx) {
    if (docxError) {
      return (
        <div
          className="px-6 py-10 text-center font-mono text-xs text-amber-200"
          style={{ minHeight: height }}
        >
          Could not render Word document: {docxError}
        </div>
      )
    }
    if (docxHtml === null) {
      return (
        <div className="px-3 py-6 text-center font-mono text-xs text-zinc-400">
          Rendering Word document…
        </div>
      )
    }
    return (
      <div
        className="docx-preview overflow-auto bg-[#f8f7f3] px-6 py-5 text-sm text-zinc-900"
        style={{ maxHeight: height }}
        dangerouslySetInnerHTML={{ __html: docxHtml }}
      />
    )
  }

  if (isLegacyDoc) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-1 px-6 py-10 text-center font-mono text-xs text-zinc-400"
        style={{ minHeight: height }}
      >
        <span>
          Legacy <span className="text-zinc-200">.doc</span> files can&apos;t be
          previewed inline.
        </span>
        <span className="text-zinc-500">
          Re-save the file as{' '}
          <span className="text-lime-300">.docx</span> from Word, or use{' '}
          <span className="text-lime-300">Download</span> /{' '}
          <span className="text-lime-300">Open</span>.
        </span>
      </div>
    )
  }

  if (!url) {
    return (
      <div className="px-3 py-6 text-center font-mono text-xs text-zinc-400">
        Loading…
      </div>
    )
  }

  if (isPdf || isText) {
    return (
      <iframe
        src={url}
        title={attachment.fileName}
        style={{ height }}
        className="block w-full bg-base"
      />
    )
  }

  if (isImage) {
    return (
      <img
        src={url}
        alt={attachment.fileName}
        className="block max-h-[420px] w-full bg-black object-contain"
        style={{ maxHeight: height }}
      />
    )
  }

  return (
    <div
      className="flex items-center justify-center px-6 py-10 text-center font-mono text-xs text-zinc-400"
      style={{ minHeight: height }}
    >
      Inline preview not supported for{' '}
      <span className="mx-1 text-zinc-300">
        {attachment.fileType || lower.split('.').pop() || 'this type'}
      </span>
      <br />
      Use <span className="mx-1 text-lime-300">Download</span> or{' '}
      <span className="mx-1 text-lime-300">Open</span> to view.
    </div>
  )
}

function EyeIcon() {
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
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function DownloadIcon() {
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
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

function ExternalIcon() {
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
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
}
