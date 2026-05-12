import { db } from '../db/database'
import type {
  ResumeAttachment,
  SerializedResumeAttachment,
} from '../db/types'
import { newId } from './utils'

/** Soft cap to avoid quietly exploding IndexedDB. */
export const RESUME_MAX_BYTES = 8 * 1024 * 1024

const ACCEPT = '.pdf,.doc,.docx,.txt,.md,application/pdf'

export const RESUME_ACCEPT = ACCEPT

export function humanBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(2)} MB`
}

export async function attachResumeFromFile(file: File): Promise<string> {
  if (file.size === 0) {
    throw new Error('Empty file')
  }
  if (file.size > RESUME_MAX_BYTES) {
    throw new Error(
      `File too large (${humanBytes(file.size)} > ${humanBytes(RESUME_MAX_BYTES)})`,
    )
  }
  const row: ResumeAttachment = {
    id: newId(),
    fileName: file.name,
    fileType: file.type || 'application/octet-stream',
    fileSize: file.size,
    data: file,
    createdAt: Date.now(),
  }
  await db.resumeFiles.add(row)
  return row.id
}

export async function getResume(
  id: string,
): Promise<ResumeAttachment | undefined> {
  return db.resumeFiles.get(id)
}

export async function openResumeInNewTab(id: string): Promise<void> {
  const r = await db.resumeFiles.get(id)
  if (!r) return
  const url = URL.createObjectURL(r.data)
  const win = window.open(url, '_blank', 'noopener,noreferrer')
  // Some browsers may pop-up-block: if so, fall back to a download.
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

export async function downloadResume(id: string): Promise<void> {
  const r = await db.resumeFiles.get(id)
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

export async function replaceResume(
  appId: string,
  file: File,
): Promise<string> {
  const app = await db.applications.get(appId)
  if (!app) throw new Error('Application not found')
  if (app.resumeFileId) {
    await db.resumeFiles.delete(app.resumeFileId).catch(() => undefined)
  }
  const newFileId = await attachResumeFromFile(file)
  await db.applications.update(appId, { resumeFileId: newFileId })
  return newFileId
}

export async function detachResume(appId: string): Promise<void> {
  const app = await db.applications.get(appId)
  if (!app?.resumeFileId) return
  await db.resumeFiles.delete(app.resumeFileId).catch(() => undefined)
  await db.applications.update(appId, { resumeFileId: null })
}

export async function deleteOrphanResume(
  fileId: string | null | undefined,
): Promise<void> {
  if (!fileId) return
  await db.resumeFiles.delete(fileId).catch(() => undefined)
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer())
  let bin = ''
  const CHUNK = 0x8000
  for (let i = 0; i < buf.length; i += CHUNK) {
    bin += String.fromCharCode.apply(
      null,
      // copy to plain array so apply works in all engines for any chunk size
      Array.from(buf.subarray(i, i + CHUNK)),
    )
  }
  return btoa(bin)
}

export function base64ToBlob(b64: string, type: string): Blob {
  const bin = atob(b64)
  const buf = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i)
  return new Blob([buf], { type })
}

export async function serializeResumes(
  rows: ResumeAttachment[],
): Promise<SerializedResumeAttachment[]> {
  const out: SerializedResumeAttachment[] = []
  for (const r of rows) {
    const base64 = await blobToBase64(r.data)
    out.push({
      id: r.id,
      fileName: r.fileName,
      fileType: r.fileType,
      fileSize: r.fileSize,
      base64,
      createdAt: r.createdAt,
    })
  }
  return out
}

export function deserializeResumes(
  rows: SerializedResumeAttachment[],
): ResumeAttachment[] {
  return rows.map((r) => ({
    id: r.id,
    fileName: r.fileName,
    fileType: r.fileType,
    fileSize: r.fileSize,
    data: base64ToBlob(r.base64, r.fileType),
    createdAt: r.createdAt,
  }))
}
