import { db } from '../db/database'
import type {
  Application,
  BehavioralStory,
  DsaProblem,
  LifeTask,
  PassionIdea,
  SettingsRow,
  SystemDesignProblem,
} from '../db/types'
import { isCloudDataActiveSnapshot } from './active'
import * as repo from './repository'

/** Settings row keyed as `default` locally and derived in Postgres. */
export async function persistSettings(row: SettingsRow): Promise<void> {
  if (isCloudDataActiveSnapshot()) await repo.saveSettingsRow(row)
  else
    await db.settings.put({
      ...row,
      id: 'default',
      updatedAt: Date.now(),
    })
}

export async function addApplication(row: Application): Promise<void> {
  if (isCloudDataActiveSnapshot()) await repo.upsertApplication(row)
  else await db.applications.add(row)
}

export async function patchApplicationFields(
  id: string,
  partial: Partial<Application>,
): Promise<void> {
  if (isCloudDataActiveSnapshot()) await repo.patchApplication(id, partial)
  else await db.applications.update(id, partial)
}

export async function deleteApplicationAndResume(id: string): Promise<void> {
  if (isCloudDataActiveSnapshot()) {
    const row = await repo.fetchApplicationById(id)
    if (row?.resumeFileId)
      await repo.deleteResumeFileRecord(row.resumeFileId)
    await repo.deleteApplication(id)
  } else {
    const row = await db.applications.get(id)
    if (row?.resumeFileId) {
      await db.resumeFiles.delete(row.resumeFileId).catch(() => undefined)
    }
    await db.applications.delete(id)
  }
}

export async function addDsaProblem(row: DsaProblem): Promise<void> {
  if (isCloudDataActiveSnapshot()) await repo.upsertDsaProblem(row)
  else await db.dsaProblems.add(row)
}

export async function patchDsaFields(
  id: string,
  partial: Partial<DsaProblem>,
): Promise<void> {
  if (isCloudDataActiveSnapshot()) await repo.patchDsaProblem(id, partial)
  else await db.dsaProblems.update(id, partial)
}

export async function deleteDsaById(id: string): Promise<void> {
  if (isCloudDataActiveSnapshot()) await repo.deleteDsaProblem(id)
  else await db.dsaProblems.delete(id)
}

export async function addSystemDesign(row: SystemDesignProblem): Promise<void> {
  if (isCloudDataActiveSnapshot())
    await repo.upsertSystemDesignProblem(row)
  else await db.systemDesignProblems.add(row)
}

export async function patchSystemDesignFields(
  id: string,
  partial: Partial<SystemDesignProblem>,
): Promise<void> {
  if (isCloudDataActiveSnapshot())
    await repo.patchSystemDesignProblem(id, partial)
  else await db.systemDesignProblems.update(id, partial)
}

export async function deleteSystemDesignById(id: string): Promise<void> {
  if (isCloudDataActiveSnapshot())
    await repo.deleteSystemDesignProblem(id)
  else await db.systemDesignProblems.delete(id)
}

export async function addBehavioralStory(row: BehavioralStory): Promise<void> {
  if (isCloudDataActiveSnapshot()) await repo.upsertBehavioralStory(row)
  else await db.behavioralStories.add(row)
}

export async function patchBehavioralFields(
  id: string,
  partial: Partial<BehavioralStory>,
): Promise<void> {
  if (isCloudDataActiveSnapshot()) await repo.patchBehavioralStory(id, partial)
  else await db.behavioralStories.update(id, partial)
}

export async function deleteBehavioralById(id: string): Promise<void> {
  if (isCloudDataActiveSnapshot()) await repo.deleteBehavioralStory(id)
  else await db.behavioralStories.delete(id)
}

export async function addTask(row: LifeTask): Promise<void> {
  if (isCloudDataActiveSnapshot()) await repo.upsertTask(row)
  else await db.tasks.add(row)
}

export async function patchTaskFields(
  id: string,
  partial: Partial<LifeTask>,
): Promise<void> {
  if (isCloudDataActiveSnapshot()) await repo.patchTask(id, partial)
  else await db.tasks.update(id, partial)
}

export async function deleteTaskById(id: string): Promise<void> {
  if (isCloudDataActiveSnapshot()) await repo.deleteTask(id)
  else await db.tasks.delete(id)
}

export async function addPassionIdeaRow(row: PassionIdea): Promise<void> {
  if (isCloudDataActiveSnapshot()) await repo.upsertPassionIdea(row)
  else await db.passionIdeas.add(row)
}

export async function patchPassionIdeaRow(
  id: string,
  partial: Partial<PassionIdea>,
): Promise<void> {
  if (isCloudDataActiveSnapshot()) await repo.patchPassionIdea(id, partial)
  else await db.passionIdeas.update(id, { ...partial, updatedAt: Date.now() })
}

export async function fetchPassionIdeaRow(
  id: string,
): Promise<PassionIdea | undefined> {
  if (isCloudDataActiveSnapshot()) return repo.fetchPassionIdeaById(id)
  return db.passionIdeas.get(id)
}

export async function deletePassionIdeaCascade(id: string): Promise<void> {
  const idea = await fetchPassionIdeaRow(id)
  if (!idea) return
  const { deletePassionFile } = await import('../lib/passion')
  for (const aid of idea.attachmentIds) await deletePassionFile(aid)
  if (isCloudDataActiveSnapshot()) await repo.deletePassionIdea(id)
  else await db.passionIdeas.delete(id)
}

export async function creditPassionThinkSession(
  ideaId: string,
  minutes: number,
): Promise<void> {
  if (isCloudDataActiveSnapshot()) {
    const row = await repo.fetchPassionIdeaById(ideaId)
    if (!row) return
    await repo.patchPassionIdea(ideaId, {
      sessionsCompleted: row.sessionsCompleted + 1,
      thinkMinutesTotal: row.thinkMinutesTotal + minutes,
    })
  } else {
    await db.passionIdeas
      .get(ideaId)
      .then((r) => {
        if (!r) return
        return db.passionIdeas.update(ideaId, {
          sessionsCompleted: r.sessionsCompleted + 1,
          thinkMinutesTotal: r.thinkMinutesTotal + minutes,
          updatedAt: Date.now(),
        })
      })
      .catch(() => undefined)
  }
}

export async function resetAllDataEverywhere(): Promise<void> {
  const { DEFAULT_SETTINGS } = await import('../db/database')
  if (isCloudDataActiveSnapshot()) {
    await repo.deleteAllUserCloudData()
    await repo.saveSettingsRow({ ...DEFAULT_SETTINGS, id: 'default' })
  } else {
    const { resetAllData } = await import('../db/backup')
    await resetAllData()
  }
}
