import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { db, ensureDefaults, ensurePassionScheduleDoc } from '../db/database'
import type {
  Application,
  BehavioralAttachment,
  BehavioralStory,
  DsaProblem,
  LifeTask,
  PassionAttachment,
  PassionIdea,
  PassionScheduleDoc,
  ResumeAttachment,
  SettingsRow,
  SystemDesignProblem,
} from '../db/types'
import { useCloudDataMode } from './active'
import {
  fetchApplications,
  fetchBehavioralAttachmentsMeta,
  fetchBehavioralStories,
  fetchDsaProblems,
  fetchPassionAttachmentsMeta,
  fetchPassionIdeas,
  fetchPassionSchedule,
  fetchResumeFilesMeta,
  fetchSettingsRow,
  fetchSystemDesignProblems,
  fetchTasks,
} from './repository'
import { useCloudSyncTick } from './syncBus'
import { createEmptyPassionScheduleDoc } from '../lib/passionScheduleDoc'

const EMPTY_APPS: Application[] = []
const EMPTY_DSA: DsaProblem[] = []
const EMPTY_SD: SystemDesignProblem[] = []
const EMPTY_STORIES: BehavioralStory[] = []
const EMPTY_TASKS: LifeTask[] = []
const EMPTY_RESUMES: ResumeAttachment[] = []
const EMPTY_IDEAS: PassionIdea[] = []
const EMPTY_PASSION_ATTACH: PassionAttachment[] = []
const EMPTY_BEHAVIORAL_ATTACH: BehavioralAttachment[] = []

/** Settings for dashboard / applications — Postgres when authenticated with Supabase. */
export function useSettingsRowHybrid(): SettingsRow | undefined {
  const cloud = useCloudDataMode()
  const bump = useCloudSyncTick()
  const localRow = useLiveQuery(() => ensureDefaults(), [])
  const [remote, setRemote] = useState<SettingsRow | undefined>()

  useEffect(() => {
    if (!cloud) {
      setRemote(undefined)
      return
    }
    let cancelled = false
    void fetchSettingsRow()
      .then((s) => {
        if (!cancelled) setRemote(s)
      })
      .catch(() => {
        if (!cancelled) setRemote(undefined)
      })
    return () => {
      cancelled = true
    }
  }, [cloud, bump])

  return cloud ? remote : localRow ?? undefined
}

/** `byCreated` mirrors the Applications table · `unordered` matches Dexie `toArray()` (insights, Today page). */
export function useApplicationsHybrid(
  order: 'byCreated' | 'unordered' = 'unordered',
): Application[] {
  const cloud = useCloudDataMode()
  const bump = useCloudSyncTick()
  const local = useLiveQuery(
    () =>
      order === 'byCreated'
        ? db.applications.orderBy('createdAt').reverse().toArray()
        : db.applications.toArray(),
    [order],
  )
  const [remote, setRemote] = useState<Application[]>([])
  useEffect(() => {
    if (!cloud) {
      setRemote([])
      return
    }
    let cancelled = false
    void fetchApplications().then((rows) => {
      if (!cancelled) setRemote(rows)
    })
    return () => {
      cancelled = true
    }
  }, [cloud, bump])
  return cloud ? remote : local ?? EMPTY_APPS
}

function resumePlaceholderFromMeta(
  row: Omit<ResumeAttachment, 'data'>,
): ResumeAttachment {
  return {
    ...row,
    data: new Blob([], { type: row.fileType }),
  }
}

export function useResumeFilesHybrid(): ResumeAttachment[] {
  const cloud = useCloudDataMode()
  const bump = useCloudSyncTick()
  const local = useLiveQuery(() => db.resumeFiles.toArray(), [])
  const [remote, setRemote] = useState<ResumeAttachment[]>([])
  useEffect(() => {
    if (!cloud) {
      setRemote([])
      return
    }
    let cancelled = false
    void fetchResumeFilesMeta().then((rows) => {
      if (!cancelled) setRemote(rows.map(resumePlaceholderFromMeta))
    })
    return () => {
      cancelled = true
    }
  }, [cloud, bump])
  return cloud ? remote : local ?? EMPTY_RESUMES
}

export function useDsaProblemsHybrid(): DsaProblem[] {
  const cloud = useCloudDataMode()
  const bump = useCloudSyncTick()
  const local = useLiveQuery(() => db.dsaProblems.toArray(), [])
  const [remote, setRemote] = useState<DsaProblem[]>([])
  useEffect(() => {
    if (!cloud) {
      setRemote([])
      return
    }
    let cancelled = false
    void fetchDsaProblems().then((rows) => {
      if (!cancelled) setRemote(rows)
    })
    return () => {
      cancelled = true
    }
  }, [cloud, bump])
  return cloud ? remote : local ?? EMPTY_DSA
}

