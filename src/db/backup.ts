import { db, DEFAULT_SETTINGS, ensureDefaults } from './database'
import type {
  BackupPayload,
  SettingsRow,
  SystemDesignProblem,
} from './types'
import { SCHEMA_VERSION } from './types'
import {
  deserializePassionAttachments,
  serializePassionAttachments,
} from '../lib/passion'
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

export async function exportBackup(): Promise<BackupPayload> {
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
