import { db, DEFAULT_SETTINGS, ensureDefaults } from './database'
import type {
  Application,
  BackupPayload,
  BehavioralStory,
  DsaProblem,
  LifeTask,
  PassionAttachment,
  PassionIdea,
  ResumeAttachment,
  SettingsRow,
  SystemDesignProblem,
} from './types'
import { SCHEMA_VERSION } from './types'
import { isCloudDataActiveSnapshot } from '../cloud/active'
import * as repo from '../cloud/repository'
import { deserializePassionAttachments, serializePassionAttachments } from '../lib/passion'
import { deserializeResumes, serializeResumes } from '../lib/resume'
const SUPPORTED_SCHEMA_VERSIONS = new Set<number>([1, 2, 3, 4, 5])

function normalizeSystemDesign(rows: unknown[]): SystemDesignProblem[] {
  return (rows ?? []).map((row) => {
    const p = row as Partial<SystemDesignProblem> & { kind?: string }
    return {
      ...(p as SystemDesignProblem),
      kind: p.kind === 'lld' ? 'lld' : 'hld',
    }
  })
}

async function hydrateSupabaseFromDexieShapes(
  settings: SettingsRow,
  applications: Application[],
  dsaProblems: DsaProblem[],
  systemDesignProblems: SystemDesignProblem[],
  behavioralStories: BehavioralStory[],
  tasks: LifeTask[],
  resumeRows: ResumeAttachment[],
  passionIdeas: PassionIdea[],
  passionAttachmentRows: PassionAttachment[],
): Promise<void> {
  await repo.saveSettingsRow(settings)
  for (const r of resumeRows) {
    await repo.uploadResumeFile(
      r.id,
      new File([r.data], r.fileName, { type: r.fileType }),
    )
  }
  for (const r of passionAttachmentRows) {
    await repo.uploadPassionAttachment(
      r.id,
      new File([r.data], r.fileName, { type: r.fileType }),
    )
  }
  for (const a of applications) await repo.upsertApplication(a)
  for (const p of dsaProblems) await repo.upsertDsaProblem(p)
  for (const p of systemDesignProblems)
    await repo.upsertSystemDesignProblem(p)
  for (const s of behavioralStories) await repo.upsertBehavioralStory(s)
  for (const t of tasks) await repo.upsertTask(t)
  for (const idea of passionIdeas) await repo.upsertPassionIdea(idea)
}

export async function exportBackup(): Promise<BackupPayload> {
  if (isCloudDataActiveSnapshot()) {
    const [
      settingsRow,
      applications,
      dsaProblems,
      systemDesignProblems,
      behavioralStories,
      tasks,
      resumeMeta,
      passionIdeas,
      passionMeta,
    ] = await Promise.all([
      repo.fetchSettingsRow(),
      repo.fetchApplications(),
      repo.fetchDsaProblems(),
      repo.fetchSystemDesignProblems(),
      repo.fetchBehavioralStories(),
      repo.fetchTasks(),
      repo.fetchResumeFilesMeta(),
      repo.fetchPassionIdeas(),
      repo.fetchPassionAttachmentsMeta(),
    ])
    const resumeRows: ResumeAttachment[] = []
    for (const m of resumeMeta) {
      const full = await repo.getResumeAttachment(m.id)
      if (full) resumeRows.push(full)
    }
    const passionAttachmentRows: PassionAttachment[] = []
    for (const m of passionMeta) {
      const full = await repo.getPassionAttachment(m.id)
      if (full) passionAttachmentRows.push(full)
    }
    const resumeFiles = await serializeResumes(resumeRows)
    const passionAttachments = await serializePassionAttachments(
      passionAttachmentRows,
    )
    return {
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      settings: settingsRow,
      applications,
      dsaProblems,
      systemDesignProblems,
      behavioralStories,
      tasks,
      resumeFiles,
      passionIdeas,
      passionAttachments,
    }
  }

  const [
    settingsRow,
    applications,
    dsaProblems,
    systemDesignProblems,
    behavioralStories,
    tasks,
    resumeRows,
    passionIdeas,
    passionAttachmentRows,
  ] = await Promise.all([
    ensureDefaults(),
    db.applications.toArray(),
    db.dsaProblems.toArray(),
    db.systemDesignProblems.toArray(),
    db.behavioralStories.toArray(),
    db.tasks.toArray(),
    db.resumeFiles.toArray(),
    db.passionIdeas.toArray(),
    db.passionAttachments.toArray(),
  ])

  const resumeFiles = await serializeResumes(resumeRows)
  const passionAttachments = await serializePassionAttachments(
    passionAttachmentRows,
  )

  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    settings: settingsRow,
    applications,
    dsaProblems,
    systemDesignProblems,
    behavioralStories,
    tasks,
    resumeFiles,
    passionIdeas,
    passionAttachments,
  }
}

