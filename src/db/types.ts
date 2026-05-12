export const SCHEMA_VERSION = 4 as const

export type ApplicationSource =
  | 'LinkedIn'
  | 'Company'
  | 'Referral'
  | 'Handshake'
  | 'Otta'
  | 'Wellfound'
  | 'Other'

export type ApplicationStatus =
  | 'Applied'
  | 'OA'
  | 'Phone'
  | 'Onsite'
  | 'Offer'
  | 'Accepted'
  | 'Rejected'
  | 'Ghosted'

export type TaskPriority = 'low' | 'mid' | 'high'

export type TaskRecurrence = 'oneoff' | 'daily' | 'weekly' | 'monthly'

export interface Application {
  id: string
  date: string
  company: string
  role: string
  source: ApplicationSource
  resumeVersion: string
  /** Optional id into resumeFiles table for an attached PDF / DOC. */
  resumeFileId?: string | null
  status: ApplicationStatus
  priority: TaskPriority
  createdAt: number
}

export interface ResumeAttachment {
  id: string
  fileName: string
  fileType: string
  fileSize: number
  data: Blob
  createdAt: number
}

/** Backup-only serialized form of ResumeAttachment (Blob → base64). */
export interface SerializedResumeAttachment {
  id: string
  fileName: string
  fileType: string
  fileSize: number
  base64: string
  createdAt: number
}

export type DsaDifficulty = 'easy' | 'medium' | 'hard'

export type DsaTopic =
  | 'Arrays'
  | 'Strings'
  | 'Two Pointers'
  | 'Sliding Window'
  | 'Binary Search'
  | 'Trees'
  | 'Graphs'
  | 'DP'
  | 'Greedy'
  | 'Backtracking'
  | 'Heaps'
  | 'Tries'
  | 'Stack/Queue'
  | 'Linked Lists'
  | 'Bit Manipulation'
  | 'Math'
  | 'Design'

export interface DsaProblem {
  id: string
  date: string
  title: string
  topic: DsaTopic
  difficulty: DsaDifficulty
  confidence: 1 | 2 | 3 | 4 | 5
  minutes: number
  createdAt: number
}

export type SystemDesignKind = 'hld' | 'lld'

export type SystemDesignHLDTopic =
  | 'Feeds'
  | 'Chat'
  | 'Search'
  | 'Rate Limiting'
  | 'Cache'
  | 'Storage'
  | 'Geo'
  | 'Streaming'
  | 'Notifications'
  | 'Recommender'
  | 'ML Serving'
  | 'Realtime'
  | 'Payments'
  | 'Auth'
  | 'Analytics'
  | 'Other'

export type SystemDesignLLDTopic =
  | 'Parking Lot'
  | 'Elevator'
  | 'ATM'
  | 'BookMyShow'
  | 'Splitwise'
  | 'Vending Machine'
  | 'Tic Tac Toe'
  | 'Chess'
  | 'Snake & Ladder'
  | 'LRU Cache'
  | 'Logger'
  | 'File System'
  | 'Library'
  | 'Hotel Booking'
  | 'Online Code Editor'
  | 'Ride Sharing'
  | 'Other'

export type SystemDesignTopic = SystemDesignHLDTopic | SystemDesignLLDTopic

export type SystemDesignDifficulty = 'easy' | 'medium' | 'hard'

export interface SystemDesignProblem {
  id: string
  date: string
  title: string
  /** High-level (distributed system) vs low-level (OOP / class design) */
  kind: SystemDesignKind
  topic: SystemDesignTopic
  difficulty: SystemDesignDifficulty
  confidence: 1 | 2 | 3 | 4 | 5
  minutes: number
  notes: string
  createdAt: number
}

export type BehavioralCategory =
  | 'Leadership'
  | 'Conflict'
  | 'Failure'
  | 'Teamwork'
  | 'Ownership'
  | 'Ambiguity'
  | 'Deadlines'
  | 'Learning'
  | 'Influence'

export type BehavioralStatus = 'draft' | 'refined' | 'memorized'

export interface BehavioralStory {
  id: string
  title: string
  category: BehavioralCategory
  status: BehavioralStatus
  confidence: 1 | 2 | 3 | 4 | 5
  situation: string
  task: string
  action: string
  result: string
  updatedAt: number
}

export interface LifeTask {
  id: string
  title: string
  priority: TaskPriority
  recurrence: TaskRecurrence
  /** YYYY-MM-DD when task was marked done for current recurrence period */
  lastCompletedAt: string | null
  createdAt: number
}

export interface SettingsRow {
  id: 'default'
  dailyMin: number
  dailyMax: number
  /** HH:mm 24h */
  windowStart: string
  windowEnd: string
  updatedAt: number
}

export interface BackupPayload {
  schemaVersion: typeof SCHEMA_VERSION
  exportedAt: string
  settings: SettingsRow
  applications: Application[]
  dsaProblems: DsaProblem[]
  systemDesignProblems: SystemDesignProblem[]
  behavioralStories: BehavioralStory[]
  tasks: LifeTask[]
  resumeFiles?: SerializedResumeAttachment[]
}
