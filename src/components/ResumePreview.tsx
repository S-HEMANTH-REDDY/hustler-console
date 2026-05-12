import { useEffect, useState } from 'react'
import type { ResumeAttachment } from '../db/types'
import { downloadResume, humanBytes, openResumeInNewTab } from '../lib/resume'
import { cn } from '../lib/utils'

export function ResumePreviewToolbar(props: {
  attachment: ResumeAttachment
  expanded: boolean
  onToggle: () => void
  compact?: boolean
}) {
  const { attachment, expanded, onToggle, compact } = props
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
            : 'border-[#232328] bg-[#0f0f12] text-zinc-300 hover:border-lime-500/40 hover:text-lime-300',
        )}
        title={expanded ? 'Hide preview' : 'Preview inline'}
      >
        <EyeIcon />
        <span>{expanded ? 'Hide' : 'Preview'}</span>
      </button>
      <button
        type="button"
        onClick={() => void downloadResume(attachment.id)}
        className="inline-flex items-center gap-1 rounded border border-[#232328] bg-[#0f0f12] px-2 py-1 font-mono text-xs text-zinc-300 hover:border-lime-500/40 hover:text-lime-300"
        title="Download file"
      >
        <DownloadIcon />
        <span>Download</span>
      </button>
      {!compact ? (
        <button
          type="button"
          onClick={() => void openResumeInNewTab(attachment.id)}
          className="inline-flex items-center gap-1 rounded border border-[#232328] bg-[#0f0f12] px-2 py-1 font-mono text-xs text-zinc-300 hover:border-lime-500/40 hover:text-lime-300"
          title="Open in new tab"
        >
          <ExternalIcon />
          <span>Open</span>
        </button>
      ) : null}
      <span className="ml-1 truncate font-mono text-xs text-zinc-500">
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
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    const u = URL.createObjectURL(attachment.data)
    setUrl(u)
    return () => {
      URL.revokeObjectURL(u)
    }
  }, [attachment.id, attachment.data])

  const lower = attachment.fileName.toLowerCase()
  const isPdf =
    attachment.fileType.includes('pdf') || lower.endsWith('.pdf')
  const isText =
    attachment.fileType.startsWith('text/') ||
    lower.endsWith('.txt') ||
    lower.endsWith('.md')
  const height = props.height ?? 320

  return (
    <div className="mt-2 overflow-hidden rounded-md border border-[#232328] bg-gradient-to-b from-[#0a0a0b] to-[#0d0d10] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]">
      <div className="flex items-center justify-between gap-2 border-b border-[#232328] bg-[#0f0f12]/80 px-3 py-1.5 font-mono text-xs text-zinc-500">
        <span className="truncate">
          {attachment.fileName} · {humanBytes(attachment.fileSize)}
        </span>
        <span className="uppercase tracking-wider">
          {isPdf
            ? 'PDF'
            : isText
              ? 'TEXT'
              : attachment.fileType.split('/').pop()?.toUpperCase() || 'FILE'}
        </span>
      </div>
      {url ? (
        isPdf || isText ? (
          <iframe
            src={url}
            title={attachment.fileName}
            style={{ height }}
            className="block w-full bg-[#0a0a0b]"
          />
        ) : (
          <div
            className="flex items-center justify-center px-6 py-10 text-center font-mono text-xs text-zinc-500"
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
      ) : (
        <div className="px-3 py-6 text-center font-mono text-xs text-zinc-500">
          Loading…
        </div>
      )}
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
