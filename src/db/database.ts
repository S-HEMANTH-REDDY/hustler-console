import Dexie, { type Table } from 'dexie'
import { createEmptyPassionScheduleDoc, normalizePassionScheduleDoc } from '../lib/passionScheduleDoc'
import type {
  Application,
  BehavioralStory,
  BehavioralAttachment,
  DsaProblem,
  LifeTask,
  PassionAttachment,
  PassionIdea,
  PassionScheduleDoc,
  ResumeAttachment,
  SettingsRow,
  SystemDesignProblem,
} from './types'

export const DEFAULT_SETTINGS: SettingsRow = {
  id: 'default',
  dailyMin: 25,
  dailyMax: 50,
  // Full calendar day: 12:00 AM → 11:59 PM. The whole day is the quota window.
  windowStart: '00:00',
  windowEnd: '23:59',
  updatedAt: Date.now(),
}

// One-time migration flag for users that have the legacy 09:00-21:00 window
// stored in IndexedDB. Bumping the suffix re-runs the migration for everyone.
const FULL_DAY_MIGRATION_KEY = 'execution.windowMigrated.v2'

export class ExecutionDB extends Dexie {
  applications!: Table<Application, string>
  dsaProblems!: Table<DsaProblem, string>
  systemDesignProblems!: Table<SystemDesignProblem, string>
  behavioralStories!: Table<BehavioralStory, string>
  tasks!: Table<LifeTask, string>
  resumeFiles!: Table<ResumeAttachment, string>
  passionIdeas!: Table<PassionIdea, string>
  passionAttachments!: Table<PassionAttachment, string>
  behavioralAttachments!: Table<BehavioralAttachment, string>
  passionSchedule!: Table<PassionScheduleDoc, string>
  settings!: Table<SettingsRow, string>

