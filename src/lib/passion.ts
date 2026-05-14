import { db } from '../db/database'
import { isCloudDataActiveSnapshot } from '../cloud/active'
import * as repo from '../cloud/repository'
import type {
  PassionAttachment,
  PassionIdea,
  PassionLink,
  PassionTag,
  SerializedPassionAttachment,
} from '../db/types'
import { base64ToBlob, blobToBase64, humanBytes } from './resume'
import { newId } from './utils'

/** Soft cap to avoid quietly exploding IndexedDB. */
export const PASSION_MAX_BYTES = 12 * 1024 * 1024

export const PASSION_ACCEPT =
  '.pdf,.doc,.docx,.txt,.md,.markdown,.html,.png,.jpg,.jpeg,.gif,.webp,application/pdf'

export { humanBytes }

export const PASSION_TAGS: PassionTag[] = [
  'idea',
  'startup',
  'agi',
  'research',
  'innovation',
  'other',
]

export const PASSION_TAG_COLORS: Record<PassionTag, string> = {
  idea: '#a78bfa',
  startup: '#84cc16',
  agi: '#06b6d4',
  research: '#f59e0b',
  innovation: '#ec4899',
  other: '#71717a',
}

/** Default duration of a single "think" session in minutes. */
export const DEFAULT_THINK_MINUTES = 45

export function newIdea(partial?: Partial<PassionIdea>): PassionIdea {
  const now = Date.now()
  return {
    id: newId(),
    title: 'Untitled idea',
    tag: 'idea',
    notes: '',
    links: [],
    attachmentIds: [],
    thinkMinutes: DEFAULT_THINK_MINUTES,
    thinkMinutesTotal: 0,
    sessionsCompleted: 0,
    createdAt: now,
    updatedAt: now,
    ...partial,
  }
}

export async function attachPassionFile(file: File): Promise<string> {
  if (file.size === 0) throw new Error('Empty file')
  if (file.size > PASSION_MAX_BYTES) {
    throw new Error(
      `File too large (${humanBytes(file.size)} > ${humanBytes(PASSION_MAX_BYTES)})`,
    )
  }
  const id = newId()
  if (isCloudDataActiveSnapshot()) {
    await repo.uploadPassionAttachment(id, file)
    return id
  }
  const row: PassionAttachment = {
    id,
    fileName: file.name,
    fileType: file.type || 'application/octet-stream',
    fileSize: file.size,
    data: file,
    createdAt: Date.now(),
  }
  await db.passionAttachments.add(row)
  return row.id
}

export async function downloadPassionFile(id: string): Promise<void> {
  const r = isCloudDataActiveSnapshot()
    ? await repo.getPassionAttachment(id)
    : await db.passionAttachments.get(id)
  if (!r) return
  const url = URL.createObjectURL(r.data)
  const a = document.createElement('a')
  a.href = url
  a.download = r.fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export async function openPassionFileInNewTab(id: string): Promise<void> {
  const r = isCloudDataActiveSnapshot()
    ? await repo.getPassionAttachment(id)
    : await db.passionAttachments.get(id)
  if (!r) return
  const url = URL.createObjectURL(r.data)
  const win = window.open(url, '_blank', 'noopener,noreferrer')
  if (!win) {
    const a = document.createElement('a')
    a.href = url
    a.download = r.fileName
    document.body.appendChild(a)
    a.click()
    a.remove()
  }
  setTimeout(() => URL.revokeObjectURL(url), 120_000)
}

export async function deletePassionFile(id: string): Promise<void> {
  if (isCloudDataActiveSnapshot()) {
    await repo.deletePassionAttachmentCloud(id).catch(() => undefined)
    return
  }
  await db.passionAttachments.delete(id).catch(() => undefined)
}

export async function getPassionAttachmentById(
  id: string,
): Promise<PassionAttachment | undefined> {
  if (isCloudDataActiveSnapshot()) return repo.getPassionAttachment(id)
  return db.passionAttachments.get(id)
}

/* ----------------------- YouTube URL handling ----------------------- */

/**
 * Parses common YouTube URL shapes and returns the 11-char video id, or
 * `null` for non-YouTube URLs. Supports:
 *   - youtube.com/watch?v=ID
 *   - youtu.be/ID
 *   - youtube.com/shorts/ID
 *   - youtube.com/embed/ID
 *   - youtube.com/live/ID
 */
export function parseYoutubeId(input: string): string | null {
  const raw = input.trim()
  if (!raw) return null
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }
  const host = url.hostname.replace(/^www\./, '').toLowerCase()
  if (host === 'youtu.be') {
    const id = url.pathname.slice(1).split('/')[0]
    return isValidYoutubeId(id) ? id : null
  }
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
    if (url.pathname === '/watch') {
      const id = url.searchParams.get('v')
      return id && isValidYoutubeId(id) ? id : null
    }
    const parts = url.pathname.split('/').filter(Boolean)
    if (
      parts.length >= 2 &&
      (parts[0] === 'shorts' || parts[0] === 'embed' || parts[0] === 'live')
    ) {
      return isValidYoutubeId(parts[1]) ? parts[1] : null
    }
  }
  return null
}

function isValidYoutubeId(id: string | null | undefined): boolean {
  return !!id && /^[a-zA-Z0-9_-]{11}$/.test(id)
}

export function youtubeThumbnailUrl(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
}

export function youtubeEmbedUrl(id: string): string {
  return `https://www.youtube.com/embed/${id}`
}

export function makePassionLink(url: string, label?: string): PassionLink {
  const trimmed = url.trim()
  const yt = parseYoutubeId(trimmed)
  return {
    id: newId(),
    url: trimmed,
    label: label?.trim() || undefined,
    youtubeId: yt,
    createdAt: Date.now(),
  }
}

export function isYoutubeLink(link: PassionLink): boolean {
  return !!link.youtubeId
}

/** Pretty hostname for the link tile. */
export function linkHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/* ----------------------- Backup serialization ----------------------- */

export async function serializePassionAttachments(
  rows: PassionAttachment[],
): Promise<SerializedPassionAttachment[]> {
  const out: SerializedPassionAttachment[] = []
  for (const r of rows) {
    out.push({
      id: r.id,
      fileName: r.fileName,
      fileType: r.fileType,
      fileSize: r.fileSize,
      base64: await blobToBase64(r.data),
      createdAt: r.createdAt,
    })
  }
  return out
}

export function deserializePassionAttachments(
  rows: SerializedPassionAttachment[],
): PassionAttachment[] {
  return rows.map((r) => ({
    id: r.id,
    fileName: r.fileName,
    fileType: r.fileType,
    fileSize: r.fileSize,
    data: base64ToBlob(r.base64, r.fileType),
    createdAt: r.createdAt,
  }))
}
