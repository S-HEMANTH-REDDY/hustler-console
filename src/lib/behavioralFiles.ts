import * as repo from '../cloud/repository'
import { isCloudDataActiveSnapshot } from '../cloud/active'
import { db } from '../db/database'
import type { BehavioralAttachment } from '../db/types'
import { humanBytes } from './resume'
import { newId } from './utils'

export { humanBytes }

export const BEHAVIORAL_ACCEPT =
  '.pdf,.doc,.docx,.txt,.md,application/pdf'

export const BEHAVIORAL_MAX_BYTES = 12 * 1024 * 1024

export async function attachBehavioralFile(file: File): Promise<string> {
  if (file.size === 0) throw new Error('Empty file')
  if (file.size > BEHAVIORAL_MAX_BYTES) {
    throw new Error(
      `File too large (${humanBytes(file.size)} > ${humanBytes(BEHAVIORAL_MAX_BYTES)})`,
    )
  }
  const id = newId()
  if (isCloudDataActiveSnapshot()) {
    await repo.uploadBehavioralAttachment(id, file)
    return id
  }
  const row: BehavioralAttachment = {
    id,
    fileName: file.name,
    fileType: file.type || 'application/octet-stream',
    fileSize: file.size,
    data: file,
    createdAt: Date.now(),
  }
  await db.behavioralAttachments.add(row)
  return id
}

export async function getBehavioralAttachmentById(
  id: string,
): Promise<BehavioralAttachment | undefined> {
  if (isCloudDataActiveSnapshot()) return repo.getBehavioralAttachment(id)
  return db.behavioralAttachments.get(id)
}

async function loadBehavioralBlob(
  id: string,
): Promise<BehavioralAttachment | undefined> {
  if (isCloudDataActiveSnapshot()) return repo.getBehavioralAttachment(id)
  return db.behavioralAttachments.get(id)
}

export async function downloadBehavioralFile(id: string): Promise<void> {
  const r = await loadBehavioralBlob(id)
  if (!r || r.data.size === 0) return
  const url = URL.createObjectURL(r.data)
  const a = document.createElement('a')
  a.href = url
  a.download = r.fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export async function openBehavioralFileInNewTab(id: string): Promise<void> {
  const r = await loadBehavioralBlob(id)
  if (!r || r.data.size === 0) return
  const url = URL.createObjectURL(r.data)
  const win = window.open(url, '_blank', 'noopener,noreferrer')
  if (!win) {
    await downloadBehavioralFile(id)
    return
  }
  setTimeout(() => URL.revokeObjectURL(url), 120_000)
}

export async function deleteBehavioralFile(id: string): Promise<void> {
  if (isCloudDataActiveSnapshot()) {
    await repo.deleteBehavioralAttachmentRecord(id).catch(() => undefined)
    return
  }
  await db.behavioralAttachments.delete(id).catch(() => undefined)
}