  constructor() {
    super('execution-console-v1')

    this.version(1).stores({
      applications: 'id, date, company, status, createdAt',
      dsaProblems: 'id, date, topic, difficulty, createdAt',
      behavioralStories: 'id, category, status, updatedAt',
      tasks: 'id, priority, recurrence, createdAt',
      settings: 'id',
    })

    this.version(2).stores({
      applications: 'id, date, company, status, createdAt',
      dsaProblems: 'id, date, topic, difficulty, createdAt',
      systemDesignProblems: 'id, date, topic, difficulty, createdAt',
      behavioralStories: 'id, category, status, updatedAt',
      tasks: 'id, priority, recurrence, createdAt',
      settings: 'id',
    })

    this.version(3).stores({
      applications:
        'id, date, company, status, resumeFileId, createdAt',
      dsaProblems: 'id, date, topic, difficulty, createdAt',
      systemDesignProblems: 'id, date, topic, difficulty, createdAt',
      behavioralStories: 'id, category, status, updatedAt',
      tasks: 'id, priority, recurrence, createdAt',
      resumeFiles: 'id, fileName, createdAt',
      settings: 'id',
    })

    this.version(4)
      .stores({
        applications:
          'id, date, company, status, resumeFileId, createdAt',
        dsaProblems: 'id, date, topic, difficulty, createdAt',
        systemDesignProblems:
          'id, date, topic, kind, difficulty, createdAt',
        behavioralStories: 'id, category, status, updatedAt',
        tasks: 'id, priority, recurrence, createdAt',
        resumeFiles: 'id, fileName, createdAt',
        settings: 'id',
      })
      .upgrade(async (trans) => {
        // Pre-v4 system-design rows are all high-level designs by convention.
        await trans
          .table('systemDesignProblems')
          .toCollection()
          .modify((p: { kind?: string }) => {
            if (!p.kind) p.kind = 'hld'
          })
      })

    this.version(5).stores({
      applications:
        'id, date, company, status, resumeFileId, createdAt',
      dsaProblems: 'id, date, topic, difficulty, createdAt',
      systemDesignProblems:
        'id, date, topic, kind, difficulty, createdAt',
      behavioralStories: 'id, category, status, updatedAt',
      tasks: 'id, priority, recurrence, createdAt',
      resumeFiles: 'id, fileName, createdAt',
      passionIdeas: 'id, tag, title, updatedAt, createdAt',
      passionAttachments: 'id, fileName, createdAt',
      settings: 'id',
    })

    this.version(6).stores({
      applications:
        'id, date, company, status, resumeFileId, createdAt',
      dsaProblems: 'id, date, topic, difficulty, createdAt',
      systemDesignProblems:
        'id, date, topic, kind, difficulty, createdAt',
      behavioralStories: 'id, category, status, updatedAt',
      tasks: 'id, priority, recurrence, createdAt',
      resumeFiles: 'id, fileName, createdAt',
      passionIdeas: 'id, tag, title, updatedAt, createdAt',
      passionAttachments: 'id, fileName, createdAt',
      passionSchedule: 'id, updatedAt',
      settings: 'id',
    })

    this.version(7)
      .stores({
        applications:
          'id, date, company, status, resumeFileId, createdAt',
        dsaProblems: 'id, date, topic, difficulty, createdAt',
        systemDesignProblems:
          'id, date, topic, kind, difficulty, createdAt',
        behavioralStories: 'id, category, status, updatedAt',
        tasks: 'id, priority, recurrence, dueDate, createdAt',
        resumeFiles: 'id, fileName, createdAt',
        passionIdeas: 'id, tag, title, updatedAt, createdAt',
        passionAttachments: 'id, fileName, createdAt',
        passionSchedule: 'id, updatedAt',
        settings: 'id',
      })
      .upgrade(async (trans) => {
        // Existing tasks predate the due-date/time fields. Default them to
        // null so the UI groups them under "Today" until the user assigns one.
        await trans
          .table('tasks')
          .toCollection()
          .modify(
            (
              t: { dueDate?: string | null; dueTime?: string | null },
            ) => {
              if (t.dueDate === undefined) t.dueDate = null
              if (t.dueTime === undefined) t.dueTime = null
            },
          )
      })

    this.version(8).stores({
      applications:
        'id, date, company, status, resumeFileId, createdAt',
      dsaProblems: 'id, date, topic, difficulty, createdAt',
      systemDesignProblems:
        'id, date, topic, kind, difficulty, createdAt',
      behavioralStories: 'id, category, status, updatedAt',
      tasks: 'id, priority, recurrence, dueDate, createdAt',
      resumeFiles: 'id, fileName, createdAt',
      passionIdeas: 'id, tag, title, updatedAt, createdAt',
      passionAttachments: 'id, fileName, createdAt',
      behavioralAttachments: 'id, fileName, createdAt',
      passionSchedule: 'id, updatedAt',
      settings: 'id',
    })
  }
}

export const db = new ExecutionDB()

export async function ensureDefaults(): Promise<SettingsRow> {
  const existing = await db.settings.get('default')
  if (!existing) {
    await db.settings.put({ ...DEFAULT_SETTINGS, updatedAt: Date.now() })
    return (await db.settings.get('default'))!
  }

  // One-time migration: any pre-existing settings get bumped to the new
  // full-day window so the dashboard math (rate, forecast, recovery) reflects
  // a 12:00 AM → 11:59 PM quota day. We only do this once per browser; users
  // can still customize the window afterwards via Settings.
  try {
    if (
      typeof localStorage !== 'undefined' &&
      !localStorage.getItem(FULL_DAY_MIGRATION_KEY)
    ) {
      const migrated: SettingsRow = {
        ...existing,
        windowStart: '00:00',
        windowEnd: '23:59',
        updatedAt: Date.now(),
      }
      await db.settings.put(migrated)
      localStorage.setItem(FULL_DAY_MIGRATION_KEY, '1')
      return migrated
    }
  } catch {
    // localStorage may be unavailable (private mode, SSR); skip migration.
  }

  return existing
}

export async function ensurePassionScheduleDoc(): Promise<PassionScheduleDoc> {
  const existing = await db.passionSchedule.get('default')
  if (!existing) {
    const empty = createEmptyPassionScheduleDoc()
    await db.passionSchedule.put(empty)
    return empty
  }
  return normalizePassionScheduleDoc(existing)
}
