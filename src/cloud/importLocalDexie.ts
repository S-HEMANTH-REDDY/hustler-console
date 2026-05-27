import { db, ensureDefaults } from '../db/database'
import * as repo from './repository'

/**
 * One-way copy of the current browser IndexedDB snapshot into the signed-in
 * user's Supabase project. Used from the first-login import prompt.
 */
export async function importLocalDexieIntoSupabase(): Promise<void> {
  const settings = await ensureDefaults()
  await repo.saveSettingsRow(settings)
  // Pre-index applications so each resume upload can carry company/date in
  // its Supabase storage object name.
  const apps = await db.applications.toArray()
  const resumeMeta = new Map<string, { company: string; date: string }>()
  for (const a of apps) {
    if (a.resumeFileId)
      resumeMeta.set(a.resumeFileId, { company: a.company, date: a.date })
  }
  for (const r of await db.resumeFiles.toArray()) {
    await repo.uploadResumeFile(
      r.id,
      new File([r.data], r.fileName, { type: r.fileType }),
      resumeMeta.get(r.id),
    )
  }
  for (const r of await db.passionAttachments.toArray()) {
    await repo.uploadPassionAttachment(
      r.id,
      new File([r.data], r.fileName, { type: r.fileType }),
    )
  }
  for (const a of apps) await repo.upsertApplication(a)
  for (const p of await db.dsaProblems.toArray()) await repo.upsertDsaProblem(p)
  for (const p of await db.systemDesignProblems.toArray())
    await repo.upsertSystemDesignProblem(p)
  for (const s of await db.behavioralStories.toArray())
    await repo.upsertBehavioralStory(s)
  for (const t of await db.tasks.toArray()) await repo.upsertTask(t)
  for (const idea of await db.passionIdeas.toArray())
    await repo.upsertPassionIdea(idea)
}
