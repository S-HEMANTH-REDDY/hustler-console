import { supabase } from '../lib/supabase'
import type {
  Application,
  BehavioralStory,
  DsaProblem,
  LifeTask,
  PassionAttachment,
  PassionIdea,
  PassionLink,
  PassionScheduleDoc,
  ResumeAttachment,
  SettingsRow,
  SystemDesignProblem,
} from '../db/types'
import {
  createEmptyPassionScheduleDoc,
  normalizePassionScheduleDoc,
} from '../lib/passionScheduleDoc'
import { DEFAULT_SETTINGS } from '../db/database'
import { bumpCloudSync } from './syncBus'

export function tsFromIso(iso: string): number {
  const t = Date.parse(iso)
  return Number.isFinite(t) ? t : Date.now()
}

export function isoFromMs(ms: number): string {
  return new Date(ms).toISOString()
}

function fileExt(name: string): string {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i) : '.bin'
}

/** Slugify a label for use as a storage object filename segment. */
function slugSegment(input: string | undefined | null, max = 40): string {
  if (!input) return ''
  const cleaned = String(input)
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
  return cleaned.slice(0, max)
}

/** Strip the extension before slugifying so we can re-append it cleanly. */
function slugFileBase(fileName: string, max = 40): string {
  const dot = fileName.lastIndexOf('.')
  const base = dot >= 0 ? fileName.slice(0, dot) : fileName
  return slugSegment(base, max)
}

/**
 * Build the storage object key for a resume upload. The first path segment
 * **must** stay the user id — the storage RLS policy splits on `/` and only
 * permits writes when `split_part(name, '/', 1)` matches `auth.uid()`.
 *
 * Optional `meta` (company + YYYY-MM-DD date) makes the object name
 * human-readable from the Supabase dashboard:
 *   `<uid>/2026-05-27_Stripe_a1b2c3d4_my-resume.pdf`
 * Falls back to the legacy `<uid>/<id><ext>` shape if no meta is supplied.
 */
export function resumeObjectPath(
  userId: string,
  id: string,
  fileName: string,
  meta?: { company?: string | null; date?: string | null },
): string {
  const ext = fileExt(fileName)
  const company = slugSegment(meta?.company, 32)
  const date = (meta?.date ?? '').trim()
  const base = slugFileBase(fileName, 40)
  const shortId = id.replace(/-/g, '').slice(0, 8) || 'r'
  const parts = [date, company, shortId, base].filter(Boolean)
  if (parts.length === 0) return `${userId}/${id}${ext}`
  return `${userId}/${parts.join('_')}${ext}`
}

export function passionObjectPath(
  userId: string,
  id: string,
  fileName: string,
): string {
  return `${userId}/${id}${fileExt(fileName)}`
}

function sb(): NonNullable<typeof supabase> {
  const c = supabase
  if (!c) throw new Error('Supabase not configured')
  return c
}

async function requireUser(): Promise<string> {
  const { data, error } = await sb().auth.getUser()
  const uid = data.user?.id
  if (error || !uid) throw new Error('Not signed in')
  return uid
}

/** Settings — map cloud row to SettingsRow (id always 'default' for UI). */
export async function fetchSettingsRow(): Promise<SettingsRow> {
  const userId = await requireUser()
  let { data, error } = await sb()
    .from('settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  if (!data) {
    await sb().from('settings').insert({
      user_id: userId,
      daily_min: DEFAULT_SETTINGS.dailyMin,
      daily_max: DEFAULT_SETTINGS.dailyMax,
      window_start: DEFAULT_SETTINGS.windowStart,
      window_end: DEFAULT_SETTINGS.windowEnd,
    })
    const again = await sb()
      .from('settings')
      .select('*')
      .eq('user_id', userId)
      .single()
    data = again.data!
  }
  return {
    id: 'default',
    dailyMin: data.daily_min as number,
    dailyMax: data.daily_max as number,
    windowStart: data.window_start as string,
    windowEnd: data.window_end as string,
    updatedAt: tsFromIso(data.updated_at as string),
  }
}