export async function importBackup(
  raw: unknown,
  mode: 'merge' | 'replace',
): Promise<void> {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid backup file')
  }
  const data = raw as Partial<BackupPayload>
  const ver = Number(data.schemaVersion)
  if (!SUPPORTED_SCHEMA_VERSIONS.has(ver)) {
    throw new Error(
      `Backup schema ${String(data.schemaVersion)} is not supported (expected ${Array.from(
        SUPPORTED_SCHEMA_VERSIONS,
      ).join(', ')})`,
    )
  }
  if (
    !Array.isArray(data.applications) ||
    !Array.isArray(data.dsaProblems) ||
    !Array.isArray(data.behavioralStories) ||
    !Array.isArray(data.tasks) ||
    !data.settings
  ) {
    throw new Error('Backup is missing required tables')
  }

  const restoredResumes =
    data.resumeFiles && Array.isArray(data.resumeFiles)
      ? deserializeResumes(data.resumeFiles)
      : []
  const restoredPassionAttachments =
    data.passionAttachments && Array.isArray(data.passionAttachments)
      ? deserializePassionAttachments(data.passionAttachments)
      : []
  const restoredPassionIdeas = Array.isArray(data.passionIdeas)
    ? data.passionIdeas
    : []

  if (isCloudDataActiveSnapshot()) {
    if (mode === 'replace') {
      await repo.deleteAllUserCloudData()
    }
    const s: SettingsRow = {
      ...DEFAULT_SETTINGS,
      ...(data.settings as SettingsRow),
      id: 'default',
    }
    await hydrateSupabaseFromDexieShapes(
      s,
      data.applications as Application[],
      data.dsaProblems as DsaProblem[],
      normalizeSystemDesign((data.systemDesignProblems ?? []) as unknown[]),
      data.behavioralStories as BehavioralStory[],
      data.tasks as LifeTask[],
      restoredResumes,
      restoredPassionIdeas,
      restoredPassionAttachments,
    )
    return
  }

  await db.transaction(
    'rw',
    [
      db.applications,
      db.dsaProblems,
      db.systemDesignProblems,
      db.behavioralStories,
      db.tasks,
      db.resumeFiles,
      db.passionIdeas,
      db.passionAttachments,
      db.settings,
    ],
    async () => {
      if (mode === 'replace') {
        await db.applications.clear()
        await db.dsaProblems.clear()
        await db.systemDesignProblems.clear()
        await db.behavioralStories.clear()
        await db.tasks.clear()
        await db.resumeFiles.clear()
        await db.passionIdeas.clear()
        await db.passionAttachments.clear()
      }
      const s = data.settings as SettingsRow
      await db.settings.put({
        ...DEFAULT_SETTINGS,
        ...s,
        id: 'default',
        updatedAt: Date.now(),
      })
      await db.applications.bulkPut(data.applications ?? [])
      await db.dsaProblems.bulkPut(data.dsaProblems ?? [])
      await db.systemDesignProblems.bulkPut(
        normalizeSystemDesign((data.systemDesignProblems ?? []) as unknown[]),
      )
      await db.behavioralStories.bulkPut(data.behavioralStories ?? [])
      await db.tasks.bulkPut(data.tasks ?? [])
      await db.resumeFiles.bulkPut(restoredResumes)
      await db.passionIdeas.bulkPut(restoredPassionIdeas)
      await db.passionAttachments.bulkPut(restoredPassionAttachments)
    },
  )
}

export async function resetAllData(): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.applications,
      db.dsaProblems,
      db.systemDesignProblems,
      db.behavioralStories,
      db.tasks,
      db.resumeFiles,
      db.passionIdeas,
      db.passionAttachments,
      db.settings,
    ],
    async () => {
      await db.applications.clear()
      await db.dsaProblems.clear()
      await db.systemDesignProblems.clear()
      await db.behavioralStories.clear()
      await db.tasks.clear()
      await db.resumeFiles.clear()
      await db.passionIdeas.clear()
      await db.passionAttachments.clear()
      await db.settings.clear()
      await db.settings.put({ ...DEFAULT_SETTINGS, updatedAt: Date.now() })
    },
  )
}