export function useSystemDesignHybrid(): SystemDesignProblem[] {
  const cloud = useCloudDataMode()
  const bump = useCloudSyncTick()
  const local = useLiveQuery(() => db.systemDesignProblems.toArray(), [])
  const [remote, setRemote] = useState<SystemDesignProblem[]>([])
  useEffect(() => {
    if (!cloud) {
      setRemote([])
      return
    }
    let cancelled = false
    void fetchSystemDesignProblems().then((rows) => {
      if (!cancelled) setRemote(rows)
    })
    return () => {
      cancelled = true
    }
  }, [cloud, bump])
  return cloud ? remote : local ?? EMPTY_SD
}

export function useBehavioralStoriesHybrid(): BehavioralStory[] {
  const cloud = useCloudDataMode()
  const bump = useCloudSyncTick()
  const local = useLiveQuery(() => db.behavioralStories.toArray(), [])
  const [remote, setRemote] = useState<BehavioralStory[]>([])
  useEffect(() => {
    if (!cloud) {
      setRemote([])
      return
    }
    let cancelled = false
    void fetchBehavioralStories().then((rows) => {
      if (!cancelled) setRemote(rows)
    })
    return () => {
      cancelled = true
    }
  }, [cloud, bump])
  return cloud ? remote : local ?? EMPTY_STORIES
}

export function useTasksHybrid(): LifeTask[] {
  const cloud = useCloudDataMode()
  const bump = useCloudSyncTick()
  const local = useLiveQuery(() => db.tasks.toArray(), [])
  const [remote, setRemote] = useState<LifeTask[]>([])
  useEffect(() => {
    if (!cloud) {
      setRemote([])
      return
    }
    let cancelled = false
    void fetchTasks().then((rows) => {
      if (!cancelled) setRemote(rows)
    })
    return () => {
      cancelled = true
    }
  }, [cloud, bump])
  return cloud ? remote : local ?? EMPTY_TASKS
}

export function usePassionIdeasHybrid(): PassionIdea[] {
  const cloud = useCloudDataMode()
  const bump = useCloudSyncTick()
  const local = useLiveQuery(
    () => db.passionIdeas.orderBy('updatedAt').reverse().toArray(),
    [],
  )
  const [remote, setRemote] = useState<PassionIdea[]>([])
  useEffect(() => {
    if (!cloud) {
      setRemote([])
      return
    }
    let cancelled = false
    void fetchPassionIdeas().then((rows) => {
      if (!cancelled) setRemote(rows)
    })
    return () => {
      cancelled = true
    }
  }, [cloud, bump])
  return cloud ? remote : local ?? EMPTY_IDEAS
}

export function usePassionAttachmentsHybrid(): PassionAttachment[] {
  const cloud = useCloudDataMode()
  const bump = useCloudSyncTick()
  const local = useLiveQuery(() => db.passionAttachments.toArray(), [])
  const [remote, setRemote] = useState<PassionAttachment[]>([])
  useEffect(() => {
    if (!cloud) {
      setRemote([])
      return
    }
    let cancelled = false
    void fetchPassionAttachmentsMeta().then((rows) => {
      if (!cancelled) setRemote(rows)
    })
    return () => {
      cancelled = true
    }
  }, [cloud, bump])
  return cloud ? remote : local ?? EMPTY_PASSION_ATTACH
}

export function useBehavioralAttachmentsHybrid(): BehavioralAttachment[] {
  const cloud = useCloudDataMode()
  const bump = useCloudSyncTick()
  const local = useLiveQuery(() => db.behavioralAttachments.toArray(), [])
  const [remote, setRemote] = useState<BehavioralAttachment[]>([])
  useEffect(() => {
    if (!cloud) {
      setRemote([])
      return
    }
    let cancelled = false
    void fetchBehavioralAttachmentsMeta().then((rows) => {
      if (!cancelled) setRemote(rows)
    }).catch(() => {
      if (!cancelled) setRemote([])
    })
    return () => {
      cancelled = true
    }
  }, [cloud, bump])
  return cloud ? remote : local ?? EMPTY_BEHAVIORAL_ATTACH
}

/** Editable Passion timetables · Postgres row per user (RLS); local Dexie when offline. */
export function usePassionScheduleHybrid(): PassionScheduleDoc | undefined {
  const cloud = useCloudDataMode()
  const bump = useCloudSyncTick()
  const local = useLiveQuery(
    () =>
      ensurePassionScheduleDoc().catch(() => createEmptyPassionScheduleDoc()),
    [],
  )
  const [remote, setRemote] = useState<PassionScheduleDoc | undefined>()
  useEffect(() => {
    if (!cloud) {
      setRemote(undefined)
      return
    }
    let cancelled = false
    void fetchPassionSchedule()
      .then((doc) => {
        if (!cancelled) setRemote(doc)
      })
      .catch(() => {
        // Missing migration, network, or RLS — still show an empty editable grid
        if (!cancelled) setRemote(createEmptyPassionScheduleDoc())
      })
    return () => {
      cancelled = true
    }
  }, [cloud, bump])
  return cloud ? remote : local ?? undefined
}