export async function saveSettingsRow(s: SettingsRow): Promise<void> {
  const userId = await requireUser()
  const { error } = await sb()
    .from('settings')
    .upsert(
      {
        user_id: userId,
        daily_min: s.dailyMin,
        daily_max: s.dailyMax,
        window_start: s.windowStart,
        window_end: s.windowEnd,
        updated_at: isoFromMs(Date.now()),
      },
      { onConflict: 'user_id' },
    )
  if (error) throw error
  bumpCloudSync()
}

export async function fetchApplications(): Promise<Application[]> {
  const userId = await requireUser()
  const { data, error } = await sb()
    .from('applications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(rowToApplication)
}

export async function countApplicationsForUser(): Promise<number> {
  const userId = await requireUser()
  const { count, error } = await sb()
    .from('applications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
  if (error) throw error
  return count ?? 0
}

function rowToApplication(r: Record<string, unknown>): Application {
  const d = r.date as string
  return {
    id: r.id as string,
    date: d.includes('T') ? d.slice(0, 10) : d,
    company: r.company as string,
    role: r.role as string,
    source: r.source as Application['source'],
    resumeVersion: r.resume_version as string,
    resumeFileId: (r.resume_file_id as string | null) ?? null,
    status: r.status as Application['status'],
    priority: r.priority as Application['priority'],
    createdAt: tsFromIso(r.created_at as string),
  }
}

export async function fetchApplicationById(
  id: string,
): Promise<Application | undefined> {
  const userId = await requireUser()
  const { data, error } = await sb()
    .from('applications')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()
  if (error || !data) return undefined
  return rowToApplication(data as Record<string, unknown>)
}

export async function upsertApplication(a: Application): Promise<void> {
  const userId = await requireUser()
  const { error } = await sb().from('applications').upsert(
    {
      id: a.id,
      user_id: userId,
      date: a.date,
      company: a.company,
      role: a.role,
      source: a.source,
      resume_version: a.resumeVersion,
      resume_file_id: a.resumeFileId ?? null,
      status: a.status,
      priority: a.priority,
      created_at: isoFromMs(a.createdAt),
    },
    { onConflict: 'id' },
  )
  if (error) throw error
  bumpCloudSync()
}

export async function patchApplication(
  id: string,
  partial: Partial<Application>,
): Promise<void> {
  const userId = await requireUser()
  const payload: Record<string, unknown> = {}
  if (partial.date !== undefined) payload.date = partial.date
  if (partial.company !== undefined) payload.company = partial.company
  if (partial.role !== undefined) payload.role = partial.role
  if (partial.source !== undefined) payload.source = partial.source
  if (partial.resumeVersion !== undefined)
    payload.resume_version = partial.resumeVersion
  if (partial.resumeFileId !== undefined)
    payload.resume_file_id = partial.resumeFileId
  if (partial.status !== undefined) payload.status = partial.status
  if (partial.priority !== undefined) payload.priority = partial.priority
  if (partial.createdAt !== undefined)
    payload.created_at = isoFromMs(partial.createdAt)
  const { error } = await sb()
    .from('applications')
    .update(payload)
    .eq('id', id)
    .eq('user_id', userId)
  if (error) throw error
  bumpCloudSync()
}

export async function deleteApplication(id: string): Promise<void> {
  const userId = await requireUser()
  const { error } = await sb()
    .from('applications')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
  if (error) throw error
  bumpCloudSync()
}

export async function fetchResumeFilesMeta(): Promise<
  Omit<ResumeAttachment, 'data'>[]
> {
  const userId = await requireUser()
  const { data, error } = await sb()
    .from('resume_files')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((r) => ({
    id: r.id as string,
    fileName: r.file_name as string,
    fileType: r.file_type as string,
    fileSize: Number(r.file_size),
    createdAt: tsFromIso(r.created_at as string),
  }))
}

export async function downloadResumeBlob(storagePath: string): Promise<Blob> {
  await requireUser()
  const path = storagePath
    .replace(/^resumes\//, '')
    .replace(/^\//, '')
    .trim()
  return downloadResumeFromPath(path || storagePath.trim())
}

/** Pass full storage_path from DB row (userId/uuid.ext format). */
export async function downloadResumeFromPath(path: string): Promise<Blob> {
  const res = await sb().storage.from('resumes').download(path)
  if (res.error) throw res.error
  return res.data
}

export async function getResumeAttachment(
  id: string,
): Promise<ResumeAttachment | undefined> {
  const userId = await requireUser()
  const { data, error } = await sb()
    .from('resume_files')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()
  if (error || !data) return undefined
  const blob = await downloadResumeFromPath(data.storage_path as string)
  return {
    id: data.id as string,
    fileName: data.file_name as string,
    fileType: data.file_type as string,
    fileSize: Number(data.file_size),
    data: blob,
    createdAt: tsFromIso(data.created_at as string),
  }
}

export async function uploadResumeFile(
  id: string,
  file: File,
  meta?: { company?: string | null; date?: string | null },
): Promise<{ storagePath: string }> {
  const userId = await requireUser()
  const path = resumeObjectPath(userId, id, file.name, meta)
  const { error: upErr } = await sb().storage
    .from('resumes')
    .upload(path, file, { upsert: true, contentType: file.type || undefined })
  if (upErr) throw upErr
  const { error: dbErr } = await sb().from('resume_files').upsert(
    {
      id,
      user_id: userId,
      file_name: file.name,
      file_type: file.type || 'application/octet-stream',
      file_size: file.size,
      storage_path: path,
      created_at: isoFromMs(Date.now()),
    },
    { onConflict: 'id' },
  )
  if (dbErr) throw dbErr
  bumpCloudSync()
  return { storagePath: path }
}

export async function deleteResumeFileRecord(id: string): Promise<void> {
  const userId = await requireUser()
  const { data } = await sb()
    .from('resume_files')
    .select('storage_path')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()
  if (data?.storage_path) {
    await sb().storage.from('resumes').remove([data.storage_path as string])
  }
  await sb()
    .from('resume_files')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
  bumpCloudSync()
}

export async function fetchDsaProblems(): Promise<DsaProblem[]> {
  const userId = await requireUser()
  const { data, error } = await sb()
    .from('dsa_problems')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((r) => ({
    id: r.id as string,
    date: ((r.date as string) ?? '').slice(0, 10),
    title: r.title as string,
    topic: r.topic as DsaProblem['topic'],
    difficulty: r.difficulty as DsaProblem['difficulty'],
    confidence: r.confidence as DsaProblem['confidence'],
    minutes: Number(r.minutes),
    createdAt: tsFromIso(r.created_at as string),
  }))
}

export async function upsertDsaProblem(p: DsaProblem): Promise<void> {
  const userId = await requireUser()
  const { error } = await sb().from('dsa_problems').upsert(
    {
      id: p.id,
      user_id: userId,
      date: p.date,
      title: p.title,
      topic: p.topic,
      difficulty: p.difficulty,
      confidence: p.confidence,
      minutes: p.minutes,
      created_at: isoFromMs(p.createdAt),
    },
    { onConflict: 'id' },
  )
  if (error) throw error
  bumpCloudSync()
}

export async function patchDsaProblem(
  id: string,
  partial: Partial<DsaProblem>,
): Promise<void> {
  const userId = await requireUser()
  const payload: Record<string, unknown> = {}
  if (partial.date !== undefined) payload.date = partial.date
  if (partial.title !== undefined) payload.title = partial.title
  if (partial.topic !== undefined) payload.topic = partial.topic
  if (partial.difficulty !== undefined) payload.difficulty = partial.difficulty
  if (partial.confidence !== undefined) payload.confidence = partial.confidence
  if (partial.minutes !== undefined) payload.minutes = partial.minutes
  if (partial.createdAt !== undefined)
    payload.created_at = isoFromMs(partial.createdAt)
  const { error } = await sb()
    .from('dsa_problems')
    .update(payload)
    .eq('id', id)
    .eq('user_id', userId)
  if (error) throw error
  bumpCloudSync()
}

export async function deleteDsaProblem(id: string): Promise<void> {
  const userId = await requireUser()
  await sb().from('dsa_problems').delete().eq('id', id).eq('user_id', userId)
  bumpCloudSync()
}

export async function fetchSystemDesignProblems(): Promise<
  SystemDesignProblem[]
> {
  const userId = await requireUser()
  const { data, error } = await sb()
    .from('system_design_problems')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((r) => ({
    id: r.id as string,
    date: ((r.date as string) ?? '').slice(0, 10),
    title: r.title as string,
    kind: r.kind as SystemDesignProblem['kind'],
    topic: r.topic as SystemDesignProblem['topic'],
    difficulty: r.difficulty as SystemDesignProblem['difficulty'],
    confidence: r.confidence as SystemDesignProblem['confidence'],
    minutes: Number(r.minutes),
    notes: (r.notes as string) ?? '',
    createdAt: tsFromIso(r.created_at as string),
  }))
}

export async function upsertSystemDesignProblem(
  p: SystemDesignProblem,
): Promise<void> {
  const userId = await requireUser()
  const { error } = await sb().from('system_design_problems').upsert(
    {
      id: p.id,
      user_id: userId,
      date: p.date,
      title: p.title,
      kind: p.kind,
      topic: p.topic,
      difficulty: p.difficulty,
      confidence: p.confidence,
      minutes: p.minutes,
      notes: p.notes,
      created_at: isoFromMs(p.createdAt),
    },
    { onConflict: 'id' },
  )
  if (error) throw error
  bumpCloudSync()
}

export async function patchSystemDesignProblem(
  id: string,
  partial: Partial<SystemDesignProblem>,
): Promise<void> {
  const userId = await requireUser()
  const payload: Record<string, unknown> = {}
  if (partial.date !== undefined) payload.date = partial.date
  if (partial.title !== undefined) payload.title = partial.title
  if (partial.kind !== undefined) payload.kind = partial.kind
  if (partial.topic !== undefined) payload.topic = partial.topic
  if (partial.difficulty !== undefined) payload.difficulty = partial.difficulty
  if (partial.confidence !== undefined) payload.confidence = partial.confidence
  if (partial.minutes !== undefined) payload.minutes = partial.minutes
  if (partial.notes !== undefined) payload.notes = partial.notes
  if (partial.createdAt !== undefined)
    payload.created_at = isoFromMs(partial.createdAt)
  const { error } = await sb()
    .from('system_design_problems')
    .update(payload)
    .eq('id', id)
    .eq('user_id', userId)
  if (error) throw error
  bumpCloudSync()
}

export async function deleteSystemDesignProblem(id: string): Promise<void> {
  const userId = await requireUser()
  await sb()
    .from('system_design_problems')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
  bumpCloudSync()
}

export async function fetchBehavioralStories(): Promise<BehavioralStory[]> {
  const userId = await requireUser()
  const { data, error } = await sb()
    .from('behavioral_stories')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((r) => ({
    id: r.id as string,
    title: r.title as string,
    category: r.category as BehavioralStory['category'],
    status: r.status as BehavioralStory['status'],
    confidence: r.confidence as BehavioralStory['confidence'],
    situation: (r.situation as string) ?? '',
    task: (r.task as string) ?? '',
    action: (r.action as string) ?? '',
    result: (r.result as string) ?? '',
    updatedAt: tsFromIso(r.updated_at as string),
  }))
}

export async function upsertBehavioralStory(s: BehavioralStory): Promise<void> {
  const userId = await requireUser()
  const { error } = await sb().from('behavioral_stories').upsert(
    {
      id: s.id,
      user_id: userId,
      title: s.title,
      category: s.category,
      status: s.status,
      confidence: s.confidence,
      situation: s.situation,
      task: s.task,
      action: s.action,
      result: s.result,
      updated_at: isoFromMs(s.updatedAt),
    },
    { onConflict: 'id' },
  )
  if (error) throw error
  bumpCloudSync()
}

export async function patchBehavioralStory(
  id: string,
  partial: Partial<BehavioralStory>,
): Promise<void> {
  const userId = await requireUser()
  const payload: Record<string, unknown> = {}
  if (partial.title !== undefined) payload.title = partial.title
  if (partial.category !== undefined) payload.category = partial.category
  if (partial.status !== undefined) payload.status = partial.status
  if (partial.confidence !== undefined) payload.confidence = partial.confidence
  if (partial.situation !== undefined) payload.situation = partial.situation
  if (partial.task !== undefined) payload.task = partial.task
  if (partial.action !== undefined) payload.action = partial.action
  if (partial.result !== undefined) payload.result = partial.result
  if (partial.updatedAt !== undefined)
    payload.updated_at = isoFromMs(partial.updatedAt)
  else payload.updated_at = isoFromMs(Date.now())
  const { error } = await sb()
    .from('behavioral_stories')
    .update(payload)
    .eq('id', id)
    .eq('user_id', userId)
  if (error) throw error
  bumpCloudSync()
}

export async function deleteBehavioralStory(id: string): Promise<void> {
  const userId = await requireUser()
  await sb()
    .from('behavioral_stories')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
  bumpCloudSync()
}

export async function fetchTasks(): Promise<LifeTask[]> {
  const userId = await requireUser()
  const { data, error } = await sb()
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((r) => ({
    id: r.id as string,
    title: r.title as string,
    priority: r.priority as LifeTask['priority'],
    recurrence: r.recurrence as LifeTask['recurrence'],
    lastCompletedAt:
      (r.last_completed_at as string | null)?.slice(0, 10) ?? null,
    dueDate: (r.due_date as string | null)?.slice(0, 10) ?? null,
    dueTime: (r.due_time as string | null) ?? null,
    createdAt: tsFromIso(r.created_at as string),
  }))
}

export async function upsertTask(t: LifeTask): Promise<void> {
  const userId = await requireUser()
  const { error } = await sb().from('tasks').upsert(
    {
      id: t.id,
      user_id: userId,
      title: t.title,
      priority: t.priority,
      recurrence: t.recurrence,
      last_completed_at: t.lastCompletedAt,
      due_date: t.dueDate,
      due_time: t.dueTime,
      created_at: isoFromMs(t.createdAt),
    },
    { onConflict: 'id' },
  )
  if (error) throw error
  bumpCloudSync()
}

export async function patchTask(
  id: string,
  partial: Partial<LifeTask>,
): Promise<void> {
  const userId = await requireUser()
  const payload: Record<string, unknown> = {}
  if (partial.title !== undefined) payload.title = partial.title
  if (partial.priority !== undefined) payload.priority = partial.priority
  if (partial.recurrence !== undefined) payload.recurrence = partial.recurrence
  if (partial.lastCompletedAt !== undefined)
    payload.last_completed_at = partial.lastCompletedAt
  if (partial.dueDate !== undefined) payload.due_date = partial.dueDate
  if (partial.dueTime !== undefined) payload.due_time = partial.dueTime
  if (partial.createdAt !== undefined)
    payload.created_at = isoFromMs(partial.createdAt)
  const { error } = await sb()
    .from('tasks')
    .update(payload)
    .eq('id', id)
    .eq('user_id', userId)
  if (error) throw error
  bumpCloudSync()
}

export async function deleteTask(id: string): Promise<void> {
  const userId = await requireUser()
  await sb().from('tasks').delete().eq('id', id).eq('user_id', userId)
  bumpCloudSync()
}

function coerceUuidStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.map((x) => String(x))
}

function coercePassionLinks(raw: unknown): PassionLink[] {
  if (!Array.isArray(raw)) return []
  return raw as PassionLink[]
}

export async function fetchPassionIdeas(): Promise<PassionIdea[]> {
  const userId = await requireUser()
  const { data, error } = await sb()
    .from('passion_ideas')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((r) => ({
    id: r.id as string,
    title: r.title as string,
    tag: r.tag as PassionIdea['tag'],
    notes: r.notes as string,
    links: coercePassionLinks(r.links),
    attachmentIds: coerceUuidStringArray(r.attachment_ids),
    thinkMinutes: r.think_minutes as number,
    thinkMinutesTotal: r.think_minutes_total as number,
    sessionsCompleted: r.sessions_completed as number,
    createdAt: tsFromIso(r.created_at as string),
    updatedAt: tsFromIso(r.updated_at as string),
  }))
}

export async function fetchPassionIdeaById(
  id: string,
): Promise<PassionIdea | undefined> {
  const userId = await requireUser()
  const { data, error } = await sb()
    .from('passion_ideas')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()
  if (error || !data) return undefined
  const r = data as Record<string, unknown>
  return {
    id: r.id as string,
    title: r.title as string,
    tag: r.tag as PassionIdea['tag'],
    notes: r.notes as string,
    links: coercePassionLinks(r.links),
    attachmentIds: coerceUuidStringArray(r.attachment_ids),
    thinkMinutes: r.think_minutes as number,
    thinkMinutesTotal: r.think_minutes_total as number,
    sessionsCompleted: r.sessions_completed as number,
    createdAt: tsFromIso(r.created_at as string),
    updatedAt: tsFromIso(r.updated_at as string),
  }
}

export async function upsertPassionIdea(idea: PassionIdea): Promise<void> {
  const userId = await requireUser()
  const { error } = await sb().from('passion_ideas').upsert(
    {
      id: idea.id,
      user_id: userId,
      title: idea.title,
      tag: idea.tag,
      notes: idea.notes,
      links: idea.links,
      attachment_ids: idea.attachmentIds,
      think_minutes: idea.thinkMinutes,
      think_minutes_total: idea.thinkMinutesTotal,
      sessions_completed: idea.sessionsCompleted,
      created_at: isoFromMs(idea.createdAt),
      updated_at: isoFromMs(idea.updatedAt),
    },
    { onConflict: 'id' },
  )
  if (error) throw error
  bumpCloudSync()
}

export async function patchPassionIdea(
  id: string,
  partial: Partial<PassionIdea>,
): Promise<void> {
  const userId = await requireUser()
  const payload: Record<string, unknown> = {}
  if (partial.title !== undefined) payload.title = partial.title
  if (partial.tag !== undefined) payload.tag = partial.tag
  if (partial.notes !== undefined) payload.notes = partial.notes
  if (partial.links !== undefined) payload.links = partial.links
  if (partial.attachmentIds !== undefined)
    payload.attachment_ids = partial.attachmentIds
  if (partial.thinkMinutes !== undefined)
    payload.think_minutes = partial.thinkMinutes
  if (partial.thinkMinutesTotal !== undefined)
    payload.think_minutes_total = partial.thinkMinutesTotal
  if (partial.sessionsCompleted !== undefined)
    payload.sessions_completed = partial.sessionsCompleted
  payload.updated_at = isoFromMs(Date.now())
  const { error } = await sb()
    .from('passion_ideas')
    .update(payload)
    .eq('id', id)
    .eq('user_id', userId)
  if (error) throw error
  bumpCloudSync()
}

export async function deletePassionIdea(id: string): Promise<void> {
  const userId = await requireUser()
  await sb()
    .from('passion_ideas')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
  bumpCloudSync()
}

/** Metadata only — use `getPassionAttachment` when bytes are needed. */
export async function fetchPassionAttachmentsMeta(): Promise<
  PassionAttachment[]
> {
  const userId = await requireUser()
  const { data, error } = await sb()
    .from('passion_attachments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((r) => ({
    id: r.id as string,
    fileName: r.file_name as string,
    fileType: r.file_type as string,
    fileSize: Number(r.file_size),
    data: new Blob([], { type: String(r.file_type) }),
    createdAt: tsFromIso(r.created_at as string),
  }))
}

export async function getPassionAttachment(
  id: string,
): Promise<PassionAttachment | undefined> {
  const userId = await requireUser()
  const { data, error } = await sb()
    .from('passion_attachments')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()
  if (error || !data) return undefined
  const dl = await sb().storage.from('passion').download(data.storage_path as string)
  if (dl.error) throw dl.error
  return {
    id: data.id as string,
    fileName: data.file_name as string,
    fileType: data.file_type as string,
    fileSize: Number(data.file_size),
    data: dl.data,
    createdAt: tsFromIso(data.created_at as string),
  }
}

export async function uploadPassionAttachment(
  id: string,
  file: File,
): Promise<void> {
  const userId = await requireUser()
  const path = passionObjectPath(userId, id, file.name)
  const { error: upErr } = await sb().storage
    .from('passion')
    .upload(path, file, { upsert: true, contentType: file.type || undefined })
  if (upErr) throw upErr
  const { error: dbErr } = await sb().from('passion_attachments').upsert(
    {
      id,
      user_id: userId,
      file_name: file.name,
      file_type: file.type || 'application/octet-stream',
      file_size: file.size,
      storage_path: path,
      created_at: isoFromMs(Date.now()),
    },
    { onConflict: 'id' },
  )
  if (dbErr) throw dbErr
  bumpCloudSync()
}

export async function deletePassionAttachmentCloud(id: string): Promise<void> {
  const userId = await requireUser()
  const { data } = await sb()
    .from('passion_attachments')
    .select('storage_path')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()
  if (data?.storage_path) {
    await sb().storage.from('passion').remove([data.storage_path as string])
  }
  await sb()
    .from('passion_attachments')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
  bumpCloudSync()
}

/** Per-user Passion timetable · empty template until the user saves (RLS hides others). */
export async function fetchPassionSchedule(): Promise<PassionScheduleDoc> {
  const userId = await requireUser()
  const { data, error } = await sb()
    .from('passion_schedule')
    .select('daily_json, weekend_json, updated_at')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  if (!data) return createEmptyPassionScheduleDoc()
  return normalizePassionScheduleDoc({
    id: 'default',
    dailyRows: data.daily_json,
    weekendRows: data.weekend_json,
    updatedAt: tsFromIso(data.updated_at as string),
  })
}

export async function upsertPassionSchedule(doc: PassionScheduleDoc): Promise<void> {
  const userId = await requireUser()
  const { error } = await sb()
    .from('passion_schedule')
    .upsert(
      {
        user_id: userId,
        daily_json: doc.dailyRows,
        weekend_json: doc.weekendRows,
        updated_at: isoFromMs(doc.updatedAt),
      },
      { onConflict: 'user_id' },
    )
  if (error) throw error
  bumpCloudSync()
}

export async function deleteAllUserCloudData(): Promise<void> {
  const userId = await requireUser()

  const { data: resumes } = await sb().storage
    .from('resumes')
    .list(userId)
  const { data: passion } = await sb().storage.from('passion').list(userId)

  const resumePaths = (resumes ?? [])
    .map((x) => `${userId}/${x.name}`)
  const passionPaths = (passion ?? []).map((x) => `${userId}/${x.name}`)
  if (resumePaths.length) await sb().storage.from('resumes').remove(resumePaths)
  if (passionPaths.length) await sb().storage.from('passion').remove(passionPaths)

  await sb().from('applications').delete().eq('user_id', userId)
  await sb().from('dsa_problems').delete().eq('user_id', userId)
  await sb().from('system_design_problems').delete().eq('user_id', userId)
  await sb().from('behavioral_stories').delete().eq('user_id', userId)
  await sb().from('tasks').delete().eq('user_id', userId)
  await sb().from('passion_ideas').delete().eq('user_id', userId)
  await sb().from('resume_files').delete().eq('user_id', userId)
  await sb().from('passion_attachments').delete().eq('user_id', userId)
  await sb().from('passion_schedule').delete().eq('user_id', userId)
  await sb().from('settings').delete().eq('user_id', userId)
  bumpCloudSync()
}
