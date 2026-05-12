import Dexie, { type Table } from 'dexie'
import type {
  Application,
  BehavioralStory,
  DsaProblem,
  LifeTask,
  ResumeAttachment,
  SettingsRow,
  SystemDesignProblem,
} from './types'

export const DEFAULT_SETTINGS: SettingsRow = {
  id: 'default',
  dailyMin: 30,
  dailyMax: 50,
  windowStart: '09:00',
  windowEnd: '21:00',
  updatedAt: Date.now(),
}

export class ExecutionDB extends Dexie {
  applications!: Table<Application, string>
  dsaProblems!: Table<DsaProblem, string>
  systemDesignProblems!: Table<SystemDesignProblem, string>
  behavioralStories!: Table<BehavioralStory, string>
  tasks!: Table<LifeTask, string>
  resumeFiles!: Table<ResumeAttachment, string>
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
  }
}

export const db = new ExecutionDB()

export async function ensureDefaults(): Promise<SettingsRow> {
  const existing = await db.settings.get('default')
  if (existing) return existing
  await db.settings.put({ ...DEFAULT_SETTINGS, updatedAt: Date.now() })
  return (await db.settings.get('default'))!
}
